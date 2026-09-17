const fs = require("fs");
const path = require("path");
const Productor = require("../models/Productor");

const rutaArchivo = path.join(__dirname, "../data/productores.json");
const leerProductores = () => JSON.parse(fs.readFileSync(rutaArchivo, "utf-8"));
const guardarProductores = (productores) => {
    fs.writeFileSync(rutaArchivo, JSON.stringify(productores, null, 2));
};

const obtenerProductores = (req, res) => {
    res.json(leerProductores());
};

const obtenerProductorPorId = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    const productor = leerProductores().find(p => p.id === id);
    if (!productor) {
        return res.status(404).json({ mensaje: "El productor no existe" });
    }
    res.json(productor);
};

const crearProductor = (req, res) => {
    const { id, nombre } = req.body || {};
    const productor = new Productor(id, nombre);
    if (!productor.esValido()) {
        return res.status(400).json({ mensaje: "Se requiere un ID entero positivo y un nombre no vacío" });
    }
    const productores = leerProductores();
    if (productores.some(p => p.id === id)) {
        return res.status(400).json({ mensaje: "Ya existe un productor con ese ID" });
    }
    productores.push(productor);
    guardarProductores(productores);
    res.status(201).json({ mensaje: "Productor creado", productor });
};

const actualizarProductor = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    const productores = leerProductores();
    const productor = productores.find(p => p.id === id);
    if (!productor) {
        return res.status(404).json({ mensaje: "El productor no existe" });
    }
    const datos = req.body || {};
    const actualizado = new Productor(id, datos.nombre);
    if (!actualizado.esValido() || (datos.id !== undefined && datos.id !== id)) {
        return res.status(400).json({ mensaje: "Se requiere un nombre no vacío; el ID no se puede cambiar" });
    }
    productor.nombre = actualizado.nombre;
    guardarProductores(productores);
    res.json({ mensaje: "Productor actualizado", productor });
};

const eliminarProductor = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    const productores = leerProductores();
    if (!productores.some(p => p.id === id)) {
        return res.status(404).json({ mensaje: "El productor no existe" });
    }
    const lotes = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/lotes.json"), "utf-8"));
    if (lotes.some(lote => lote.productorId === id)) {
        return res.status(400).json({ mensaje: "No se puede eliminar el productor porque posee lotes asociados" });
    }
    guardarProductores(productores.filter(p => p.id !== id));
    res.json({ mensaje: "Productor eliminado" });
};

module.exports = {
    obtenerProductores,
    obtenerProductorPorId,
    crearProductor,
    actualizarProductor,
    eliminarProductor
};
