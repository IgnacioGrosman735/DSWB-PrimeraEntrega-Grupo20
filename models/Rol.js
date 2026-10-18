const mongoose = require("mongoose");
const esquema = new mongoose.Schema({
    _id: { type: Number, required: true, validate: valor => Number.isSafeInteger(valor) && valor > 0 },
    nombre: { type: String, required: true, unique: true, enum: ["Admin", "Ingeniero", "Cliente"] }
}, { versionKey: false, strict: "throw", autoCreate: false, autoIndex: false });

module.exports = mongoose.model("Rol", esquema, "roles");
