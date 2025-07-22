var express = require('express');
var router = express.Router();
//IMPORTAR EL MODELO:
var Flashcard = require('../models/Flashcard');

/* GET flashcards listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


// Mostrar formulario para crear flashcard
router.get('/new', (req, res) => {
  res.render('new-flashcard.twig');
});

// Procesar formulario y guardar flashcard
router.post('/new', async (req, res, next) => {
  try {
    const { kanji, reading, meaning, category, level } = req.body;
    const flashcard = new Flashcard({ kanji, reading, meaning, category, level });
    await flashcard.save();
    res.redirect('/flashcards'); // Redirige al listado de flashcards después de guardar
  } catch (error) {
    next(error);
  }
});



module.exports = router;
