const mongoose = require("mongoose");

const esquema = new mongoose.Schema(
    {
        _id: {
            type: Number,
            required: true,
            validate: (valor) => Number.isSafeInteger(valor) && valor > 0
        },
        hectareas: {
            type: Number,
            required: true,
            validate: (valor) => Number.isFinite(valor) && valor >= 0.000001
        },
        tipoCultivoId: {
            type: Number,
            required: true,
            ref: "TipoCultivo",
            validate: (valor) => Number.isSafeInteger(valor) && valor > 0
        },
        productorId: {
            type: Number,
            default: null,
            ref: "Productor",
            validate: (valor) => valor === null || (Number.isSafeInteger(valor) && valor > 0)
        },
        ubicacion: {
            type: String,
            required: true,
            validate: (valor) => valor.trim() !== ""
        }
    },
    {
        versionKey: false
    }
);

const pipelineEstado = [
    // Última observación de cada lote, sin contar las pendientes.
    { $lookup: {
        from: "observaciones", localField: "_id", foreignField: "loteId",
        pipeline: [
            { $match: { estado: { $ne: "Pendiente" } } },
            { $sort: { fecha: -1, _id: -1 } },
            { $limit: 1 }
        ],
        as: "ultima"
    } },
    // preserveNullAndEmptyArrays: un lote sin datos no debe desaparecer del tablero.
    { $unwind: { path: "$ultima", preserveNullAndEmptyArrays: true } },
    { $addFields: { nivelActual: { $ifNull: ["$ultima.nivelAlerta", "Sin datos"] } } },
    { $lookup: { from: "productores", localField: "productorId", foreignField: "_id", as: "productor" } },
    { $unwind: { path: "$productor", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "tiposCultivo", localField: "tipoCultivoId", foreignField: "_id", as: "tipoCultivo" } },
    { $unwind: { path: "$tipoCultivo", preserveNullAndEmptyArrays: true } },
    // Primero lo urgente; "Sin datos" va antes que "Normal".
    { $addFields: { prioridad: { $indexOfArray: [["Crítico", "Atención", "Sin datos", "Normal"], "$nivelActual"] } } },
    { $sort: { prioridad: 1, _id: 1 } },
    { $project: {
        ubicacion: 1, hectareas: 1,
        productor: "$productor.nombre", cultivo: "$tipoCultivo.nombre",
        nivelActual: 1, fechaUltima: "$ultima.fecha", estadoCultivo: "$ultima.estadoCultivo"
    } }
];

esquema.statics.obtenerEstadoActual = function () {
    return this.aggregate(pipelineEstado);
};

module.exports = mongoose.model("Lote", esquema, "lotes");
