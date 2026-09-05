const fs = require("fs");
const path = require("path");

const Lote = require("../models/Lote");

const rutaArchivo = path.join(__dirname, "../data/lotes.json");

// función leer archivo
const leerLotes = () => {
    const data = fs.readFileSync(rutaArchivo, "utf-8");

    return JSON.parse(data);

};

// función guardar archivo
const guardarLotes = (lotes) => {

    fs.writeFileSync(
        rutaArchivo,
        JSON.stringify(lotes, null, 2)
    );

};

// GET ALL
const obtenerLotes = (req, res) => {

    const lotes = leerLotes();

    res.json(lotes);

};

// GET BY ID
const obtenerLotePorId = (req, res) => {

    const lotes = leerLotes();

    const id = parseInt(req.params.id);

    const lote = lotes.find(p => p.id === id);

    if (!lote) {

        return res.status(404).json({
            mensaje: "Lote no encontrado"
        });

    }

    res.json(lote);

};


// CREATE
const crearLote = (req, res) => {

    const lotes = leerLotes();

    const { id, hectareas, cultivo, productor, ubicacion } = req.body;

    const nuevoLote = new Lote(id, hectareas, cultivo, productor, ubicacion);

    lotes.push(nuevoLote);

    guardarLotes(lotes);

    res.status(201).json({
        mensaje: "Lote creado",
        lote: nuevoLote
    });

};


// UPDATE
const actualizarLote = (req, res) => {

    const lotes = leerLotes();

    const id = parseInt(req.params.id);

    const lote = lotes.find(p => p.id === id);

    if (!lote) {

        return res.status(404).json({
            mensaje: "Lote no encontrado"
        });

    }

    const { hectareas, cultivo, productor, ubicacion } = req.body;

    lote.hectareas = hectareas ?? lote.hectareas;
    lote.cultivo = cultivo ?? lote.cultivo;
    lote.productor = productor ?? lote.productor;
    lote.ubicacion = ubicacion ?? lote.ubicacion;

    guardarLotes(lotes);

    res.json({
        mensaje: "Lote actualizado",
        lote
    });

};


// DELETE
const eliminarLote = (req, res) => {

    const lotes = leerLotes();

    const id = parseInt(req.params.id);

    const nuevosLotes = lotes.filter(p => p.id !== id);

    if (lotes.length === nuevosLotes.length) {

        return res.status(404).json({
            mensaje: "Lote no encontrado"
        });

    }

    guardarLotes(nuevosLotes);

    res.json({
        mensaje: "Lote eliminado"
    });

};

module.exports = {

    obtenerLotes,
    obtenerLotePorId,
    crearLote,
    actualizarLote,
    eliminarLote

};