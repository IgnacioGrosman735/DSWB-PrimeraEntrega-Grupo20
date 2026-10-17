const express = require("express");
const {
    obtenerObservaciones,
    obtenerObservacionPorId,
    crearObservacion
} = require("../controllers/observacionesController");

const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs y filtro por técnico en rutas de observaciones
const { validarId, validarTecnicoId } = require("../middleware/validaciones/parametros");

router.get("/", validarTecnicoId, obtenerObservaciones);
router.get("/:id", validarId, obtenerObservacionPorId);
router.post("/", crearObservacion);
// Notas - Andrea | Fin | Validación de IDs y filtro por técnico en rutas de observaciones

module.exports = router;
