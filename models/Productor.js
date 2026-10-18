const mongoose = require("mongoose");

const esquema = new mongoose.Schema({
    usuarioId: { type: Number, ref: "Usuario", validate: valor => valor === undefined || (Number.isSafeInteger(valor) && valor > 0) },
    _id: {
        type: Number,
        required: true,
        validate: valor => Number.isSafeInteger(valor) && valor > 0
    },
    nombre: {
        type: String,
        required: true,
        validate: valor => valor.trim() !== ""
    }
}, {
    versionKey: false
});

esquema.index({ usuarioId: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model("Productor", esquema, "productores");
