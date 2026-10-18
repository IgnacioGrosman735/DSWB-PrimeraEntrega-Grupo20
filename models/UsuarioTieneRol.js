const mongoose = require("mongoose");
const esquema = new mongoose.Schema(
    {
        _id: {
            type: Number,
            required: true,
            validate: (valor) => Number.isSafeInteger(valor) && valor > 0
        },
        usuarioId: {
            type: Number,
            ref: "Usuario",
            required: true,
            validate: (valor) => Number.isSafeInteger(valor) && valor > 0
        },
        rolId: {
            type: Number,
            ref: "Rol",
            required: true,
            validate: (valor) => Number.isSafeInteger(valor) && valor > 0
        }
    },
    { versionKey: false, strict: "throw", autoCreate: false, autoIndex: false }
);
esquema.index({ usuarioId: 1, rolId: 1 }, { unique: true });

module.exports = mongoose.model("UsuarioTieneRol", esquema, "usuarios_tiene_roles");
