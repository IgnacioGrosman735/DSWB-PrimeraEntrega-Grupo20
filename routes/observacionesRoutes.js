const express = require("express");
const {
    obtenerObservaciones,
    obtenerObservacionPorId,
    crearObservacion
} = require("../controllers/observacionesController");

// Notas - Andrea | Inicio | Incorporar validador del cuerpo de observaciones
const { validarCreacionObservacion } = require("../middleware/validaciones/observaciones");
// Notas - Andrea | Fin | Incorporar validador del cuerpo de observaciones

const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs y filtro por técnico en rutas de observaciones
const { validarId, validarTecnicoId } = require("../middleware/validaciones/parametros");

router.get("/", validarTecnicoId, obtenerObservaciones);
router.get("/:id", validarId, obtenerObservacionPorId);
// Notas - Andrea | Inicio | Validar entrada antes de crear una observación
router.post("/", validarCreacionObservacion, crearObservacion);
// Notas - Andrea | Fin | Validar entrada antes de crear una observación
// Notas - Andrea | Fin | Validación de IDs y filtro por técnico en rutas de observaciones

module.exports = router;
