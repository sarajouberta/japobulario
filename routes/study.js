/* Para gestionar modos de estudio */

var express = require('express');
var router = express.Router();
const Flashcard = require('../models/Flashcard');

//filtro común: solo vocabulario completo (las incompletas del libro no tienen significado o ejemplo)
const COMPLETE_VOCABULARY = { type: 'vocabulary', complete: { $ne: false } };
const LEVELS = ['N5', 'N4'];

//pantalla para elegir qué estudiar: nivel, capítulo y sección del libro
router.get('/', async (req, res) => {
    try {
        //nº de tarjetas por sección del libro:
        const sections = await Flashcard.aggregate([
            { $match: { ...COMPLETE_VOCABULARY, source: 'book' } },
            { $group: {
                _id: { level: '$level', chapter: '$chapter', section: '$section' },
                chapterTitle: { $first: '$chapterTitle' },
                sectionTitle: { $first: '$sectionTitle' },
                category: { $first: '$category' },
                count: { $sum: 1 },
            } },
            { $sort: { '_id.chapter': 1, '_id.section': 1 } },
        ]);
        //nº total por nivel (incluye las fichas hechas a mano):
        const totals = await Flashcard.aggregate([
            { $match: COMPLETE_VOCABULARY },
            { $group: { _id: '$level', count: { $sum: 1 } } },
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

        res.render('study/index.twig', { levels });
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
no son objetos JSON “puros” sino instancias de documentos Mongoose, que incluyen propiedades internas y métodos,
no directamente serializables ni accesibles como un JSON normal en el frontend.

Cuando intentaba pasar esos objetos a la plantilla Twig y luego convertirlos en JavaScript con json_encode,
el resultado no era el esperado porque la estructura interna compleja impedía acceder de forma limpia a las propiedades que
quería mostrar.

La clave estuvo en transformar esos documentos a objetos JavaScript simples, usando:
    const flashcards = flashcardsDocs.map(doc => doc.toObject());
 */
router.get('/vocabulario', async (req, res) => {
    try {
        //filtros opcionales desde la pantalla de elección: ?level=N4&chapter=2&section=1
        const filter = { ...COMPLETE_VOCABULARY };
        const chapter = parseInt(req.query.chapter, 10);
        const section = parseInt(req.query.section, 10);
        if (LEVELS.includes(req.query.level)) {
            filter.level = req.query.level;
            if (Number.isInteger(chapter)) {
                filter.chapter = chapter;
                if (Number.isInteger(section)) filter.section = section;
            }
        }

        //orden del libro: primero N5, después N4, y por número de palabra:
        const flashcardsDocs = await Flashcard.find(filter).sort({ level: -1, bookId: 1 });

        //convertir cada documento Mongoose a objeto JS plano para no complicar twig:
        const flashcards = flashcardsDocs.map(doc => doc.toObject());

        //texto de lo que se está estudiando, p. ej. "N4 · 勉強と仕事 · 学校 (School)":
        let selection = 'Todo el vocabulario';
        if (filter.level) {
            const first = flashcards[0];
            selection = filter.level;
            if (first && filter.chapter) selection += ` · ${first.chapterTitle}`;
            if (first && filter.section) selection += ` · ${first.sectionTitle} (${first.category})`;
        }

        res.render('study/study-vocabulary.twig', { flashcards, mode: 'vocabulario', selection });
    } catch (error) {
        console.error('Error cargando flashcards:', error); //añado log para consola
        res.status(500).send('Error al cargar el vocabulario');
    }
});


module.exports = router;
