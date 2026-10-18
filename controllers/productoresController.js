const Productor = require("../models/Productor");
const Lote = require("../models/Lote");
const { crearAcceso } = require("../services/crearAcceso");

// Notas - Andrea | Inicio | Cargar productor antes de validar la actualización
const cargarProductor = async (req, res, next) => {
    try {
        const productor = await Productor.findById(Number(req.params.id));
        if (!productor) {
            return res.status(404).json({ mensaje: "El productor no existe" });
        }
        res.locals.productor = productor;
        next();
    } catch (error) {
        next(error);
    }
};
// Notas - Andrea | Fin | Cargar productor antes de validar la actualización

const obtenerProductores = async (req, res, next) => {
    try {
        res.json(await Productor.find());
    } catch (error) {
        next(error);
    }
};

const obtenerProductorPorId = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        const productor = await Productor.findById(id);
        if (!productor) {
            return res.status(404).json({ mensaje: "El productor no existe" });
        }
        res.json(productor);
    } catch (error) {
        next(error);
    }
};

// Notas - Andrea | Inicio | Crear productor con entrada validada por middleware
const crearProductor = async (req, res, next) => {
    try {
        const { _id: id, nombre } = req.body || {};
        if (await Productor.findById(id)) {
            return res.status(400).json({ mensaje: "Ya existe un productor con ese ID" });
        }
        const creado = await crearAcceso(new Productor({ _id: id, nombre }), "Cliente", req.body);
        res.status(201).json({ mensaje: "Productor creado", productor: creado });
    } catch (error) {
        next(error);
    }
};
// Notas - Andrea | Fin | Crear productor con entrada validada por middleware

// Notas - Andrea | Inicio | Actualizar productor cargado con entrada validada
const actualizarProductor = async (req, res, next) => {
    try {
        const productor = res.locals.productor;
        const datos = req.body || {};
        productor.nombre = datos.nombre;
        if (datos.usuario || datos.password || datos.cuentaId !== undefined) {
            await crearAcceso(productor, "Cliente", datos);
            return res.json({ mensaje: "Cliente y acceso actualizados", productor });
        }
        await productor.save();
        res.json({ mensaje: "Productor actualizado", productor });
    } catch (error) {
        next(error);
    }
};
// Notas - Andrea | Fin | Actualizar productor cargado con entrada validada

const eliminarProductor = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        if (!await Productor.findById(id)) {
            return res.status(404).json({ mensaje: "El productor no existe" });
        }
        if (await Lote.findOne({ productorId: id })) {
            return res.status(400).json({ mensaje: "No se puede eliminar el productor porque posee lotes asociados" });
        }
        await Productor.deleteOne({ _id: id });
        res.json({ mensaje: "Productor eliminado" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Notas - Andrea | Inicio | Exportar la carga previa de productores
    cargarProductor,
    // Notas - Andrea | Fin | Exportar la carga previa de productores
    obtenerProductores,
    obtenerProductorPorId,
    crearProductor,
    actualizarProductor,
    eliminarProductor
};
