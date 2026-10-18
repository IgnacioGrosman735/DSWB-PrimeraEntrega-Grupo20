const { idValido, textoValido } = require("./comunes");

const validarCreacionProductor = (req, res, next) => {
    const datos = req.body || {};
    if (!idValido(datos._id) || !textoValido(datos.nombre)) {
        return res
            .status(400)
            .json({ mensaje: "Se requiere un ID entero positivo y un nombre no vacío" });
    }
    next();
};

const validarActualizacionProductor = (req, res, next) => {
    const id = Number(req.params.id);
    const datos = req.body || {};
    if (
        !idValido(id) ||
        !textoValido(datos.nombre) ||
        (datos._id !== undefined && datos._id !== id)
    ) {
        return res
            .status(400)
            .json({ mensaje: "Se requiere un nombre no vacío; el ID no se puede cambiar" });
    }
    next();
};

module.exports = { validarCreacionProductor, validarActualizacionProductor };
