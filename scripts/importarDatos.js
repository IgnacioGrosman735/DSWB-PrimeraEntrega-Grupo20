const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const conectarDB = require("../config/database");
const Productor = require("../models/Productor");
const Tecnico = require("../models/Tecnico");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");

const importar = async () => {
    try {
        const cargas = [];
        for (const [Modelo, archivo] of [
            [Productor, "productores.json"],
            [Tecnico, "tecnicos.json"],
            [TipoCultivo, "tiposCultivo.json"],
            [Lote, "lotes.json"],
            [Observacion, "observaciones.json"]
        ]) {
            const datos = JSON.parse(fs.readFileSync(path.join(__dirname, "../data", archivo), "utf-8"));
            const documentos = [];
            for (const dato of datos) {
                if (!Number.isSafeInteger(dato.id) || dato.id <= 0 || documentos.some(documento => documento._id === dato.id)) {
                    throw new Error("Datos inválidos o IDs repetidos en " + archivo);
                }
                for (const campo of ["hectareas", "loteId", "tecnicoId", "tipoCultivoId", "productorId"]) {
                    if (dato[campo] !== undefined && (typeof dato[campo] !== "number" || !Number.isFinite(dato[campo]))) {
                        throw new Error("Valor numérico inválido en " + archivo);
                    }
                }
                const { id, ...campos } = dato;
                const documento = new Modelo({ _id: id, ...campos });
                await documento.validate();
                documentos.push(documento);
            }
            cargas.push({ Modelo, documentos });
        }
        const [productores, tecnicos, cultivos, lotes, observaciones] = cargas;
        for (const lote of lotes.documentos) {
            if (!productores.documentos.some(productor => productor._id === lote.productorId) ||
                !cultivos.documentos.some(cultivo => cultivo._id === lote.tipoCultivoId)) {
                throw new Error("Relación inválida en lotes.json");
            }
        }
        for (const observacion of observaciones.documentos) {
            if (!lotes.documentos.some(lote => lote._id === observacion.loteId) ||
                !tecnicos.documentos.some(tecnico => tecnico._id === observacion.tecnicoId) ||
                !cultivos.documentos.some(cultivo => cultivo._id === observacion.tipoCultivoId)) {
                throw new Error("Relación inválida en observaciones.json");
            }
        }
        await conectarDB();
        for (const { Modelo } of cargas) {
            if (await Modelo.findOne()) {
                throw new Error("Importación cancelada: las cinco colecciones deben estar vacías");
            }
        }
        for (const { Modelo, documentos } of cargas) {
            for (const documento of documentos) {
                await documento.save();
            }
            console.log(Modelo.collection.name + ": " + documentos.length + " documentos importados");
        }
    } catch (error) {
        console.error("No se completó la importación:", error.message);
        console.error("Si falló durante la escritura, revisar la carga parcial antes de repetir.");
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

importar();
