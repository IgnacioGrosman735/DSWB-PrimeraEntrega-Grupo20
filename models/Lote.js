const mongoose = require("mongoose");

const esquema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true,
        validate: valor => Number.isSafeInteger(valor) && valor > 0
    },
    hectareas: {
        type: Number,
        required: true,
        validate: valor => Number.isFinite(valor) && valor > 0
    },
    tipoCultivoId: {
        type: Number,
        required: true,
        ref: "TipoCultivo",
        validate: valor => Number.isSafeInteger(valor) && valor > 0
    },
    productorId: {
        type: Number,
        required: true,
        ref: "Productor",
        validate: valor => Number.isSafeInteger(valor) && valor > 0
    },
    ubicacion: {
        type: String,
        required: true,
        validate: valor => valor.trim() !== ""
    }
}, {
    versionKey: false
});

module.exports = mongoose.model("Lote", esquema, "lotes");
