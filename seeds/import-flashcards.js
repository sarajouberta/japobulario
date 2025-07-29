const fs = require('fs');  //módulo de node para leer contenido del archivo
const path = require('path');
const mongoose = require('mongoose');
const Flashcard = require('../models/Flashcard'); // Ajusta según tu estructura

/* mongodb://localhost:27017 == puerto por el que MongoDB escucha conexiones x defecto
(esto es para desarrollo local: me conecto de forma local ene sta aplicación) */
mongoose.connect('mongodb://localhost:27017/japobulario', {   //conexión con la bdd local
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Conectado a MongoDB');
    importAllFlashcards();
}).catch(err => {
    console.error('Error al conectar con MongoDB:', err);
});

async function importAllFlashcards() {
    await importKanjiFlashcards();
    //await importVocabFlashcards();
    mongoose.connection.close();
}

async function importKanjiFlashcards() {
    const filePath = path.join(__dirname, 'kanji-flashcards.txt');
    //fs de node para leer el contenido del archivo:
    if (!fs.existsSync(filePath)) return;
    //cargar el contenido del archivo en una cadena de texto:
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    const flashcards = lines.map(line => {
        //procesar cada línea:
        const [type, kanji, kunReading, onReading, meaning, category, level] = line.split(';');
        return {
            type: type.trim(),
            kanji: kanji.trim(),
            kunReading: kunReading.trim(),
            onReading: onReading.trim(),
            meaning: meaning.trim(),
            category: category.trim(),
            level: level.trim()
        };
    });

    try {
        //intentar insertar en la bdd:
        const result = await Flashcard.insertMany(flashcards);
        console.log(`✔️ Insertadas ${result.length} flashcards de kanji`);
    } catch (err) {
        console.error('❌ Error al insertar flashcards de kanji:', err);
    }
}

async function importVocabFlashcards() {
    const filePath = path.join(__dirname, 'vocabulary-flashcards.txt');
    if (!fs.existsSync(filePath)) return;

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    const flashcards = lines.map(line => {
        const [type, word, meaning, category, level] = line.split(';');
        return {
            type: type.trim(),
            word: word.trim(),
            meaning: meaning.trim(),
            category: category.trim(),
            level: level.trim()
        };
    });

    try {
        const result = await Flashcard.insertMany(flashcards);
        console.log(`✔️ Insertadas ${result.length} flashcards de vocabulario`);
    } catch (err) {
        console.error('❌ Error al insertar flashcards de vocabulario:', err);
    }
}
