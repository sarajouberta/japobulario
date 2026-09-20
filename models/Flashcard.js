/*
Aunque en la uni no utilizamos modelo aparte, en un proyecto real con Node.js y MongoDB,
usar schemas con Mongoose es la forma recomendada para manejar los datos.
- El modelo es la herramienta para trabajar con los datos: crear, consultar, actualizar y borrar documentos en MongoDB
- Exportarlo con module.exports permite usar ese modelo en otras partes del código, como en las rutas
 */

const mongoose = require('mongoose');

//frase de ejemplo del libro (furigana en notación {漢字|かな}):
const exampleSchema = new mongoose.Schema({
    ja: { type: String, required: true },
    jaFurigana: { type: String },
    en: { type: String },
}, { _id: false });

//palabra relacionada / sinónimo / antónimo que el libro añade debajo de una entrada:
const relatedSchema = new mongoose.Schema({
    type: { type: String, enum: ['related', 'synonym', 'antonym'], required: true },
    word: { type: String, required: true },
    reading: { type: String },
    meaning: { type: String },
}, { _id: false });

//modelo de datos de cada flashcard:
const flashcardSchema = new mongoose.Schema({
    type: { type: String, enum: ['kanji', 'vocabulary'], required: true },
    kanji: { type: String},
    word: { type: String},
    kunReading: { type: String},  //no required: para fichas kanji solo
    onReading: { type: String},
    //mainReading: { type: String, required: true },
    //las entradas incompletas del libro (páginas ilustradas) pueden no traer significado:
    meaning: { type: String, required: function () { return this.complete !== false; } },
    category: { type: String},
    level: { type: String, enum: ['N5', 'N4'], required: true },

    //dueño de las tarjetas propias (las creadas con el formulario); las de los libros no tienen dueño.
    //Cada usuario solo ve y estudia sus propias tarjetas (ver lib/visibility.js):
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    //campos del vocabulario importado de los libros (seeds/data/vocabulary_N*.json):
    source: { type: String, enum: ['manual', 'book'], default: 'manual' },
    bookId: { type: Number },         //número de la palabra en el libro (único por nivel)
    reading: { type: String },        //lectura completa en kana
    wordFurigana: { type: String },   //palabra con furigana {漢字|かな}
    pos: [{ type: String }],          //categoría gramatical (solo N4)
    chapter: { type: Number },
    chapterTitle: { type: String },
    chapterTitleEn: { type: String },  //el mismo título del capítulo, en inglés
    section: { type: Number },
    sectionTitle: { type: String },
    examples: [exampleSchema],
    related: [relatedSchema],
    notes: [{ type: String }],
    page: { type: Number },
    //false si le falta significado o ejemplo; `missing` indica qué le falta:
    complete: { type: Boolean, default: true },
    missing: [{ type: String, enum: ['meaning_en', 'examples'] }],
}, { timestamps: true });  //añade createdAt/updatedAt (el listado ordena por createdAt)

//cada palabra del libro existe una sola vez por nivel (permite reimportar sin duplicar):
flashcardSchema.index(
    { level: 1, bookId: 1 },
    { unique: true, partialFilterExpression: { bookId: { $exists: true } } }
);

/* Para crear modelo representado de mongoose basado en el schema (representando la "tabla" de flashcards en MongoDB
Mongoose automáticamente buscará o creará una colección llamada 'flashcards' (plural y en minúsculas).
+
Exporta ese modelo para que pueda ser usado en otros archivos del proyecto (podrá usarse al hacer "require"): */
module.exports = mongoose.model('Flashcard', flashcardSchema);
