/* Para gestionar modos de estudio */

var express = require('express');
var router = express.Router();
const Flashcard = require('../models/Flashcard');

router.get('/', (req, res) => {
    res.send('prueba: Bienvenido al modo de estudio de Japobulario');
    //render a study.twig con las opciones de estudio?
});

// Ruta para estudiar kanji
router.get('/kanji', async (req, res) => {
    try {
        const flashcards = await Flashcard.find({ type: 'kanji' });  //Flashcard.find() <- métod de Mongoose
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
router.get('/vocabulario', async (req, res) => {
    try {
        const flashcards = await Flashcard.find();
        res.render('flashcards.twig', { flashcards, mode: 'vocabulario' });
    } catch (error) {
        res.status(500).send('Error al cargar el vocabulario');
    }
});


module.exports = router;
