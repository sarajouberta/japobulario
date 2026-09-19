var express = require('express');
var router = express.Router();
//IMPORTAR EL MODELO:
var Flashcard = require('../models/Flashcard');
//qué tarjetas puede ver cada usuario (libros: todos; propias: solo su dueño):
const { BOOK_FILTER, ownFilter } = require('../lib/visibility');

/* GET flashcards listing. */
// esto se traduce en GET /flashcards/, hasta cambio de rutas  (equivale a GET /japobulario/flashcards/new)
router.get('/', async(req, res) => {
  //res.send('respond with a resource');
  //CUIDADO CON REDIRECT: BUCLE INFINITO PORQUE EN APP TENGO: app.use('/japobulario/flashcards', flashcardsRouter);
  //res.redirect('/japobulario/flashcards');

  //mejor mostrar directamente:
  try {
    //dos pestañas: mis tarjetas (por defecto: las creadas con el formulario por este usuario) y las de los libros
    const tab = req.query.tab === 'book' ? 'book' : 'own';
    const filter = tab === 'book' ? BOOK_FILTER : ownFilter(req);
    //las propias, las más nuevas primero; las del libro, en el orden del libro:
    const sort = tab === 'book' ? { level: -1, bookId: 1 } : { createdAt: -1 };

    const flashcards = (await Flashcard.find(filter).sort(sort)).map(doc => doc.toObject());
    const ownTotal = await Flashcard.countDocuments(ownFilter(req));
    const bookTotal = await Flashcard.countDocuments(BOOK_FILTER);
    res.render('flashcards', { flashcards, tab, ownTotal, bookTotal });
  } catch (error) {
    res.status(500).send(req.__('errors.loadFlashcards'));
  }
});


// Mostrar formulario para crear flashcard
router.get('/new', (req, res) => {
  res.render('flashcards/new.twig');
});

// Procesar formulario y guardar flashcard (equivale a POST /japobulario/flashcards/new)
router.post('/new', async (req, res, next) => {
  try {
    const { type, kanji, kunReading, onReading, word, meaning, category, level } = req.body;
    // Validaciones según tipo
    if (type === 'kanji') {
      if (!kanji || !kunReading || !onReading) {
        return res.status(400).send(req.__('errors.kanjiRequired'));
      }
    } else if (type === 'vocabulary') {
      if (!word) {
        return res.status(400).send(req.__('errors.wordRequired'));
      }
    } else {
      return res.status(400).send(req.__('errors.invalidType'));
    }
  //MODIFICACIÓN: CAMPOS VACÍOS SEGÚN TIPO:
    //la tarjeta es del usuario de la sesión (owner): solo él la verá
    const flashcard = new Flashcard( { type, kanji: kanji || null, kunReading: kunReading || null, onReading: onReading || null, word: word || null, meaning, category: category || '', level, owner: req.session.user.id});
    await flashcard.save();
    res.redirect('/japobulario/flashcards'); // Redirige al listado de flashcards después de guardar: ¡CUIDADO! sale del prefijo /japobulario si no se indica en el redirect
  } catch (error) {
    next(error);
  }

});

/* RUTA PARA OBTENER EL FRAGMENTO CORRESPONDIENTE DEL FORMULARIO, según su tipo
 */
router.get('/form-fields/:type', (req, res) => {
  const type = req.params.type;
  //aunque no debería ser nunca erróneo, porque es un select:
  if (!['kanji', 'vocabulary'].includes(type)) {
    return res.status(400).send(req.__('errors.invalidType'));
  }
  res.render(`fragments/form-${type}.twig`, {}, (err, html) => {
    if (err) return res.status(500).send(req.__('errors.loadFields'));
    res.send(html);
  });
});


module.exports = router;
