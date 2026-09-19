/*
Usuarios de la aplicación. Inician sesión con Google a través de Firebase Authentication,
así que la app no guarda ninguna contraseña: solo el id que da Firebase y datos básicos.
Cada usuario tiene sus propias tarjetas (Flashcard.owner); las de los libros son comunes a todos.
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, required: true, unique: true },  //id del usuario en Firebase
    email: { type: String },
    name: { type: String },  //nombre de la cuenta de Google
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
