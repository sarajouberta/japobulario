/* Para gestionar modos de estudio */

var express = require('express');
var router = express.Router();
const Flashcard = require('../models/Flashcard');

router.get('/', (req, res) => {
    res.send('prueba: Bienvenido al modo estudio de Japobulario');
    //render a study.twig con las opciones de estudio?
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
        const flashcardsDocs = await Flashcard.find({ type: 'vocabulary' });

        //convertir cada documento Mongoose a objeto JS plano para no complicar twig:
        const flashcards = flashcardsDocs.map(doc => doc.toObject());

        res.render('study/study-vocabulary.twig', { flashcards, mode: 'vocabulario' });
    } catch (error) {
        console.error('Error cargando flashcards:', error); //añado log para consola
        res.status(500).send('Error al cargar el vocabulario');
    }
});


module.exports = router;
