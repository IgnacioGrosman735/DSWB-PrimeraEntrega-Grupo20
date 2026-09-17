const fs = require("fs");
const path = require("path");
const Observacion = require("../models/Observacion");
const Tecnico = require("../models/Tecnico");
const TipoCultivo = require("../models/TipoCultivo");

// Los nombres de archivo se definen en el código, nunca provienen del request.
const leerDatos = (archivo) => JSON.parse(fs.readFileSync(path.join(__dirname, "../data", archivo), "utf-8"));
const leerTecnicos = () => leerDatos("tecnicos.json").map(t => new Tecnico(t.id, t.nombre));
const leerTiposCultivo = () => leerDatos("tiposCultivo.json").map(t => new TipoCultivo(t.id, t.nombre));
const guardarObservaciones = (observaciones) => {
    fs.writeFileSync(path.join(__dirname, "../data/observaciones.json"), JSON.stringify(observaciones, null, 2));
};

const obtenerObservaciones = (req, res) => {
    const observaciones = leerDatos("observaciones.json");
    if (req.query.tecnicoId !== undefined) {
        const id = Number(req.query.tecnicoId);
        if (typeof req.query.tecnicoId !== "string" || !Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ mensaje: "tecnicoId debe ser un entero positivo" });
        }
        if (!leerTecnicos().some(t => t.id === id)) {
            return res.status(404).json({ mensaje: "El técnico no existe" });
        }
        return res.json(observaciones.filter(o => o.tecnicoId === id));
    }
    res.json(observaciones);
};

const obtenerObservacionPorId = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    const observacion = leerDatos("observaciones.json").find(o => o.id === id);
    if (!observacion) {
        return res.status(404).json({ mensaje: "La observación no existe" });
    }
    res.json(observacion);
};

const crearObservacion = (req, res) => {
    const { id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta } = req.body || {};
    if (!Observacion.alertaValida(nivelAlerta)) {
        return res.status(400).json({ mensaje: "El nivel de alerta debe ser Normal, Atención o Crítico" });
    }
    const observacion = new Observacion(id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta);
    if (!observacion.esValida()) {
        return res.status(400).json({
            mensaje: "Se requieren IDs enteros positivos, fecha válida YYYY-MM-DD, estado del cultivo y texto de observaciones no vacíos"
        });
    }
    const registros = leerDatos("observaciones.json");
    if (registros.some(o => o.id === id)) {
        return res.status(400).json({ mensaje: "Ya existe una observación con ese ID" });
    }
    if (!leerDatos("lotes.json").some(lote => lote.id === loteId)) {
        return res.status(400).json({ mensaje: "El lote no existe" });
    }
    if (!leerTecnicos().some(t => t.id === tecnicoId)) {
        return res.status(400).json({ mensaje: "El técnico no existe" });
    }
    if (!leerTiposCultivo().some(t => t.id === tipoCultivoId)) {
        return res.status(400).json({ mensaje: "El tipo de cultivo no existe" });
    }
    registros.push(observacion);
    guardarObservaciones(registros);
    res.status(201).json({ mensaje: "Observación registrada", observacion });
};

module.exports = {
    obtenerObservaciones,
    obtenerObservacionPorId,
    crearObservacion
};
