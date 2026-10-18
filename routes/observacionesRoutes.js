const express = require("express");
const {
    obtenerObservaciones,
    obtenerObservacionPorId,
    crearObservacion
} = require("../controllers/observacionesController");

const { validarCreacionObservacion } = require("../middleware/validaciones/observaciones");

const router = express.Router();

const { validarId, validarTecnicoId } = require("../middleware/validaciones/parametros");

router.get("/", validarTecnicoId, obtenerObservaciones);
router.get("/:id", validarId, obtenerObservacionPorId);

router.post("/", validarCreacionObservacion, crearObservacion);

module.exports = router;
