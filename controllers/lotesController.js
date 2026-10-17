const Productor = require("../models/Productor");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");

// Notas - Andrea | Inicio | Validaciones de cuerpo conservadas
const datosValidos = (datos) => {
    return (
        Number.isSafeInteger(datos._id) && datos._id > 0 &&
        Number.isSafeInteger(datos.tipoCultivoId) && datos.tipoCultivoId > 0 &&
        Number.isSafeInteger(datos.productorId) && datos.productorId > 0 &&
        typeof datos.ubicacion === "string" && datos.ubicacion.trim() !== "" &&
        typeof datos.hectareas === "number" && Number.isFinite(datos.hectareas) && datos.hectareas > 0
    );
};
// Notas - Andrea | Fin | Validaciones de cuerpo conservadas

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
        const { _id: id, hectareas, tipoCultivoId, productorId, ubicacion } = req.body || {};

        const nuevoLote = { _id: id, hectareas, tipoCultivoId, productorId, ubicacion };

        if (!datosValidos(nuevoLote)) {
            return res.status(400).json({
                mensaje: "Se requieren IDs enteros positivos, hectáreas numéricas mayores que cero y ubicación no vacía"
            });
        }
        if (await Lote.findById(id)) {
            return res.status(400).json({ mensaje: "Ya existe un lote con ese ID" });
        }
        if (!await Productor.findById(productorId)) {
            return res.status(400).json({ mensaje: "El productor no existe" });
        }
        if (!await TipoCultivo.findById(tipoCultivoId)) {
            return res.status(400).json({ mensaje: "El tipo de cultivo no existe" });
        }

        const creado = await new Lote({ _id: id, hectareas, tipoCultivoId, productorId, ubicacion }).save();

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
        // Notas - Andrea | Inicio | ID validado por middleware
        const id = Number(req.params.id);
        // Notas - Andrea | Fin | ID validado por middleware

        const lote = await Lote.findById(id);

        if (!lote) {
            return res.status(404).json({
                mensaje: "Lote no encontrado"
            });
        }

        const datos = req.body;
        if (!datos || Array.isArray(datos) || typeof datos !== "object" ||
            !["hectareas", "tipoCultivoId", "productorId", "ubicacion"].some(campo => datos[campo] !== undefined) ||
            (datos._id !== undefined && datos._id !== id)) {
            return res.status(400).json({ mensaje: "Envíe campos del lote para actualizar; el ID no se puede cambiar" });
        }

        const actualizado = {
            _id: id,
            hectareas: datos.hectareas !== undefined ? datos.hectareas : lote.hectareas,
            tipoCultivoId: datos.tipoCultivoId !== undefined ? datos.tipoCultivoId : lote.tipoCultivoId,
            productorId: datos.productorId !== undefined ? datos.productorId : lote.productorId,
            ubicacion: datos.ubicacion !== undefined ? datos.ubicacion : lote.ubicacion
        };
        if (!datosValidos(actualizado)) {
            return res.status(400).json({ mensaje: "Los datos del lote son inválidos" });
        }
        if (!await Productor.findById(actualizado.productorId)) {
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
        res.render("lotes", { lotes: await Lote.find() });
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
    crearLote,
    actualizarLote,
    eliminarLote,
    obtenerHistorial,
    mostrarLotes,
    mostrarLote
};
