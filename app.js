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

//sesiones de usuario (inicio de sesión con Google), guardadas en MongoDB:
var session = require('express-session');
var MongoStore = require('connect-mongo');
const { requireLogin } = require('./lib/auth');


var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
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

/* SESIONES: al iniciar sesión con Google (routes/auth.js) se guarda el usuario en req.session.user.
   - La sesión se guarda en MongoDB (colección sessions): no se pierde al reiniciar la app.
   - SESSION_SECRET firma la cookie de sesión. En desarrollo hay uno por defecto; al publicar la app
     hay que definir uno propio y largo en las variables de entorno (ver .env.example). */
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('Falta la variable de entorno SESSION_SECRET');
}
if (isProduction) app.set('trust proxy', 1);  //el hosting suele ir detrás de un proxy (necesario para cookie secure)
app.use(session({
  name: 'japobulario.sid',
  secret: process.env.SESSION_SECRET || 'secreto-solo-para-desarrollo',
  resave: false,
  saveUninitialized: false,  //no se crea sesión hasta que alguien inicia sesión
  store: MongoStore.create({ mongoUrl: MONGO_URL }),
  cookie: {
    httpOnly: true,            //el JavaScript de la página no puede leer la cookie
    sameSite: 'lax',           //no se envía en peticiones POST desde otras webs
    secure: isProduction,      //al publicar, solo por https
    maxAge: 30 * 24 * 60 * 60 * 1000,  //la sesión dura 30 días
  },
}));
//usuario de la sesión disponible en todas las vistas (para el menú):
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});


app.use('/', indexRouter);
app.use('/', authRouter);  //login, sesión y logout
//app.use('/users', usersRouter);

//todo lo que hay bajo /japobulario necesita haber iniciado sesión:
app.use('/japobulario', requireLogin);
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
