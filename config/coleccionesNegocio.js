const id = {
    bsonType: ["int", "long", "double"],
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
    multipleOf: 1
};
const texto = { bsonType: "string", minLength: 1, pattern: "\\S" };
const idOpcional = { anyOf: [id, { bsonType: "null" }] };
const simple = {
    bsonType: "object",
    required: ["_id", "nombre"],
    properties: { _id: id, nombre: texto }
};
const esquemas = {
    tecnico_tiene_lotes: {
        bsonType: "object",
        additionalProperties: false,
        required: ["_id", "tecnicoId", "loteId"],
        properties: { _id: id, tecnicoId: id, loteId: id }
    },
    productores: { ...simple, properties: { ...simple.properties, usuarioId: id } },
    tecnicos: { ...simple, properties: { ...simple.properties, usuarioId: id } },
    tiposCultivo: simple,
    lotes: {
        not: { required: ["tecnicoId"] },
        bsonType: "object",
        required: ["_id", "ubicacion", "hectareas", "tipoCultivoId"],
        properties: {
            _id: id,
            ubicacion: texto,
            hectareas: {
                bsonType: ["int", "long", "double"],
                minimum: 0.000001,
                maximum: Number.MAX_VALUE
            },
            tipoCultivoId: id,
            productorId: idOpcional
        }
    },
    observaciones: {
        bsonType: "object",
        required: [
            "_id",
            "loteId",
            "tecnicoId",
            "tipoCultivoId",
            "fecha",
            "estadoCultivo",
            "observaciones",
            "nivelAlerta"
        ],
        properties: {
            _id: id,
            loteId: id,
            tecnicoId: id,
            tipoCultivoId: id,
            fecha: { bsonType: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            estadoCultivo: texto,
            observaciones: texto,
            // Opcional en Mongo para conservar los documentos históricos sin este campo.
            estado: { enum: ["Pendiente", "Cargada"] },
            nivelAlerta: { enum: ["Normal", "Atención", "Crítico"] }
        }
    }
};
const validadores = Object.fromEntries(
    Object.entries(esquemas).map(([nombre, esquema]) => [nombre, { $jsonSchema: esquema }])
);
async function prepararColeccionesNegocio(db) {
    for (const [nombre, validator] of Object.entries(validadores)) {
        const invalidos = await db.collection(nombre).countDocuments({ $nor: [validator] });
        if (invalidos)
            throw new Error(
                nombre +
                    ": hay " +
                    invalidos +
                    " documentos inválidos; corregirlos antes de preparar las validaciones"
            );
    }
    for (const [nombre, validator] of Object.entries(validadores)) {
        const opciones = { validator, validationLevel: "strict", validationAction: "error" };
        if (await db.listCollections({ name: nombre }, { nameOnly: true }).hasNext()) {
            await db.command({ collMod: nombre, ...opciones });
        } else {
            await db.createCollection(nombre, opciones);
        }
    }
    await require("../models/TecnicoTieneLote").createIndexes();
    await require("../models/Productor").createIndexes();
}
module.exports = { prepararColeccionesNegocio, validadores };
