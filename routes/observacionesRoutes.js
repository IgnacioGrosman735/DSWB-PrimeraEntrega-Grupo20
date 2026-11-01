const express = require("express");
const {
    obtenerObservaciones,
    obtenerObservacionPorId,
    crearObservacion
} = require("../controllers/observacionesController");

const { validarCreacionObservacion } = require("../middleware/validaciones/observaciones");

const router = express.Router();
const { autorizarObservaciones } = require("../middleware/sesion");

const { validarId, validarTecnicoId } = require("../middleware/validaciones/parametros");

router.get("/", validarTecnicoId, autorizarObservaciones, obtenerObservaciones);
router.get("/:id", validarId, autorizarObservaciones, obtenerObservacionPorId);

router.post("/", autorizarObservaciones, validarCreacionObservacion, crearObservacion);

module.exports = router;
