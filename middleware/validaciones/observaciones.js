// Notas - Andrea | Inicio | Validación de creación de observaciones
const { idValido, textoValido, fechaValida, alertaValida } = require("./comunes");

const validarCreacionObservacion = (req, res, next) => {
    const datos = req.body || {};
    if (!alertaValida(datos.nivelAlerta)) {
        return res.status(400).json({ mensaje: "El nivel de alerta debe ser Normal, Atención o Crítico" });
    }
    if (!idValido(datos._id) || !idValido(datos.loteId) ||
        !idValido(datos.tecnicoId) || !idValido(datos.tipoCultivoId) ||
        !fechaValida(datos.fecha) || !textoValido(datos.estadoCultivo) || !textoValido(datos.observaciones)) {
        return res.status(400).json({
            mensaje: "Se requieren IDs enteros positivos, fecha válida YYYY-MM-DD, estado del cultivo y texto de observaciones no vacíos"
        });
    }
    next();
};

module.exports = { validarCreacionObservacion };
// Notas - Andrea | Fin | Validación de creación de observaciones
