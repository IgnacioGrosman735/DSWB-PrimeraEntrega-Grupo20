const fs = require("fs");
const path = require("path");
const Tecnico = require("../models/Tecnico");

const rutaArchivo = path.join(__dirname, "../data/tecnicos.json");
const leerTecnicos = () => JSON.parse(fs.readFileSync(rutaArchivo, "utf-8"));
const guardarTecnicos = (tecnicos) => {
    fs.writeFileSync(rutaArchivo, JSON.stringify(tecnicos, null, 2));
};

const obtenerTecnicos = (req, res) => {
    res.json(leerTecnicos());
};

const obtenerTecnicoPorId = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    const tecnico = leerTecnicos().find(t => t.id === id);
    if (!tecnico) {
        return res.status(404).json({ mensaje: "El técnico no existe" });
    }
    res.json(tecnico);
};

const crearTecnico = (req, res) => {
    const { id, nombre } = req.body || {};
    const tecnico = new Tecnico(id, nombre);
    if (!tecnico.esValido()) {
        return res.status(400).json({ mensaje: "Se requiere un ID entero positivo y un nombre no vacío" });
    }
    const tecnicos = leerTecnicos();
    if (tecnicos.some(t => t.id === id)) {
        return res.status(400).json({ mensaje: "Ya existe un técnico con ese ID" });
    }
    tecnicos.push(tecnico);
    guardarTecnicos(tecnicos);
    res.status(201).json({ mensaje: "Técnico creado", tecnico });
};

const actualizarTecnico = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    const tecnicos = leerTecnicos();
    const tecnico = tecnicos.find(t => t.id === id);
    if (!tecnico) {
        return res.status(404).json({ mensaje: "El técnico no existe" });
    }
    const datos = req.body || {};
    const actualizado = new Tecnico(id, datos.nombre);
    if (!actualizado.esValido() || (datos.id !== undefined && datos.id !== id)) {
        return res.status(400).json({ mensaje: "Se requiere un nombre no vacío; el ID no se puede cambiar" });
    }
    tecnico.nombre = actualizado.nombre;
    guardarTecnicos(tecnicos);
    res.json({ mensaje: "Técnico actualizado", tecnico });
};

const eliminarTecnico = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    const tecnicos = leerTecnicos();
    if (!tecnicos.some(t => t.id === id)) {
        return res.status(404).json({ mensaje: "El técnico no existe" });
    }
    // Un técnico con observaciones registradas no se elimina: quedarían huérfanas.
    const observaciones = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/observaciones.json"), "utf-8"));
    if (observaciones.some(o => o.tecnicoId === id)) {
        return res.status(400).json({ mensaje: "No se puede eliminar el técnico porque posee observaciones registradas" });
    }
    guardarTecnicos(tecnicos.filter(t => t.id !== id));
    res.json({ mensaje: "Técnico eliminado" });
};

module.exports = {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico,
    actualizarTecnico,
    eliminarTecnico
};
