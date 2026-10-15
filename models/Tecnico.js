const mongoose = require("mongoose");

const esquema = new mongoose.Schema({
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

module.exports = mongoose.model("Tecnico", esquema, "tecnicos");
