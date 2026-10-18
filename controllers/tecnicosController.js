const Tecnico = require("../models/Tecnico");
const Observacion = require("../models/Observacion");
const Lote = require("../models/Lote");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");
const { cuentaIngenieroValida } = require("../services/cuentaIngeniero");
const { crearAcceso } = require("../services/crearAcceso");

// Notas - Andrea | Inicio | Carga de técnico antes de validar su actualización
const cargarTecnico = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        const tecnico = await Tecnico.findById(id);
        if (!tecnico) {
            return res.status(404).json({ mensaje: "El técnico no existe" });
        }
        res.locals.tecnico = tecnico;
        next();
    } catch (error) {
        next(error);
    }
};
// Notas - Andrea | Fin | Carga de técnico antes de validar su actualización

const obtenerTecnicos = async (req, res, next) => {
    try {
        res.json(await Tecnico.find());
    } catch (error) {
        next(error);
    }
};

const obtenerTecnicoPorId = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        const tecnico = await Tecnico.findById(id);
        if (!tecnico) {
            return res.status(404).json({ mensaje: "El técnico no existe" });
        }
        res.json(tecnico);
    } catch (error) {
        next(error);
    }
};

const crearTecnico = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | Datos de creación validados por middleware
        const { _id: id, nombre } = req.body || {};
        // Notas - Andrea | Fin | Datos de creación validados por middleware
        if (await Tecnico.findById(id)) {
            return res.status(400).json({ mensaje: "Ya existe un técnico con ese ID" });
        }
        const creado = await crearAcceso(new Tecnico({ _id: id, nombre }), "Ingeniero", req.body);
        res.status(201).json({ mensaje: "Técnico creado", tecnico: creado });
    } catch (error) {
        next(error);
    }
};

// Notas - Andrea | Inicio | Actualización de técnico cargado y validado
const actualizarTecnico = async (req, res, next) => {
    try {
        const tecnico = res.locals.tecnico;
        const datos = req.body || {};
        tecnico.nombre = datos.nombre;
        if (datos.usuario || datos.password || datos.cuentaId !== undefined) {
            if (datos.usuarioId) return res.status(400).json({ mensaje: "Elegí una cuenta existente o creá una nueva, no ambas" });
            tecnico.nombre = datos.nombre;
            await crearAcceso(tecnico, "Ingeniero", datos);
            return res.json({ mensaje: "Técnico y acceso actualizados", tecnico });

        }
        if (datos.usuarioId !== undefined) {
            const usuarioId = datos.usuarioId === "" ? null : datos.usuarioId;
            if (!await cuentaIngenieroValida(usuarioId)) {
                return res.status(400).json({ mensaje: "Seleccioná una cuenta activa con rol Ingeniero" });
            }
            tecnico.usuarioId = usuarioId || undefined;
        }
        tecnico.nombre = datos.nombre;
        await tecnico.save();
        res.json({ mensaje: "Técnico actualizado", tecnico });
    } catch (error) {
        next(error);
    }
};
// Notas - Andrea | Fin | Actualización de técnico cargado y validado

const eliminarTecnico = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        if (!await Tecnico.findById(id)) {
            return res.status(404).json({ mensaje: "El técnico no existe" });
        }
        if (await Observacion.findOne({ tecnicoId: id })) {
            return res.status(400).json({ mensaje: "No se puede eliminar el técnico porque posee observaciones registradas" });
        }
        if (await TecnicoTieneLote.exists({ tecnicoId: id })) {
            return res.status(400).json({ mensaje: "Primero desasigná los lotes del ingeniero" });
        }
        await Tecnico.deleteOne({ _id: id });
        res.json({ mensaje: "Técnico eliminado" });
    } catch (error) {
        next(error);
    }
};

const mostrarTecnicos = async (req, res, next) => {
    try {
        res.render("tecnicos", { tecnicos: await Tecnico.find(), lotes: await Lote.find().sort({ _id: 1 }), asignaciones: await TecnicoTieneLote.find() });
    } catch (error) {
        next(error);
    }
};

const mostrarTecnico = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        const tecnico = await Tecnico.findById(id);
        if (!tecnico) {
            return res.status(404).render("error", { mensaje: "El técnico no existe" });
        }
        res.render("detalleTecnico", { tecnico });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico,
    // Notas - Andrea | Inicio | Exportación de carga previa del técnico
    cargarTecnico,
    // Notas - Andrea | Fin | Exportación de carga previa del técnico
    actualizarTecnico,
    eliminarTecnico,
    mostrarTecnicos,
    mostrarTecnico
};
