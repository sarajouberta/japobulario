/* para controlar menú principal (opciones ded japobulario para estudiar)
/japobulario como una sección o módulo completo, que puede contener varias funcionalidades:
    -/japobulario/flashcards -> Para ver, crear y gestionar tarjetas
    -/japobulario/study -> Para estudiar tarjetas (quiz, modo aleatorio, etc.)
    -/japobulario/user -> Para configuración del usuario o inicio de sesión
Los subrouters (flashcards, study) se montan en app.js, no aquí.
*/

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

module.exports = router;

