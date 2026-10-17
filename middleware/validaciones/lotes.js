// Notas - Andrea | Inicio | Validación de creación y actualización parcial de lotes
const { idValido, textoValido, hectareasValidas } = require("./comunes");

const datosValidos = datos => idValido(datos._id) &&
    idValido(datos.tipoCultivoId) && idValido(datos.productorId) &&
    textoValido(datos.ubicacion) && hectareasValidas(datos.hectareas);

const validarCreacionLote = (req, res, next) => {
    if (!datosValidos(req.body || {})) {
        return res.status(400).json({
            mensaje: "Se requieren IDs enteros positivos, hectáreas numéricas mayores que cero y ubicación no vacía"
        });
    }
    next();
};

const validarActualizacionLote = (req, res, next) => {
    const id = Number(req.params.id);
    const datos = req.body;
    if (!datos || Array.isArray(datos) || typeof datos !== "object" ||
        !["hectareas", "tipoCultivoId", "productorId", "ubicacion"].some(campo => datos[campo] !== undefined) ||
        (datos._id !== undefined && datos._id !== id)) {
        return res.status(400).json({ mensaje: "Envíe campos del lote para actualizar; el ID no se puede cambiar" });
    }

    const lote = res.locals.lote;
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
    res.locals.loteActualizado = actualizado;
    next();
};

module.exports = { validarCreacionLote, validarActualizacionLote };
// Notas - Andrea | Fin | Validación de creación y actualización parcial de lotes
