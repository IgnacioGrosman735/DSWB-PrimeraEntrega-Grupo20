const Tecnico = require("../models/Tecnico");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");

// Notas - Andrea | Inicio | Validaciones de entrada de observaciones trasladadas a middleware
// middleware/validaciones/observaciones.js comprueba IDs, fecha, textos y nivel de alerta.
// Notas - Andrea | Fin | Validaciones de entrada de observaciones trasladadas a middleware

const obtenerObservaciones = async (req, res, next) => {
    try {
        if (req.query.tecnicoId !== undefined) {
            // Notas - Andrea | Inicio | Filtro de técnico validado por middleware
            const id = Number(req.query.tecnicoId);
            // Notas - Andrea | Fin | Filtro de técnico validado por middleware
            if (!await Tecnico.findById(id)) {
                return res.status(404).json({ mensaje: "El técnico no existe" });
            }
            return res.json(await Observacion.find({ tecnicoId: id }));
        }
        res.json(await Observacion.find());
    } catch (error) {
        next(error);
    }
};

const obtenerObservacionPorId = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        const observacion = await Observacion.findById(id);
        if (!observacion) {
            return res.status(404).json({ mensaje: "La observación no existe" });
        }
        res.json(observacion);
    } catch (error) {
        next(error);
    }
};

const crearObservacion = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | Crear observaciones con entrada validada por middleware
        const { _id: id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta } = req.body || {};
        // Las comprobaciones de duplicados y relaciones permanecen en el controlador.
        // Notas - Andrea | Fin | Crear observaciones con entrada validada por middleware
        if (await Observacion.findById(id)) {
            return res.status(400).json({ mensaje: "Ya existe una observación con ese ID" });
        }
        if (!await Lote.findById(loteId)) {
            return res.status(400).json({ mensaje: "El lote no existe" });
        }
        if (!await Tecnico.findById(tecnicoId)) {
            return res.status(400).json({ mensaje: "El técnico no existe" });
        }
        if (!await TipoCultivo.findById(tipoCultivoId)) {
            return res.status(400).json({ mensaje: "El tipo de cultivo no existe" });
        }
        const creado = await new Observacion({
            _id: id,
            loteId,
            tecnicoId,
            fecha,
            tipoCultivoId,
            estadoCultivo,
            observaciones,
            nivelAlerta
        }).save();
        res.status(201).json({ mensaje: "Observación registrada", observacion: creado });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerObservaciones,
    obtenerObservacionPorId,
    crearObservacion
};
