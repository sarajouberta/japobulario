/*
Tarjetas aprendidas del usuario de la sesión (modelo Learned). Lo usan el índice de estudio (progreso)
y el modo estudio (filtro y marca de cada tarjeta).
 */
const mongoose = require('mongoose');
const Learned = require('../models/Learned');

//valores del parámetro ?learned= : yes = solo aprendidas, no = solo sin aprender (sin él: todas)
const LEARNED_VALUES = ['yes', 'no'];

//ids de las tarjetas que tiene aprendidas el usuario de la sesión (como ObjectId, para usarlos también en aggregate):
async function learnedIds(req) {
    const docs = await Learned.find({ user: req.session.user.id }, { flashcard: 1 }).lean();
    return docs.map(d => new mongoose.Types.ObjectId(d.flashcard));
}

//condición sobre _id según el valor de ?learned= (null si no hay que filtrar):
function learnedFilter(ids, value) {
    if (value === 'yes') return { _id: { $in: ids } };
    if (value === 'no') return { _id: { $nin: ids } };
    return null;
}

module.exports = { LEARNED_VALUES, learnedIds, learnedFilter };
