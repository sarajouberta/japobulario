/* para controlar menú principal (opciones ded japobulario para estudiar)
/japobulario como una sección o módulo completo, que puede contener varias funcionalidades:
    -/japobulario/flashcards -> Para ver, crear y gestionar tarjetas
    -/japobulario/study -> Para estudiar tarjetas (quiz, modo aleatorio, etc.)
    -/japobulario/user -> Para configuración del usuario o inicio de sesión
    -/japobulario/about -> Qué es Japobulario y bibliografía
Los subrouters (flashcards, study) se montan en app.js, no aquí.
*/

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const Learned = require('../models/Learned');

// Página principal de japobulario: con el nº de tarjetas que tiene aprendidas el usuario
router.get('/', async (req, res, next) => {
    try {
        const learnedCount = await Learned.countDocuments({ user: req.session.user.id });
        res.render('japobulario-home.twig', { learnedCount });
    } catch (error) {
        next(error);
    }
});

/* Libros de los que sale el contenido de la app, para la bibliografía de "Acerca de".
   Los títulos y autores no se traducen (son los del libro). cover = archivo de la portada en
   public/images/books/; si todavía no está, la página pone un recuadro con el título. */
const BOOKS = [
    {
        title: 'はじめての日本語能力試験 N5単語1000',
        subtitle: '1000 Essential Vocabulary for the JLPT N5 - 英語・ベトナム語版',
        authors: 'アークアカデミー (ARC Academy)',
        publisher: '株式会社アスク (ASK)',
        year: 2017,  //初版 第1刷, según el colofón del libro en papel (el PDF no lo trae)
        isbn: '978-4-87217-981-1',
        cover: 'n5-tango-1000.webp',
        content: 'vocabularyN5',
    },
    {
        title: 'はじめての日本語能力試験 N4単語1500',
        subtitle: '1500 Essential Vocabulary for the JLPT N4 - 英語・ベトナム語版',
        authors: 'アークアカデミー (ARC Academy)',
        publisher: '株式会社アスク (ASK)',
        year: 2016,  //初版 第1刷, según el colofón del libro en papel
        isbn: '978-4-87217-982-8',
        cover: 'n4-tango-1500.webp',
        content: 'vocabularyN4',
    },
    {
        title: 'Basic Kanji Book 基本漢字500 Vol. 1',
        subtitle: '第3版',
        authors: 'Chieko Kano, Yuri Shimizu, Hiroko Takenaka, Eriko Ishii',
        publisher: 'Bonjinsha (凡人社)',
        year: null,
        isbn: null,
        cover: 'basic-kanji-book-1.jpg',
        content: 'kanji',
    },
];

// Acerca de: qué es Japobulario y de dónde sale su contenido (enlace "What's Japobulario?" de la portada)
router.get('/about', (req, res) => {
    const coversDir = path.join(__dirname, '..', 'public', 'images', 'books');
    const books = BOOKS.map((book) => ({
        ...book,
        coverUrl: fs.existsSync(path.join(coversDir, book.cover)) ? `/images/books/${book.cover}` : null,
    }));
    res.render('about.twig', { books });
});

module.exports = router;

