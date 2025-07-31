var createError = require('http-errors');
//para permitir que se sirvan los css/js e img desde public/
var express = require('express');
var path = require('path');

var cookieParser = require('cookie-parser');
var logger = require('morgan');

//flashcards en mongoose:
var mongoose = require('mongoose'); //importar mongoose


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

mongoose.connect('mongodb://localhost/japobulario')
    .then(() => console.log('MongoDB conectado'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//middleware para poder obtener la info del POST:
app.use(express.urlencoded({ extended: false }));


app.use('/', indexRouter);
//app.use('/users', usersRouter);
app.use('/japobulario', japobularioRouter);  //enrutador para las opciones de la aplicación, entre ellas la que llame a flashcards

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
