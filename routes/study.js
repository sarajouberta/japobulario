/* Para gestionar modos de estudio */

var express = require('express');
var router = express.Router();
const Flashcard = require('../models/Flashcard');

//filtro común: vocabulario con significado. Las fichas sin ejemplo sí se estudian (la tarjeta no muestra ejemplo);
//solo se quedan fuera las del libro que no tienen significado (missing incluye 'meaning_en'):
const STUDY_VOCABULARY = { type: 'vocabulary', missing: { $ne: 'meaning_en' } };
const LEVELS = ['N5', 'N4'];

//origen de las tarjetas: las de los libros (importadas) y las propias (creadas con el formulario).
//Las propias se buscan como "no son del libro" para incluir también las antiguas sin campo source:
const SOURCES = {
    libros: { source: 'book' },
    mias: { source: { $ne: 'book' } },
};

//pantalla para elegir qué estudiar, con dos pestañas:
// - libros (por defecto): nivel, capítulo y sección del libro
// - mias: tarjetas propias por nivel y categoría
router.get('/', async (req, res) => {
    try {
        const tab = req.query.tab === 'mias' ? 'mias' : 'libros';

        //nº de tarjetas por sección del libro:
        const sections = await Flashcard.aggregate([
            { $match: { ...STUDY_VOCABULARY, ...SOURCES.libros } },
            { $group: {
                _id: { level: '$level', chapter: '$chapter', section: '$section' },
                chapterTitle: { $first: '$chapterTitle' },
                sectionTitle: { $first: '$sectionTitle' },
                category: { $first: '$category' },
                count: { $sum: 1 },
            } },
            { $sort: { '_id.chapter': 1, '_id.section': 1 } },
        ]);
        //nº total de tarjetas del libro por nivel:
        const totals = await Flashcard.aggregate([
            { $match: { ...STUDY_VOCABULARY, ...SOURCES.libros } },
            { $group: { _id: '$level', count: { $sum: 1 } } },
        ]);
        //tarjetas propias por nivel y categoría (la categoría es la que se escribe en el formulario):
        const ownCategories = await Flashcard.aggregate([
            { $match: { ...STUDY_VOCABULARY, ...SOURCES.mias } },
            { $group: { _id: { level: '$level', category: '$category' }, count: { $sum: 1 } } },
            { $sort: { '_id.category': 1 } },
        ]);

        //se agrupa en niveles -> capítulos -> secciones para que la vista solo tenga que recorrerlo:
        const levels = LEVELS.map(level => {
            const chapters = [];
            for (const s of sections.filter(s => s._id.level === level)) {
                let chapter = chapters.find(c => c.chapter === s._id.chapter);
                if (!chapter) {
                    chapter = { chapter: s._id.chapter, chapterTitle: s.chapterTitle, sections: [] };
                    chapters.push(chapter);
                }
                chapter.sections.push({
                    section: s._id.section,
                    sectionTitle: s.sectionTitle,
                    category: s.category,
                    count: s.count,
                });
            }
            const total = totals.find(t => t._id === level);
            return { level, total: total ? total.count : 0, chapters };
        });

        //lo mismo para las propias: niveles -> categorías (sin categoría se muestra como tal)
        const ownLevels = LEVELS.map(level => {
            const categories = ownCategories
                .filter(c => c._id.level === level)
                .map(c => ({ category: c._id.category || '', count: c.count }));
            return { level, total: categories.reduce((sum, c) => sum + c.count, 0), categories };
        });

        const bookTotal = levels.reduce((sum, l) => sum + l.total, 0);
        const ownTotal = ownLevels.reduce((sum, l) => sum + l.total, 0);

        res.render('study/index.twig', { tab, levels, ownLevels, bookTotal, ownTotal });
    } catch (error) {
        console.error('Error en /study:', error);
        res.status(500).send('Error al cargar las opciones de estudio');
    }
});

// Ruta para estudiar kanji
router.get('/kanji', async (req, res) => {
    try {
        const flashcardsDocs = await Flashcard.find({ type: 'kanji' });  //Flashcard.find() <- métod de Mongoose
        //LO MISMO QUE PARA RESOLVER PROBLEMAS AL RENDERIZAR CONTENIDO DE FLASHCARD EN CLIENTE de vocabulario:
        const flashcards = flashcardsDocs.map(doc => doc.toObject());

        //res.render('flashcards.twig', { flashcards, mode: 'kanji' });
        console.log('Primer flashcard:', flashcards[0]);
        console.log('Flashcards recibidas:', flashcards);
        res.render('study/study-kanji.twig', { flashcards, mode: 'kanji'});

    } catch (error) {
        console.error('Error en /study/kanji:', error);
        res.status(500).send('Error al cargar los kanjis');
    }
});

// Ruta para estudiar vocabulario
/*
NOTA: SOBRE POR QUÉ NO SE MOSTRABA EL CONTENIDO DE CADA FLASHCARD AUNQUE SÍ LLEGABAN CORRECTAMENTE AL FRONT
El problema principal radicaba en que los documentos que traías directamente de MongoDB (con Mongoose)
no son objetos JSON "puros" sino instancias de documentos Mongoose, que incluyen propiedades internas y métodos,
no directamente serializables ni accesibles como un JSON normal en el frontend.

Cuando intentaba pasar esos objetos a la plantilla Twig y luego convertirlos en JavaScript con json_encode,
el resultado no era el esperado porque la estructura interna compleja impedía acceder de forma limpia a las propiedades que
quería mostrar.

La clave estuvo en transformar esos documentos a objetos JavaScript simples, usando:
    const flashcards = flashcardsDocs.map(doc => doc.toObject());
 */
router.get('/vocabulario', async (req, res) => {
    try {
        //filtros opcionales desde la pantalla de elección:
        //  libros: ?source=libros&level=N4&chapter=2&section=1
        //  propias: ?source=mias&level=N5&category=verbos
        const filter = { ...STUDY_VOCABULARY };
        const source = ['libros', 'mias'].includes(req.query.source) ? req.query.source : null;
        if (source) Object.assign(filter, SOURCES[source]);

        const chapter = parseInt(req.query.chapter, 10);
        const section = parseInt(req.query.section, 10);
        if (LEVELS.includes(req.query.level)) {
            filter.level = req.query.level;
            if (Number.isInteger(chapter)) {
                filter.chapter = chapter;
                if (Number.isInteger(section)) filter.section = section;
            }
        }
        //categoría de las propias (vacía = tarjetas sin categoría):
        const category = source === 'mias' && typeof req.query.category === 'string' ? req.query.category : null;
        if (category !== null) filter.category = category === '' ? { $in: [null, ''] } : category;

        //orden del libro (primero N5, después N4, y por número de palabra); las propias, por fecha de creación:
        const flashcardsDocs = await Flashcard.find(filter).sort({ level: -1, bookId: 1, createdAt: 1 });

        //convertir cada documento Mongoose a objeto JS plano para no complicar twig:
        const flashcards = flashcardsDocs.map(doc => doc.toObject());

        //texto de lo que se está estudiando, p. ej. "Libros · N4 · 勉強と仕事 · 学校 (School)":
        const parts = [];
        if (source) parts.push(source === 'mias' ? 'Mis tarjetas' : 'Libros');
        if (filter.level) {
            const first = flashcards[0];
            parts.push(filter.level);
            if (first && filter.chapter) parts.push(first.chapterTitle);
            if (first && filter.section) parts.push(`${first.sectionTitle} (${first.category})`);
        }
        if (category !== null) parts.push(category || 'Sin categoría');
        const selection = parts.length ? parts.join(' · ') : 'Todo el vocabulario';

        //el enlace de volver lleva a la pestaña de la que se viene:
        const backUrl = source === 'mias' ? '/japobulario/study?tab=mias' : '/japobulario/study';

        res.render('study/study-vocabulary.twig', { flashcards, mode: 'vocabulario', selection, backUrl });
    } catch (error) {
        console.error('Error cargando flashcards:', error); //añado log para consola
        res.status(500).send('Error al cargar el vocabulario');
    }
});


module.exports = router;
