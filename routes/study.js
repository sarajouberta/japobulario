/* Para gestionar modos de estudio */

var express = require('express');
var router = express.Router();
const Flashcard = require('../models/Flashcard');
//qué tarjetas puede ver cada usuario (libros: todos; propias: solo su dueño):
const { BOOK_FILTER, ownFilter, visibleFilter } = require('../lib/visibility');
//tarjetas aprendidas de cada usuario (la marca es por usuario, no va en la tarjeta):
const mongoose = require('mongoose');
const Learned = require('../models/Learned');
const { LEARNED_VALUES, learnedIds, learnedFilter } = require('../lib/learned');

//filtro común: vocabulario con significado. Las fichas sin ejemplo sí se estudian (la tarjeta no muestra ejemplo);
//solo se quedan fuera las del libro que no tienen significado (missing incluye 'meaning_en'):
const STUDY_VOCABULARY = { type: 'vocabulary', missing: { $ne: 'meaning_en' } };
const LEVELS = ['N5', 'N4'];

//origen de las tarjetas: las de los libros (importadas, comunes a todos) o las propias del usuario
//de la sesión (creadas con el formulario). Sin origen: todo lo que puede ver el usuario.
function sourceFilter(req, source) {
    if (source === 'book') return BOOK_FILTER;
    if (source === 'own') return ownFilter(req);
    return visibleFilter(req);
}

//valor de ?learned= (yes | no), o null si no viene o no es válido (= todas):
function learnedParam(req) {
    return LEARNED_VALUES.includes(req.query.learned) ? req.query.learned : null;
}

//filtro de aprendidas para el modo estudio, y marca learned en cada tarjeta para el botón:
async function withLearned(req, filter, query) {
    const ids = await learnedIds(req);
    Object.assign(filter, learnedFilter(ids, learnedParam(req)));
    const flashcards = (await query(filter)).map(doc => doc.toObject());
    const learnedSet = new Set(ids.map(id => id.toString()));
    flashcards.forEach(card => {
        //el _id como texto: json_encode de twig escribe el ObjectId como un objeto con sus bytes, y el
        //botón lo necesita para la dirección del POST
        card._id = card._id.toString();
        card.learned = learnedSet.has(card._id);
    });
    return flashcards;
}

//texto del filtro de aprendidas para la línea de lo que se está estudiando (null si son todas):
function learnedLabel(req) {
    const learned = learnedParam(req);
    if (learned === 'yes') return req.__('study.onlyLearned');
    if (learned === 'no') return req.__('study.onlyNotLearned');
    return null;
}

//pantalla para elegir qué estudiar, con dos pestañas:
// - book (por defecto): nivel, capítulo y sección del libro
// - own: tarjetas propias por nivel y categoría
//En las dos sale cuántas tiene aprendidas el usuario, y ?learned=yes|no elige qué tarjetas se abren
//al pulsar un enlace (solo aprendidas o solo sin aprender; sin él, todas).
router.get('/', async (req, res) => {
    try {
        const tab = req.query.tab === 'own' ? 'own' : 'book';
        const learned = learnedParam(req);

        //cuenta como 1 si la tarjeta está entre las aprendidas del usuario:
        const ids = await learnedIds(req);
        const learnedCount = { $sum: { $cond: [{ $in: ['$_id', ids] }, 1, 0] } };

        //nº de tarjetas por sección del libro:
        const sections = await Flashcard.aggregate([
            { $match: { ...STUDY_VOCABULARY, ...sourceFilter(req, 'book') } },
            { $group: {
                _id: { level: '$level', chapter: '$chapter', section: '$section' },
                chapterTitle: { $first: '$chapterTitle' },
                chapterTitleEn: { $first: '$chapterTitleEn' },
                sectionTitle: { $first: '$sectionTitle' },
                category: { $first: '$category' },
                count: { $sum: 1 },
                learned: learnedCount,
            } },
            { $sort: { '_id.chapter': 1, '_id.section': 1 } },
        ]);
        //nº total de tarjetas del libro por nivel:
        const totals = await Flashcard.aggregate([
            { $match: { ...STUDY_VOCABULARY, ...sourceFilter(req, 'book') } },
            { $group: { _id: '$level', count: { $sum: 1 }, learned: learnedCount } },
        ]);
        //tarjetas propias por nivel y categoría (la categoría es la que se escribe en el formulario):
        const ownCategories = await Flashcard.aggregate([
            { $match: { ...STUDY_VOCABULARY, ...sourceFilter(req, 'own') } },
            { $group: { _id: { level: '$level', category: '$category' }, count: { $sum: 1 }, learned: learnedCount } },
            { $sort: { '_id.category': 1 } },
        ]);

        //cuántas tarjetas de un grupo (sección, nivel, categoría) se abrirían con el filtro de aprendidas.
        //Con filtro, el índice solo enseña los grupos que tienen alguna:
        const matching = g => learned === 'yes' ? g.learned : learned === 'no' ? g.count - g.learned : g.count;

        //se agrupa en niveles -> capítulos -> secciones para que la vista solo tenga que recorrerlo:
        const levels = LEVELS.map(level => {
            const chapters = [];
            for (const s of sections.filter(s => s._id.level === level && matching(s) > 0)) {
                let chapter = chapters.find(c => c.chapter === s._id.chapter);
                if (!chapter) {
                    chapter = { chapter: s._id.chapter, chapterTitle: s.chapterTitle, chapterTitleEn: s.chapterTitleEn, sections: [] };
                    chapters.push(chapter);
                }
                chapter.sections.push({
                    section: s._id.section,
                    sectionTitle: s.sectionTitle,
                    category: s.category,
                    count: s.count,
                    learned: s.learned,
                });
            }
            const total = totals.find(t => t._id === level) || { count: 0, learned: 0 };
            return { level, total: total.count, learned: total.learned, matching: matching(total), chapters };
        });

        //lo mismo para las propias: niveles -> categorías (sin categoría se muestra como tal)
        const ownLevels = LEVELS.map(level => {
            const categories = ownCategories
                .filter(c => c._id.level === level)
                .map(c => ({ category: c._id.category || '', count: c.count, learned: c.learned }));
            const total = {
                count: categories.reduce((sum, c) => sum + c.count, 0),
                learned: categories.reduce((sum, c) => sum + c.learned, 0),
            };
            return {
                level,
                total: total.count,
                learned: total.learned,
                matching: matching(total),
                categories: categories.filter(c => matching(c) > 0),
            };
        });

        const bookTotal = levels.reduce((sum, l) => sum + l.total, 0);
        const ownTotal = ownLevels.reduce((sum, l) => sum + l.total, 0);

        //se añade a los enlaces del modo estudio (vacío si son todas):
        const learnedQuery = learned ? `&learned=${learned}` : '';

        res.render('study/index.twig', { tab, levels, ownLevels, bookTotal, ownTotal, learned, learnedQuery });
    } catch (error) {
        console.error('Error en /study:', error);
        res.status(500).send(req.__('errors.loadStudyOptions'));
    }
});

// Ruta para estudiar kanji
router.get('/kanji', async (req, res) => {
    try {
        //Flashcard.find() <- métod de Mongoose; withLearned aplica ?learned= y pasa cada documento a objeto plano
        //(LO MISMO QUE PARA RESOLVER PROBLEMAS AL RENDERIZAR CONTENIDO DE FLASHCARD EN CLIENTE de vocabulario)
        const flashcards = await withLearned(req, { type: 'kanji', ...visibleFilter(req) }, f => Flashcard.find(f));
        const label = learnedLabel(req);
        const selection = req.__('study.allKanji') + (label ? ` · ${label}` : '');

        //res.render('flashcards.twig', { flashcards, mode: 'kanji' });
        //misma vista que vocabulario (study/study.twig); mode decide qué se pinta en cada cara
        res.render('study/study.twig', { flashcards, mode: 'kanji', selection });

    } catch (error) {
        console.error('Error en /study/kanji:', error);
        res.status(500).send(req.__('errors.loadKanji'));
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
router.get('/vocabulary', async (req, res) => {
    try {
        //filtros opcionales desde la pantalla de elección:
        //  libros: ?source=book&level=N4&chapter=2&section=1
        //  propias: ?source=own&level=N5&category=verbos
        const filter = { ...STUDY_VOCABULARY };
        const source = ['book', 'own'].includes(req.query.source) ? req.query.source : null;
        Object.assign(filter, sourceFilter(req, source));  //sin source: libros + propias del usuario

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
        const category = source === 'own' && typeof req.query.category === 'string' ? req.query.category : null;
        if (category !== null) filter.category = category === '' ? { $in: [null, ''] } : category;

        //orden del libro (primero N5, después N4, y por número de palabra); las propias, por fecha de creación.
        //withLearned aplica ?learned= y convierte cada documento Mongoose a objeto JS plano para no complicar twig:
        const flashcards = await withLearned(req, filter, f => Flashcard.find(f).sort({ level: -1, bookId: 1, createdAt: 1 }));

        //texto de lo que se está estudiando, p. ej. "Libros · N4 · 勉強と仕事 · 学校 (School)":
        const parts = [];
        if (source) parts.push(req.__(source === 'own' ? 'study.selectionOwn' : 'study.selectionBook'));
        if (filter.level) {
            const first = flashcards[0];
            parts.push(filter.level);
            if (first && filter.chapter) parts.push(first.chapterTitle);
            if (first && filter.section) parts.push(`${first.sectionTitle} (${first.category})`);
        }
        if (category !== null) parts.push(category || req.__('study.noCategory'));
        const label = learnedLabel(req);
        if (label) parts.push(label);
        const selection = parts.length ? parts.join(' · ') : req.__('study.allVocabulary');

        //el enlace de volver lleva a la pestaña de la que se viene:
        //(y con el mismo filtro de aprendidas):
        const learned = learnedParam(req);
        const params = [];
        if (source === 'own') params.push('tab=own');
        if (learned) params.push(`learned=${learned}`);
        const backUrl = '/japobulario/study' + (params.length ? `?${params.join('&')}` : '');

        res.render('study/study.twig', { flashcards, mode: 'vocabulary', selection, backUrl });
    } catch (error) {
        console.error('Error cargando flashcards:', error); //añado log para consola
        res.status(500).send(req.__('errors.loadVocabulary'));
    }
});

//marcar (learned: true) o desmarcar (learned: false) una tarjeta como aprendida. Lo llama el botón
//"Aprendida" del modo estudio con fetch; responde { learned } con el estado que queda guardado.
router.post('/learned/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.isValidObjectId(id) || typeof req.body.learned !== 'boolean') {
            return res.status(400).json({ error: req.__('errors.invalidRequest') });
        }
        //solo se puede marcar una tarjeta que el usuario puede ver (libros o propias):
        const visible = await Flashcard.exists({ _id: id, ...visibleFilter(req) });
        if (!visible) return res.status(404).json({ error: req.__('errors.cardNotFound') });

        const mark = { user: req.session.user.id, flashcard: id };
        if (req.body.learned) {
            //upsert: si ya estaba marcada no se duplica
            await Learned.updateOne(mark, { $setOnInsert: mark }, { upsert: true });
        } else {
            await Learned.deleteOne(mark);
        }
        res.json({ learned: req.body.learned });
    } catch (error) {
        console.error('Error en /study/learned:', error);
        res.status(500).json({ error: req.__('errors.saveLearned') });
    }
});


module.exports = router;
