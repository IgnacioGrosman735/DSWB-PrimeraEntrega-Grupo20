const mongoose = require("mongoose");
const idPositivo = (valor) => Number.isSafeInteger(valor) && valor > 0;
const esquema = new mongoose.Schema(
    {
        _id: { type: Number, required: true, validate: idPositivo },
        tecnicoId: { type: Number, ref: "Tecnico", required: true, validate: idPositivo },
        loteId: { type: Number, ref: "Lote", required: true, validate: idPositivo }
    },
    { versionKey: false, strict: "throw", autoCreate: false, autoIndex: false }
);
esquema.index({ tecnicoId: 1, loteId: 1 }, { unique: true });
module.exports = mongoose.model("TecnicoTieneLote", esquema, "tecnico_tiene_lotes");
