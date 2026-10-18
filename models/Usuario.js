const mongoose = require("mongoose");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { passwordValida, ITERACIONES } = require("../utils/password");

const pbkdf2 = promisify(crypto.pbkdf2);

const esquema = new mongoose.Schema({
    _id: { type: Number, required: true, validate: valor => Number.isSafeInteger(valor) && valor > 0 },
    nombre: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    usuario: { type: String, required: true, unique: true, lowercase: true, trim: true,
        maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    passwordHash: { type: String, required: true, select: false, match: /^[a-f0-9]{128}$/ },
    salt: { type: String, required: true, select: false, match: /^[a-f0-9]{32}$/ },
    passwordIteraciones: { type: Number, required: true, enum: [ITERACIONES], select: false },
    activo: { type: Boolean, default: true, required: true }
}, { timestamps: true, versionKey: false, strict: "throw", autoCreate: false, autoIndex: false });

esquema.methods.validarPassword = async function(password) {
    // Comprobar que los datos guardados tengan el formato esperado.
    if (typeof password !== "string" || password.length > 128 ||
        !/^[a-f0-9]{32}$/.test(this.salt || "") ||
        !/^[a-f0-9]{128}$/.test(this.passwordHash || "") ||
        this.passwordIteraciones !== ITERACIONES) {
        return false;
    }

    const hash = await pbkdf2(password, this.salt, this.passwordIteraciones, 64, "sha512");
    const hashGuardado = Buffer.from(this.passwordHash, "hex");
    return crypto.timingSafeEqual(hash, hashGuardado);
};

esquema.statics.crearPasswordSeguro = async function(password) {
    if (!passwordValida(password)) {
        throw new Error("La contraseña debe tener entre 15 y 128 caracteres");
    }

    const salt = crypto.randomBytes(16).toString("hex");

    const hash = await pbkdf2(password, salt, ITERACIONES, 64, "sha512");
    const passwordHash = hash.toString("hex");

    return { salt, passwordHash, passwordIteraciones: ITERACIONES };
};
esquema.set("toJSON", { transform: (_doc, datos) => {
    delete datos.passwordHash;
    delete datos.salt;
    delete datos.passwordIteraciones;
    return datos;
} });


module.exports = mongoose.model("Usuario", esquema, "usuarios");
