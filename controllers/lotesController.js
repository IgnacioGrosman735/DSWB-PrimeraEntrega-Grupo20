const Productor = require("../models/Productor");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");
const Observacion = require("../models/Observacion");

// Notas - Andrea | Inicio | Carga del lote antes de validar la actualización
const cargarLote = async (req, res, next) => {
    try {
        const lote = await Lote.findById(Number(req.params.id));
        if (!lote) {
            return res.status(404).json({ mensaje: "Lote no encontrado" });
        }
        res.locals.lote = lote;
        next();
    } catch (error) {
        next(error);
    }
};
// Notas - Andrea | Fin | Carga del lote antes de validar la actualización

const obtenerLotes = async (req, res, next) => {
    try {
        if (req.query.alerta !== undefined) {
            // Notas - Andrea | Inicio | Filtro de alerta validado por middleware
            // El filtro ya cumple los niveles admitidos antes de consultar el historial.
            // Notas - Andrea | Fin | Filtro de alerta validado por middleware
            // Se considera todo el historial, sin repetir lotes.
            const observaciones = await Observacion.find({ nivelAlerta: req.query.alerta });
            const ids = observaciones.map(observacion => observacion.loteId);
            return res.json(await Lote.find({ _id: { $in: ids } }));
        }
        res.json(await Lote.find());
    } catch (error) {
        next(error);
    }
};

const obtenerLotePorId = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware

        const lote = await Lote.findById(id);

        if (!lote) {
            return res.status(404).json({
                mensaje: "Lote no encontrado"
            });
        }

        res.json(lote);
    } catch (error) {
        next(error);
    }
};

const crearLote = async (req, res, next) => {
    try {
        const { _id: id, hectareas, tipoCultivoId, productorId = null, ubicacion } = req.body || {};
        if (req.body?.tecnicoId !== undefined) return res.status(400).json({ mensaje: "Asigná los ingenieros desde su apartado" });
        const nuevoLote = { _id: id, hectareas, tipoCultivoId, productorId, ubicacion };
        if (await Lote.findById(id)) {
            return res.status(400).json({ mensaje: "Ya existe un lote con ese ID" });
        }
        if (productorId != null && !await Productor.findById(productorId)) {
            return res.status(400).json({ mensaje: "El productor no existe" });
        }
        if (!await TipoCultivo.findById(tipoCultivoId)) {
            return res.status(400).json({ mensaje: "El tipo de cultivo no existe" });
        }


        const creado = await new Lote(nuevoLote).save();

        res.status(201).json({
            mensaje: "Lote creado",
            lote: creado
        });
    } catch (error) {
        next(error);
    }
};

const actualizarLote = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | Actualización parcial con lote cargado y datos validados
        if (req.body?.tecnicoId !== undefined) return res.status(400).json({ mensaje: "Asigná los ingenieros desde su apartado" });
        const lote = res.locals.lote;
        const actualizado = res.locals.loteActualizado;
        // Notas - Andrea | Fin | Actualización parcial con lote cargado y datos validados
        if (actualizado.productorId != null && !await Productor.findById(actualizado.productorId)) {
            return res.status(400).json({ mensaje: "El productor no existe" });
        }
        if (!await TipoCultivo.findById(actualizado.tipoCultivoId)) {
            return res.status(400).json({ mensaje: "El tipo de cultivo no existe" });
        }
        Object.assign(lote, actualizado);

        await lote.save();

        res.json({
            mensaje: "Lote actualizado",
            lote
        });
    } catch (error) {
        next(error);
    }
};

const eliminarLote = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware

        if (!await Lote.findById(id)) {
            return res.status(404).json({
                mensaje: "Lote no encontrado"
            });
        }

        if (await Observacion.findOne({ loteId: id })) {
            return res.status(400).json({
                mensaje: "No se puede eliminar el lote porque posee observaciones en su historial"
            });
        }

        if (await TecnicoTieneLote.exists({ loteId: id })) {
            return res.status(400).json({ mensaje: "Primero quitá las asignaciones de ingenieros del lote" });
        }
        await Lote.deleteOne({ _id: id });

        res.json({
            mensaje: "Lote eliminado"
        });
    } catch (error) {
        next(error);
    }
};

const mostrarLotes = async (req, res, next) => {
    try {
        res.render("lotes", { lotes: await Lote.find().populate("tipoCultivoId").sort({ _id: 1 }) });
    } catch (error) {
        next(error);
    }
};

const mostrarLote = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        const datos = await Lote.findById(id);
        if (!datos) {
            return res.status(404).render("error", { mensaje: "Lote no encontrado" });
        }
        const productor = await Productor.findById(datos.productorId);
        const tipoCultivo = await TipoCultivo.findById(datos.tipoCultivoId);
        res.render("detalleLote", { lote: datos, productor, tipoCultivo });
    } catch (error) {
        next(error);
    }
};

const obtenerHistorial = async (req, res, next) => {
    try {
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware
        if (!await Lote.findById(id)) {
            return res.status(404).json({ mensaje: "Lote no encontrado" });
        }
        res.json(await Observacion.find({ loteId: id }));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerLotes,
    obtenerLotePorId,
    // Notas - Andrea | Inicio | Carga de lote disponible para las rutas de actualización
    cargarLote,
    // Notas - Andrea | Fin | Carga de lote disponible para las rutas de actualización
    crearLote,
    actualizarLote,
    eliminarLote,
    obtenerHistorial,
    mostrarLotes,
    mostrarLote
};
