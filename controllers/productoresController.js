const Productor = require("../models/Productor");
const Lote = require("../models/Lote");
const { crearAcceso } = require("../services/crearAcceso");

const datosValidos = (datos) => {
    return Number.isSafeInteger(datos._id) && datos._id > 0 &&
        typeof datos.nombre === "string" && datos.nombre.trim() !== "";
};

const obtenerProductores = async (req, res, next) => {
    try {
        res.json(await Productor.find());
    } catch (error) {
        next(error);
    }
};

const obtenerProductorPorId = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
        }
        const productor = await Productor.findById(id);
        if (!productor) {
            return res.status(404).json({ mensaje: "El productor no existe" });
        }
        res.json(productor);
    } catch (error) {
        next(error);
    }
};

const crearProductor = async (req, res, next) => {
    try {
        const { _id: id, nombre } = req.body || {};
        const productor = { _id: id, nombre };
        if (!datosValidos(productor)) {
            return res.status(400).json({ mensaje: "Se requiere un ID entero positivo y un nombre no vacío" });
        }
        if (await Productor.findById(id)) {
            return res.status(400).json({ mensaje: "Ya existe un productor con ese ID" });
        }
        const creado = await crearAcceso(new Productor({ _id: id, nombre }), "Cliente", req.body);
        res.status(201).json({ mensaje: "Productor creado", productor: creado });
    } catch (error) {
        next(error);
    }
};

const actualizarProductor = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
        }
        const productor = await Productor.findById(id);
        if (!productor) {
            return res.status(404).json({ mensaje: "El productor no existe" });
        }
        const datos = req.body || {};
        const actualizado = { _id: id, nombre: datos.nombre };
        if (!datosValidos(actualizado) || (datos._id !== undefined && datos._id !== id)) {
            return res.status(400).json({ mensaje: "Se requiere un nombre no vacío; el ID no se puede cambiar" });
        }
        productor.nombre = actualizado.nombre;
        if (datos.usuario || datos.password || datos.cuentaId !== undefined || datos.relacionRolId !== undefined) {
            await crearAcceso(productor, "Cliente", datos);
            return res.json({ mensaje: "Cliente y acceso actualizados", productor });
        }
        await productor.save();
        res.json({ mensaje: "Productor actualizado", productor });
    } catch (error) {
        next(error);
    }
};

const eliminarProductor = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
        }
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
    obtenerProductores,
    obtenerProductorPorId,
    crearProductor,
    actualizarProductor,
    eliminarProductor
};
