/*
Firebase Admin en el servidor: solo se usa para comprobar que el token que envía el navegador
al iniciar sesión con Google es auténtico y no ha caducado.
Para verificar tokens basta con el projectId (Firebase publica las claves públicas con las que
firma los tokens), así que no hace falta ninguna clave secreta de servicio.
 */
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const firebaseConfig = require('../config/firebase');

const app = initializeApp({ projectId: firebaseConfig.projectId });

//devuelve los datos del usuario del token (uid, email, name...) o lanza un error si no es válido
function verifyIdToken(idToken) {
    return getAuth(app).verifyIdToken(idToken);
}

module.exports = { verifyIdToken };
