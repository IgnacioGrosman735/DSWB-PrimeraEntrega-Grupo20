const mongoose = require("mongoose");

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
    observaciones: {
        type: String,
        required: true,
        validate: valor => valor.trim() !== ""
    },
    nivelAlerta: {
        type: String,
        required: true,
        enum: ["Normal", "Atención", "Crítico"]
    }
}, {
    versionKey: false
});

module.exports = mongoose.model("Observacion", esquema, "observaciones");
