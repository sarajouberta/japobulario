/*
Tarjetas que un usuario ha marcado como aprendidas desde el modo estudio.
La marca no puede ir en la tarjeta: las de los libros son comunes a todos los usuarios, así que cada
marca es un documento aparte (usuario + tarjeta). Vale igual para vocabulario y para kanji.
Si la tarjeta deja de estar aprendida, se borra su documento.
 */
const mongoose = require('mongoose');

const learnedSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    flashcard: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard', required: true },
}, { timestamps: true });  //createdAt = cuándo se marcó

//una tarjeta se marca una sola vez por usuario (y así se buscan rápido las de un usuario):
learnedSchema.index({ user: 1, flashcard: 1 }, { unique: true });

module.exports = mongoose.model('Learned', learnedSchema);
