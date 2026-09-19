/*
Inicio y cierre de sesión con Google (Firebase Authentication):
 1. GET /login muestra el botón; el navegador hace el login con Google usando Firebase (views/auth/login.twig)
 2. el navegador envía a POST /auth/session el token que le da Firebase
 3. el servidor comprueba el token, busca o crea el usuario en MongoDB y guarda la sesión
A partir de ahí la sesión es la de Express (express-session); Firebase ya no interviene.
 */
var express = require('express');
var router = express.Router();
const User = require('../models/User');
const { verifyIdToken } = require('../lib/firebase');
const firebaseConfig = require('../config/firebase');

//a dónde volver después de iniciar sesión: solo rutas de esta misma web (empiezan por una sola /)
function safeNext(next) {
    return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/japobulario';
}

//guarda el usuario en la sesión. Se regenera la sesión al iniciarla para que no se pueda
//reutilizar un id de sesión anterior (fijación de sesión)
function startSession(req, user, callback) {
    req.session.regenerate(err => {
        if (err) return callback(err);
        req.session.user = { id: user._id.toString(), name: user.name || user.email };
        req.session.save(callback);
    });
}

// Pantalla de inicio de sesión (botón de Google)
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/japobulario');
    res.render('auth/login.twig', { next: safeNext(req.query.next), firebaseConfig });
});

// Recibe el token de Firebase, lo comprueba y crea la sesión
router.post('/auth/session', async (req, res, next) => {
    try {
        let decoded;
        try {
            decoded = await verifyIdToken(String(req.body.idToken || ''));
        } catch (e) {
            return res.status(401).json({ error: req.__('auth.loginError') });
        }

        //busca el usuario por su id de Firebase; si es su primera vez, lo crea.
        //El nombre y el email se actualizan en cada login por si cambian en Google.
        const user = await User.findOneAndUpdate(
            { firebaseUid: decoded.uid },
            { email: decoded.email, name: decoded.name },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        startSession(req, user, err => {
            if (err) return next(err);
            res.json({ redirect: safeNext(req.body.next) });
        });
    } catch (error) {
        next(error);
    }
});

// Cerrar sesión (POST: un simple enlace no debería poder cerrar la sesión)
router.post('/logout', (req, res, next) => {
    req.session.destroy(err => {
        if (err) return next(err);
        res.clearCookie('japobulario.sid');
        res.redirect('/login');
    });
});

module.exports = router;
