/*
Qué tarjetas puede ver cada usuario. Está en un solo sitio para que todas las rutas usen la misma regla:
 - las de los libros (source: 'book') son comunes: las ven todos
 - las propias (creadas con el formulario) solo las ve su dueño (owner)
Se usa en los find() y también en los aggregate(), por eso el id se convierte a ObjectId
(en aggregate, Mongoose no convierte los tipos automáticamente).
 */
const mongoose = require('mongoose');

//tarjetas de los libros
const BOOK_FILTER = { source: 'book' };

//tarjetas propias del usuario de la sesión
function ownFilter(req) {
    return {
        source: { $ne: 'book' },
        owner: new mongoose.Types.ObjectId(req.session.user.id),
    };
}

//todo lo que puede ver el usuario: libros + sus propias tarjetas
function visibleFilter(req) {
    return { $or: [BOOK_FILTER, ownFilter(req)] };
}

module.exports = { BOOK_FILTER, ownFilter, visibleFilter };
