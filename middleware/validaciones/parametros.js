// Notas - Andrea | Inicio | Validación de parámetros de ruta y filtros
const { idValido, alertaValida } = require("./comunes");

const validarId = (req, res, next) => {
    if (!idValido(Number(req.params.id))) {
        const error = { mensaje: "El ID debe ser un entero positivo" };
        if (req.baseUrl === "/web") {
            return res.status(400).render("error", error);
        }
        return res.status(400).json(error);
    }
    next();
};

const validarAlerta = (req, res, next) => {
    if (req.query.alerta !== undefined && !alertaValida(req.query.alerta)) {
        return res.status(400).json({ mensaje: "El nivel de alerta debe ser Normal, Atención o Crítico" });
    }
    next();
};

const validarTecnicoId = (req, res, next) => {
    if (req.query.tecnicoId !== undefined &&
        (typeof req.query.tecnicoId !== "string" || !idValido(Number(req.query.tecnicoId)))) {
        return res.status(400).json({ mensaje: "tecnicoId debe ser un entero positivo" });
    }
    next();
};

module.exports = { validarId, validarAlerta, validarTecnicoId };
// Notas - Andrea | Fin | Validación de parámetros de ruta y filtros
