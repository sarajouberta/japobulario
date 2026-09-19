var express = require('express');
var router = express.Router();

/* GET home page: la aplicación empieza en /japobulario */
router.get('/', function(req, res, next) {
  res.redirect('/japobulario');
});

/*RECORDATORIO: las rutas van por orden: si hay dos rutas iguales, solo responde la primera */

module.exports = router;
