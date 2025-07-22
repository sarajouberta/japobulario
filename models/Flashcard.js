/*
Aunque en la uni no utilizamos modelo aparte, en un proyecto real con Node.js y MongoDB,
usar schemas con Mongoose es la forma recomendada para manejar los datos.
- El modelo es la herramienta para trabajar con los datos: crear, consultar, actualizar y borrar documentos en MongoDB
- Exportarlo con module.exports permite usar ese modelo en otras partes del código, como en las rutas
 */

const mongoose = require('mongoose');

//modelo de datos de cada flashcard:
const flashcardSchema = new mongoose.Schema({
    kanji: { type: String, required: true },
    reading: { type: String, required: true },
    meaning: { type: String, required: true },
    category: { type: String, required: true },
    level: { type: String, required: true }
});

/* Para crear modelo representado de mongoose basado en el schema (representando la "tabla" de flashcards en MongoDB
Mongoose automáticamente buscará o creará una colección llamada 'flashcards' (plural y en minúsculas).
+
Exporta ese modelo para que pueda ser usado en otros archivos del proyecto (podrá usarse al hacer "require"): */
module.exports = mongoose.model('Flashcard', flashcardSchema);
