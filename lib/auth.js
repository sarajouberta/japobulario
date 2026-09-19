/*
Middleware para las rutas que necesitan una sesión iniciada.
Si no hay sesión, redirige al login y guarda a dónde se quería ir (next) para volver después.
 */
function requireLogin(req, res, next) {
    if (req.session.user) return next();
    const nextUrl = encodeURIComponent(req.originalUrl);
    res.redirect(`/login?next=${nextUrl}`);
}

module.exports = { requireLogin };
