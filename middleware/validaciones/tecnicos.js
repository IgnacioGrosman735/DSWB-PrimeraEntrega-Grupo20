// Notas - Andrea | Inicio | Validación de creación y actualización de técnicos
const { idValido, textoValido } = require("./comunes");

const validarCreacionTecnico = (req, res, next) => {
    const datos = req.body || {};
    if (!idValido(datos._id) || !textoValido(datos.nombre)) {
        return res.status(400).json({ mensaje: "Se requiere un ID entero positivo y un nombre no vacío" });
    }
    next();
};

const validarActualizacionTecnico = (req, res, next) => {
    const id = Number(req.params.id);
    const datos = req.body || {};
    if (!idValido(id) || !textoValido(datos.nombre) || (datos._id !== undefined && datos._id !== id)) {
        return res.status(400).json({ mensaje: "Se requiere un nombre no vacío; el ID no se puede cambiar" });
    }
    next();
};

module.exports = { validarCreacionTecnico, validarActualizacionTecnico };
// Notas - Andrea | Fin | Validación de creación y actualización de técnicos
