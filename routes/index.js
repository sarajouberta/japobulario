var express = require('express');
var router = express.Router();

/* GET home page: la aplicación empieza en /japobulario */
router.get('/', function(req, res, next) {
  res.redirect('/japobulario');
});

/* Cambiar el idioma de la interfaz (selector ES / EN del menú): /lang/es o /lang/en
   Guarda el idioma en la cookie "lang" (la lee i18n en app.js) y vuelve a la página donde se estaba. */
router.get('/lang/:locale', function(req, res) {
  const locale = ['es', 'en'].includes(req.params.locale) ? req.params.locale : 'es';
  res.cookie('lang', locale, { maxAge: 365 * 24 * 60 * 60 * 1000 });  //se recuerda durante un año

  //volver a la página anterior, pero solo si es de esta misma web:
  let back = '/japobulario';
  try {
    const referer = new URL(req.get('Referer'));
    if (referer.host === req.get('host')) back = referer.pathname + referer.search;
  } catch (e) {
    //sin Referer o no válido: se va a la página principal
  }
  res.redirect(back);
});

/* Pantalla de espera mientras el servidor despierta (la guarda en caché el service worker, public/sw.js).
   Lleva los textos de los dos idiomas, porque se guarda una vez y el idioma se elige al enseñarla. */
router.get('/waking', function(req, res) {
  const texts = {};
  for (const locale of ['es', 'en']) {
    texts[locale] = {
      title: req.__({ phrase: 'waking.title', locale }),
      text: req.__({ phrase: 'waking.text', locale }),
    };
  }
  res.render('waking', { texts });
});

/* La pantalla de espera pregunta aquí si el servidor ya está despierto. */
router.get('/ping', function(req, res) {
  res.set('Cache-Control', 'no-store');
  res.type('text').send('ok');
});

/*RECORDATORIO: las rutas van por orden: si hay dos rutas iguales, solo responde la primera */

module.exports = router;
