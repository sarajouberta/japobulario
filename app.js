var createError = require('http-errors');
//para permitir que se sirvan los css/js e img desde public/
var express = require('express');
var path = require('path');

var cookieParser = require('cookie-parser');
var logger = require('morgan');

//flashcards en mongoose:
var mongoose = require('mongoose'); //importar mongoose

//traducción de la interfaz (español / inglés):
var i18n = require('i18n');


var indexRouter = require('./routes/index');
//var usersRouter = require('./routes/flashcards');
var flashcardsRouter = require('./routes/flashcards');

var japobularioRouter = require('./routes/japobulario');
var studyRouter = require('./routes/study');

/*
MÉTOD connect DEPRECATED: simplificado justo debajo

mongoose.connect('mongodb://localhost/japobulario', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
    .then(() => console.log('MongoDB conectado'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));
*/

//la dirección de la bdd está en config/database.js (la comparten la app y los seeds):
const { MONGO_URL } = require('./config/database');
mongoose.connect(MONGO_URL)
    .then(() => console.log('MongoDB conectado'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

app.use(logger('dev'));
app.use(express.json());
//middleware para poder obtener la info del POST (formularios):
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/* TRADUCCIÓN (i18n): los textos de la interfaz están en locales/es.json y locales/en.json.
   - El idioma se lee de la cookie "lang" (la guarda el selector ES / EN del menú); por defecto, español.
   - En las vistas: {{ __('clave') }}; en las rutas: req.__('clave').
   - objectNotation: las claves se agrupan por pantalla, p. ej. 'study.next'. */
i18n.configure({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  directory: path.join(__dirname, 'locales'),
  cookie: 'lang',
  objectNotation: true,
  updateFiles: false,  //no crear claves nuevas automáticamente en los .json
});
app.use(i18n.init);  //después de cookieParser, para poder leer la cookie
//idioma actual disponible en todas las vistas (para <html lang> y el selector del menú):
app.use((req, res, next) => {
  res.locals.locale = req.getLocale();
  next();
});


app.use('/', indexRouter);
//app.use('/users', usersRouter);
app.use('/japobulario', japobularioRouter);  //enrutador para la página principal de la aplicación

//esto quiere decir que todas las rutas definidas en el router se "pegan" después de /japobulario/flashcards:
app.use('/japobulario/flashcards', flashcardsRouter);
app.use('/japobulario/study', studyRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
