const mongoose = require("mongoose");
// Notas - Andrea | Inicio | Incorporar catálogo único de niveles de alerta
const nivelesAlerta = require("../config/nivelesAlerta");
// Notas - Andrea | Fin | Incorporar catálogo único de niveles de alerta

const esquema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true,
        validate: valor => Number.isSafeInteger(valor) && valor > 0
    },
    loteId: {
        type: Number,
        required: true,
        ref: "Lote",
        validate: valor => Number.isSafeInteger(valor) && valor > 0
    },
    tecnicoId: {
        type: Number,
        required: true,
        ref: "Tecnico",
        validate: valor => Number.isSafeInteger(valor) && valor > 0
    },
    fecha: {
        type: String,
        required: true,
        validate: valor => /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
            !Number.isNaN(new Date(valor).getTime()) &&
            new Date(valor).toISOString().slice(0, 10) === valor
    },
    tipoCultivoId: {
        type: Number,
        required: true,
        ref: "TipoCultivo",
        validate: valor => Number.isSafeInteger(valor) && valor > 0
    },
    estadoCultivo: {
        type: String,
        required: true,
        validate: valor => valor.trim() !== ""
    },
    estado: {
        type: String,
        required: true,
        enum: ["Pendiente", "Cargada"],
        default: "Cargada"
    },
    observaciones: {
        type: String,
        required: true,
        validate: valor => valor.trim() !== ""
    },
    // Notas - Andrea | Inicio | Enum de observaciones con catálogo único de alertas
    nivelAlerta: {
        type: String,
        required: true,
        enum: nivelesAlerta
    }
    // Notas - Andrea | Fin | Enum de observaciones con catálogo único de alertas
}, {
    versionKey: false
});

module.exports = mongoose.model("Observacion", esquema, "observaciones");
