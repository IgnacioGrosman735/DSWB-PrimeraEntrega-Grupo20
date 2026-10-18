const Tecnico = require("../models/Tecnico");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");
const { cuentaIngenieroValida } = require("../services/cuentaIngeniero");

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
        const { _id: id, loteId, tecnicoId, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta } = req.body || {};
        if (req.body?.estado !== undefined && !["Pendiente", "Cargada"].includes(req.body.estado)) {
            return res.status(400).json({ mensaje: "El estado debe ser Pendiente o Cargada" });
        }
        const fecha = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Argentina/Buenos_Aires",
            year: "numeric", month: "2-digit", day: "2-digit"
        }).format(new Date());
        if (!alertaValida(nivelAlerta)) {
            return res.status(400).json({ mensaje: "El nivel de alerta debe ser Normal, Atención o Crítico" });
        }
        const observacion = { _id: id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta };
        if (!datosValidos(observacion)) {
            return res.status(400).json({
                mensaje: "Se requieren IDs enteros positivos, estado del cultivo y texto de observaciones no vacíos"
            });
        }
        if (await Observacion.findById(id)) {
            return res.status(400).json({ mensaje: "Ya existe una observación con ese ID" });
        }
        const lote = await Lote.findById(loteId);
        if (!lote) {
            return res.status(400).json({ mensaje: "El lote no existe" });
        }
        const tecnico = await Tecnico.findById(tecnicoId);
        if (!tecnico) {
            return res.status(400).json({ mensaje: "El técnico no existe" });
        }
        if (!await TipoCultivo.findById(tipoCultivoId)) {
            return res.status(400).json({ mensaje: "El tipo de cultivo no existe" });
        }
        if (!tecnico.usuarioId || !await cuentaIngenieroValida(tecnico.usuarioId)) {
            return res.status(400).json({ mensaje: "El técnico debe tener una cuenta activa con rol Ingeniero" });
        }
        if (!await TecnicoTieneLote.exists({ tecnicoId, loteId })) {
            return res.status(400).json({ mensaje: "El ingeniero no tiene asignado este lote" });
        }
        if (lote.tipoCultivoId !== tipoCultivoId) {
            return res.status(400).json({ mensaje: "El cultivo debe coincidir con el cultivo actual del lote" });
        }
        const creado = await new Observacion({
            _id: id,
            loteId,
            tecnicoId,
            fecha,
            tipoCultivoId,
            estadoCultivo,
            observaciones,
            nivelAlerta,
            estado: "Cargada"
        }).save();
        res.status(201).json({ mensaje: "Observación registrada", observacion: creado });
    } catch (error) {
        next(error);
    }
};

async function buscarIngeniero(id) {
    if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error("ID de ingeniero inválido"), { status: 400 });
    const tecnico = await Tecnico.findById(id);
    if (!tecnico) throw Object.assign(new Error("Ingeniero no encontrado"), { status: 404 });
    if (!tecnico.usuarioId || !await cuentaIngenieroValida(tecnico.usuarioId)) {
        throw Object.assign(new Error("La ficha debe tener una cuenta activa con rol Ingeniero"), { status: 400 });
    }
    return tecnico;
}
async function mostrarLotesIngeniero(req, res, next) {
    try {
        const tecnico = await buscarIngeniero(Number(req.params.tecnicoId));
        const relaciones = await TecnicoTieneLote.find({ tecnicoId: tecnico._id });
        const lotes = await Lote.find({ _id: { $in: relaciones.map(r => r.loteId) } }).populate("tipoCultivoId").sort({ _id: 1 });
        res.render("lotesIngeniero", { tecnico, lotes });
    } catch (error) {
        if (error.status) return res.status(error.status).render("error", { mensaje: error.message });
        next(error);
    }
}
async function mostrarPantallaObservaciones(req, res, next, verHistorial) {
    try {
        const tecnico = await buscarIngeniero(Number(req.params.tecnicoId));
        const loteId = Number(req.params.loteId);
        if (!Number.isSafeInteger(loteId) || loteId <= 0) return res.status(400).render("error", { mensaje: "ID de lote inválido" });
        const lote = await Lote.findById(loteId).populate("tipoCultivoId");
        if (!lote) return res.status(404).render("error", { mensaje: "Lote no encontrado" });
        if (!await TecnicoTieneLote.exists({ tecnicoId: tecnico._id, loteId })) {
            return res.status(400).render("error", { mensaje: "El ingeniero no tiene asignado este lote" });
        }
        if (verHistorial) {
            const historial = await Observacion.find({ loteId, tecnicoId: tecnico._id }).populate("tecnicoId").populate("tipoCultivoId").sort({ fecha: -1, _id: -1 });
            return res.render("historialObservaciones", { tecnico, lote, historial });
        }
        if (!lote.tipoCultivoId) return res.status(400).render("error", { mensaje: "El lote no tiene un cultivo válido" });
        res.render("cargarObservacion", { tecnico, lote });
    } catch (error) {
        if (error.status) return res.status(error.status).render("error", { mensaje: error.message });
        next(error);
    }
}
const mostrarCargaObservacion = (req, res, next) => mostrarPantallaObservaciones(req, res, next, false);
const mostrarHistorialObservaciones = (req, res, next) => mostrarPantallaObservaciones(req, res, next, true);

module.exports = {
    mostrarHistorialObservaciones,
    mostrarLotesIngeniero,
    mostrarCargaObservacion,
    obtenerObservaciones,
    obtenerObservacionPorId,
    crearObservacion
};
