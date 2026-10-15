const Tecnico = require("../models/Tecnico");
const Observacion = require("../models/Observacion");

const datosValidos = (datos) => {
    return Number.isSafeInteger(datos._id) && datos._id > 0 &&
        typeof datos.nombre === "string" && datos.nombre.trim() !== "";
};

const obtenerTecnicos = async (req, res, next) => {
    try {
        res.json(await Tecnico.find());
    } catch (error) {
        next(error);
    }
};

const obtenerTecnicoPorId = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
        }
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
        const { _id: id, nombre } = req.body || {};
        const tecnico = { _id: id, nombre };
        if (!datosValidos(tecnico)) {
            return res.status(400).json({ mensaje: "Se requiere un ID entero positivo y un nombre no vacío" });
        }
        if (await Tecnico.findById(id)) {
            return res.status(400).json({ mensaje: "Ya existe un técnico con ese ID" });
        }
        const creado = await new Tecnico({ _id: id, nombre }).save();
        res.status(201).json({ mensaje: "Técnico creado", tecnico: creado });
    } catch (error) {
        next(error);
    }
};

const actualizarTecnico = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
        }
        const tecnico = await Tecnico.findById(id);
        if (!tecnico) {
            return res.status(404).json({ mensaje: "El técnico no existe" });
        }
        const datos = req.body || {};
        const actualizado = { _id: id, nombre: datos.nombre };
        if (!datosValidos(actualizado) || (datos._id !== undefined && datos._id !== id)) {
            return res.status(400).json({ mensaje: "Se requiere un nombre no vacío; el ID no se puede cambiar" });
        }
        tecnico.nombre = actualizado.nombre;
        await tecnico.save();
        res.json({ mensaje: "Técnico actualizado", tecnico });
    } catch (error) {
        next(error);
    }
};

const eliminarTecnico = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
        }
        if (!await Tecnico.findById(id)) {
            return res.status(404).json({ mensaje: "El técnico no existe" });
        }
        if (await Observacion.findOne({ tecnicoId: id })) {
            return res.status(400).json({ mensaje: "No se puede eliminar el técnico porque posee observaciones registradas" });
        }
        await Tecnico.deleteOne({ _id: id });
        res.json({ mensaje: "Técnico eliminado" });
    } catch (error) {
        next(error);
    }
};

const mostrarTecnicos = async (req, res, next) => {
    try {
        res.render("tecnicos", { tecnicos: await Tecnico.find() });
    } catch (error) {
        next(error);
    }
};

const mostrarTecnico = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).render("error", { mensaje: "El ID debe ser un entero positivo" });
        }
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
    actualizarTecnico,
    eliminarTecnico,
    mostrarTecnicos,
    mostrarTecnico
};
