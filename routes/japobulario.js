/* para controlar menú principal (opciones ded japobulario para estudiar)
/japobulario como una sección o módulo completo, que puede contener varias funcionalidades:
    -/japobulario/flashcards -> Para ver, crear y gestionar tarjetas
    -/japobulario/study -> Para estudiar tarjetas (quiz, modo aleatorio, etc.)
    -/japobulario/user -> Para configuración del usuario o inicio de sesión
Los subrouters (flashcards, study) se montan en app.js, no aquí.
*/

const express = require('express');
const router = express.Router();

// Página principal de japobulario
router.get('/', (req, res) => {
    res.render('japobulario-home.twig');
});

module.exports = router;

