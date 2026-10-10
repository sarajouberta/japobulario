/*
Importa los kanji del Basic Kanji Book Vol. 1 desde seeds/data/kanji_BKB1.json a la colección flashcards.

Uso:
    node seeds/import-book-kanji.js            -> importa (o actualiza) en MongoDB
    node seeds/import-book-kanji.js --dry-run  -> solo valida los datos, sin conectarse

Se puede ejecutar varias veces: cada kanji se identifica por su número en el libro (bookId), así que
reimportar actualiza las fichas existentes en lugar de duplicarlas (también si cambia su nivel).
El vocabulario de los libros y las fichas creadas a mano no se tocan.

El nivel JLPT no viene en el libro (va por lecciones): está en el JSON, sacado de jisho.org.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Flashcard = require('../models/Flashcard');

//dirección de la bdd (config/database.js); se puede cambiar con la variable de entorno MONGO_URL:
const { MONGO_URL } = require('../config/database');
const dryRun = process.argv.includes('--dry-run');

//convierte una entrada del JSON del libro al formato del modelo Flashcard:
function toFlashcard(entry) {
    return {
        type: 'kanji',
        source: 'book',
        level: entry.jlpt,
        bookId: entry.id,
        kanji: entry.kanji,
        //las lecturas, como en el libro (- separa el okurigana, () = poco usada), en una sola línea:
        kunReading: entry.kun.join('、'),
        onReading: entry.on.join('、'),
        meaning: entry.meaning_en,
        category: entry.lesson_title_en,  //tema de la lección, en inglés (como la sección en el vocabulario)
        chapter: entry.lesson,
        chapterTitle: entry.lesson_title,
        chapterTitleEn: entry.lesson_title_en,
        strokes: entry.strokes,
        //cada ejemplo es una palabra con el kanji:
        examples: entry.examples.map(ex => ({
            ja: ex.word,
            jaFurigana: ex.word_furigana,
            en: ex.en,
            reading: ex.reading,
            readingAlt: ex.reading_alt,
        })),
        notes: entry.notes,
        page: entry.page,
        complete: true,
        missing: [],
    };
}

//valida cada ficha con el schema de Mongoose (no necesita conexión):
function validate(cards) {
    const valid = [];
    for (const card of cards) {
        const err = new Flashcard(card).validateSync();
        if (err) {
            console.error(`ERROR kanji #${card.bookId} (${card.kanji}) no es válido: ${err.message}`);
        } else {
            valid.push(card);
        }
    }
    return valid;
}

async function main() {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'kanji_BKB1.json'), 'utf-8'));
    const cards = validate(data.entries.map(toFlashcard));
    const lessons = [...new Set(cards.map(c => c.chapter))];
    console.log(`${cards.length} kanji válidos de ${data.entries.length} (lecciones ${lessons.join(', ')})`);
    if (dryRun || cards.length === 0) return;

    await mongoose.connect(MONGO_URL);
    console.log('Conectado a MongoDB');
    await Flashcard.syncIndexes();  //crea el índice único (type, level, bookId) y borra el antiguo (level, bookId)

    //upsert por tipo + número del libro (sin el nivel, por si cambia en el JSON):
    const result = await Flashcard.bulkWrite(cards.map(card => ({
        updateOne: {
            filter: { type: 'kanji', source: 'book', bookId: card.bookId },
            update: { $set: card },
            upsert: true,
        },
    })));
    console.log(`OK kanji: ${result.upsertedCount} insertados, ${result.modifiedCount} actualizados`);
}

main()
    .catch(err => {
        console.error('ERROR al importar los kanji:', err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
