/*
Dirección de la base de datos MongoDB, en un solo sitio para la aplicación (app.js)
y para los scripts de seeds.
- mongodb://localhost:27017 == puerto por el que MongoDB escucha conexiones por defecto (desarrollo local)
- Se puede cambiar con la variable de entorno MONGO_URL, p. ej. para probar contra otra base de datos:
    MONGO_URL=mongodb://localhost:27017/otra_bdd npm start
 */
module.exports = {
    MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017/japobulario',
};
