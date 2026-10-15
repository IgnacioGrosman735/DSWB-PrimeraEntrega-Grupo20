const Tecnico = require("../models/Tecnico");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");

const alertaValida = nivel => ["Normal", "Atención", "Crítico"].includes(nivel);

const datosValidos = (datos) => {
    if (typeof datos.fecha !== "string") {
        return false;
    }

    const fecha = new Date(datos.fecha);

    return (
        Number.isSafeInteger(datos._id) && datos._id > 0 &&
        Number.isSafeInteger(datos.loteId) && datos.loteId > 0 &&
        Number.isSafeInteger(datos.tecnicoId) && datos.tecnicoId > 0 &&
        Number.isSafeInteger(datos.tipoCultivoId) && datos.tipoCultivoId > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) &&
        !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === datos.fecha &&
        typeof datos.estadoCultivo === "string" && datos.estadoCultivo.trim() !== "" &&
        typeof datos.observaciones === "string" && datos.observaciones.trim() !== "" &&
        alertaValida(datos.nivelAlerta)
    );
};

const obtenerObservaciones = async (req, res, next) => {
    try {
        if (req.query.tecnicoId !== undefined) {
            const id = Number(req.query.tecnicoId);
            if (typeof req.query.tecnicoId !== "string" || !Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({ mensaje: "tecnicoId debe ser un entero positivo" });
            }
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
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
        }
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
        const { _id: id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta } = req.body || {};
        if (!alertaValida(nivelAlerta)) {
            return res.status(400).json({ mensaje: "El nivel de alerta debe ser Normal, Atención o Crítico" });
        }
        const observacion = { _id: id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta };
        if (!datosValidos(observacion)) {
            return res.status(400).json({
                mensaje: "Se requieren IDs enteros positivos, fecha válida YYYY-MM-DD, estado del cultivo y texto de observaciones no vacíos"
            });
        }
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
