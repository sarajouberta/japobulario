var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect('/japobulario');
});

/*RECORDATORIO: las rutas van por orden: esta no se usa porque entra por la primera (con la redirección
)*/
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });

});




module.exports = router;
