const fs = require("fs");
const path = require("path");

const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");
const TipoCultivo = require("../models/TipoCultivo");

const rutaArchivo = path.join(__dirname, "../data/lotes.json");
const leerProductores = () => JSON.parse(fs.readFileSync(path.join(__dirname, "../data/productores.json"), "utf-8"));
const leerTiposCultivo = () => JSON.parse(fs.readFileSync(path.join(__dirname, "../data/tiposCultivo.json"), "utf-8"))
    .map(tipo => new TipoCultivo(tipo.id, tipo.nombre));
const leerObservaciones = () => JSON.parse(fs.readFileSync(path.join(__dirname, "../data/observaciones.json"), "utf-8"));

// Leer y guardar lotes en JSON.
const leerLotes = () => {
    const data = fs.readFileSync(rutaArchivo, "utf-8");

    return JSON.parse(data);
};

const guardarLotes = (lotes) => {
    fs.writeFileSync(
        rutaArchivo,
        JSON.stringify(lotes, null, 2)
    );
};

// GET /lotes
const obtenerLotes = (req, res) => {
    const lotes = leerLotes();

    if (req.query.alerta !== undefined) {
        if (!Observacion.alertaValida(req.query.alerta)) {
            return res.status(400).json({ mensaje: "El nivel de alerta debe ser Normal, Atención o Crítico" });
        }
        const observaciones = leerObservaciones();
        return res.json(lotes.filter(lote => observaciones.some(o =>
            o.loteId === lote.id && o.nivelAlerta === req.query.alerta
        )));
    }

    res.json(lotes);
};

// GET /lotes/:id
const obtenerLotePorId = (req, res) => {
    const lotes = leerLotes();

    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }

    const lote = lotes.find(p => p.id === id);

    if (!lote) {
        return res.status(404).json({
            mensaje: "Lote no encontrado"
        });
    }

    res.json(lote);
};

// POST /lotes
const crearLote = (req, res) => {
    const lotes = leerLotes();

    const { id, hectareas, tipoCultivoId, productorId, ubicacion } = req.body || {};

    const nuevoLote = new Lote(id, hectareas, tipoCultivoId, productorId, ubicacion);

    if (!nuevoLote.esValido()) {
        return res.status(400).json({
            mensaje: "Se requieren IDs enteros positivos, hectáreas numéricas mayores que cero y ubicación no vacía"
        });
    }
    if (lotes.some(lote => lote.id === id)) {
        return res.status(400).json({ mensaje: "Ya existe un lote con ese ID" });
    }
    if (!leerProductores().some(p => p.id === productorId)) {
        return res.status(400).json({ mensaje: "El productor no existe" });
    }
    if (!leerTiposCultivo().some(t => t.id === tipoCultivoId)) {
        return res.status(400).json({ mensaje: "El tipo de cultivo no existe" });
    }

    lotes.push(nuevoLote);

    guardarLotes(lotes);

    res.status(201).json({
        mensaje: "Lote creado",
        lote: nuevoLote
    });
};

// PUT /lotes/:id
const actualizarLote = (req, res) => {
    const lotes = leerLotes();

    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }

    const lote = lotes.find(p => p.id === id);

    if (!lote) {
        return res.status(404).json({
            mensaje: "Lote no encontrado"
        });
    }

    const datos = req.body;
    if (!datos || Array.isArray(datos) || typeof datos !== "object" ||
        !["hectareas", "tipoCultivoId", "productorId", "ubicacion"].some(campo => datos[campo] !== undefined) ||
        (datos.id !== undefined && datos.id !== id)) {
        return res.status(400).json({ mensaje: "Envíe campos del lote para actualizar; el ID no se puede cambiar" });
    }

    const actualizado = new Lote(
        id,
        datos.hectareas !== undefined ? datos.hectareas : lote.hectareas,
        datos.tipoCultivoId !== undefined ? datos.tipoCultivoId : lote.tipoCultivoId,
        datos.productorId !== undefined ? datos.productorId : lote.productorId,
        datos.ubicacion !== undefined ? datos.ubicacion : lote.ubicacion
    );
    if (!actualizado.esValido()) {
        return res.status(400).json({ mensaje: "Los datos del lote son inválidos" });
    }
    if (!leerProductores().some(p => p.id === actualizado.productorId)) {
        return res.status(400).json({ mensaje: "El productor no existe" });
    }
    if (!leerTiposCultivo().some(t => t.id === actualizado.tipoCultivoId)) {
        return res.status(400).json({ mensaje: "El tipo de cultivo no existe" });
    }
    Object.assign(lote, actualizado);

    guardarLotes(lotes);

    res.json({
        mensaje: "Lote actualizado",
        lote
    });
};

// DELETE /lotes/:id
const eliminarLote = (req, res) => {
    const lotes = leerLotes();

    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }

    const nuevosLotes = lotes.filter(p => p.id !== id);

    if (lotes.length === nuevosLotes.length) {
        return res.status(404).json({
            mensaje: "Lote no encontrado"
        });
    }

    if (leerObservaciones().some(o => o.loteId === id)) {
        return res.status(400).json({
            mensaje: "No se puede eliminar el lote porque posee observaciones en su historial"
        });
    }

    guardarLotes(nuevosLotes);

    res.json({
        mensaje: "Lote eliminado"
    });
};

// Vistas web: comparten la lectura JSON con el CRUD.
const mostrarLotes = (req, res) => {
    res.render("lotes", { lotes: leerLotes() });
};

const mostrarLote = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).render("error", { mensaje: "El ID debe ser un entero positivo" });
    }
    const datos = leerLotes().find(lote => lote.id === id);
    if (!datos) {
        return res.status(404).render("error", { mensaje: "Lote no encontrado" });
    }
    const productor = leerProductores().find(p => p.id === datos.productorId);
    const tipoCultivo = leerTiposCultivo().find(t => t.id === datos.tipoCultivoId);
    res.render("detalleLote", { lote: datos, productor, tipoCultivo });
};

const obtenerHistorial = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    if (!leerLotes().some(lote => lote.id === id)) {
        return res.status(404).json({ mensaje: "Lote no encontrado" });
    }
    res.json(leerObservaciones().filter(o => o.loteId === id));
};

module.exports = {
    obtenerLotes,
    obtenerLotePorId,
    crearLote,
    actualizarLote,
    eliminarLote,
    obtenerHistorial,
    mostrarLotes,
    mostrarLote
};
