/*
Importa el vocabulario de los libros (N5単語1000 y N4単語1500) desde seeds/data/vocabulary_N*.json
a la colección flashcards.

Uso:
    node seeds/import-book-vocabulary.js            -> importa (o actualiza) en MongoDB
    node seeds/import-book-vocabulary.js --dry-run  -> solo valida los datos, sin conectarse

Se puede ejecutar varias veces: cada palabra se identifica por (type, level, bookId), así que
reimportar actualiza las fichas existentes en lugar de duplicarlas.
Las fichas creadas a mano (source: 'manual') y los kanji del libro (import-book-kanji.js) no se tocan.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Flashcard = require('../models/Flashcard');

//dirección de la bdd (config/database.js); se puede cambiar con la variable de entorno MONGO_URL:
const { MONGO_URL } = require('../config/database');
const LEVELS = ['N5', 'N4'];
const dryRun = process.argv.includes('--dry-run');

//convierte una entrada del JSON del libro al formato del modelo Flashcard:
function toFlashcard(entry, complete) {
    return {
        type: 'vocabulary',
        source: 'book',
        level: entry.level,
        bookId: entry.id,
        word: entry.word,
        reading: entry.reading,
        wordFurigana: entry.word_furigana,
        meaning: entry.meaning_en || undefined,
        pos: entry.pos,
        category: entry.section_title_en,  //tema de la sección del libro (Family, Weather...)
        chapter: entry.chapter,
        chapterTitle: entry.chapter_title,
        chapterTitleEn: entry.chapter_title_en,
        section: entry.section,
        sectionTitle: entry.section_title,
        examples: entry.examples.map(ex => ({ ja: ex.ja, jaFurigana: ex.ja_furigana, en: ex.en })),
        related: entry.related.map(r => ({ type: r.type, word: r.word, reading: r.reading, meaning: r.meaning_en || undefined })),
        notes: entry.notes,
        page: entry.page,
        complete,
        missing: complete ? [] : entry.missing,
    };
}

function loadLevel(level) {
    const filePath = path.join(__dirname, 'data', `vocabulary_${level}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return [
        ...data.entries.map(e => toFlashcard(e, true)),
        ...data.incomplete_entries.map(e => toFlashcard(e, false)),
    ];
}

//valida cada ficha con el schema de Mongoose (no necesita conexión):
function validate(cards) {
    const valid = [];
    for (const card of cards) {
        const err = new Flashcard(card).validateSync();
        if (err) {
            console.error(`ERROR ${card.level} #${card.bookId} (${card.word}) no es válida: ${err.message}`);
        } else {
            valid.push(card);
        }
    }
    return valid;
}

async function importLevel(level) {
    const cards = validate(loadLevel(level));
    const incomplete = cards.filter(c => !c.complete).length;
    console.log(`${level}: ${cards.length} fichas válidas (${incomplete} incompletas)`);
    if (dryRun) return;

    //upsert: inserta si no existe (type + level + bookId), actualiza si ya existe. El tipo es necesario:
    //los kanji del libro también tienen bookId 1, 2, 3... y nivel N5
    const result = await Flashcard.bulkWrite(cards.map(card => ({
        updateOne: {
            filter: { type: 'vocabulary', level: card.level, bookId: card.bookId },
            update: { $set: card },
            upsert: true,
        },
    })));
    console.log(`OK ${level}: ${result.upsertedCount} insertadas, ${result.modifiedCount} actualizadas`);
}

async function main() {
    if (!dryRun) {
        await mongoose.connect(MONGO_URL);
        console.log('Conectado a MongoDB');
        await Flashcard.syncIndexes();  //crea el índice único (type, level, bookId) y borra el antiguo (level, bookId)
    }
    for (const level of LEVELS) {
        await importLevel(level);
    }
}

main()
    .catch(err => {
        console.error('ERROR al importar el vocabulario:', err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
