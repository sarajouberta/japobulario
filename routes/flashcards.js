var express = require('express');
var router = express.Router();
//IMPORTAR EL MODELO:
var Flashcard = require('../models/Flashcard');

/* GET flashcards listing. */
// esto se traduce en GET /flashcards/, hasta cambio de rutas
router.get('/', async(req, res) => {
  //res.send('respond with a resource');
  //CUIDADO CON REDIRECT: BUCLE INFINITO PORQUE EN APP TENGO: app.use('/japobulario/flashcards', flashcardsRouter);
  //res.redirect('/japobulario/flashcards');

  //mejor mostrar directamente:
  try {
    const flashcards = await Flashcard.find().sort({ createdAt: -1 });
    res.render('flashcards', { flashcards });
  } catch (error) {
    res.status(500).send('Error al obtener las flashcards');
  }
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

// Ruta para listar todas las flashcards
router.get('/flashcards', async (req, res) => {
  try {
    const flashcards = await Flashcard.find().sort({ createdAt: -1 });
    res.render('flashcards', { flashcards });
  } catch (error) {
    res.status(500).send('Error al obtener las flashcards');
  }
});



module.exports = router;
