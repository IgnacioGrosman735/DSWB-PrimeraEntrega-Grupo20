const Usuario = require("../models/Usuario");
const Rol = require("../models/Rol");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");
const { ITERACIONES } = require("../utils/password");
const rolesIniciales = [
    { _id: 1, nombre: "Admin" },
    { _id: 2, nombre: "Ingeniero" },
    { _id: 3, nombre: "Cliente" }
];
const idRol = { bsonType: ["int", "long", "double"], minimum: 1, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 1 };

// Estos validadores se ejecutan en MongoDB, incluso ante escrituras desde Compass.
const definiciones = {
    usuarios: {
        bsonType: "object", additionalProperties: false,
        required: ["_id", "nombre", "usuario", "passwordHash", "salt", "passwordIteraciones", "activo", "createdAt", "updatedAt"],
        properties: {
            _id: idRol,
            nombre: { bsonType: "string", minLength: 1, maxLength: 100, pattern: "\\S" },
            usuario: { bsonType: "string", maxLength: 254, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
            passwordHash: { bsonType: "string", pattern: "^[a-f0-9]{128}$" },
            salt: { bsonType: "string", pattern: "^[a-f0-9]{32}$" },
            passwordIteraciones: { enum: [ITERACIONES] },
            activo: { bsonType: "bool" },
            createdAt: { bsonType: "date" }, updatedAt: { bsonType: "date" }
        }
    },
    roles: {
        bsonType: "object", additionalProperties: false, required: ["_id", "nombre"],
        properties: { _id: idRol, nombre: { enum: ["Admin", "Ingeniero", "Cliente"] } }
    },
    usuarios_tiene_roles: {
        bsonType: "object", additionalProperties: false, required: ["_id", "usuarioId", "rolId"],
        properties: { _id: idRol, usuarioId: idRol, rolId: idRol }
    }
};

async function prepararColeccionesAuth(db) {
    const existentes = await db.collection("roles").find().toArray();
    if (existentes.some(rol => !Number.isSafeInteger(rol._id) || rol._id <= 0 ||
        rolesIniciales.some(inicial => (inicial.nombre === rol.nombre && inicial._id !== rol._id) ||
            (inicial._id === rol._id && inicial.nombre !== rol.nombre)))) {
        throw new Error("Los roles existentes necesitan migrarse a IDs numéricos antes de iniciar");
    }
    for (const [nombre, esquema] of Object.entries(definiciones)) {
        const opciones = { validator: { $jsonSchema: esquema }, validationLevel: "strict", validationAction: "error" };
        const existe = await db.listCollections({ name: nombre }, { nameOnly: true }).hasNext();
        if (existe) await db.command({ collMod: nombre, ...opciones });
        else await db.createCollection(nombre, opciones);
    }
    // Retirar únicamente el metadato de las sesiones de la versión anterior.
    await db.collection("usuarios").updateMany({ versionSesion: { $exists: true } }, { $unset: { versionSesion: "" } });
    await Usuario.createIndexes();
    await Rol.createIndexes();
    await UsuarioTieneRol.createIndexes();
    for (const rol of rolesIniciales) {
        await Rol.updateOne({ _id: rol._id }, { $setOnInsert: rol }, { upsert: true, runValidators: true });
    }
}

module.exports = { prepararColeccionesAuth, definiciones };
