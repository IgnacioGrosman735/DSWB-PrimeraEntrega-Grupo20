const express = require("express");

const {
    obtenerLotes,
    obtenerHistorial,
    obtenerLotePorId,
    crearLote,
    actualizarLote,
    eliminarLote
} = require("../controllers/lotesController");

const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs y filtro de alerta en rutas de lotes
const { validarId, validarAlerta } = require("../middleware/validaciones/parametros");

router.get("/", validarAlerta, obtenerLotes);
router.get("/:id/observaciones", validarId, obtenerHistorial);
router.get("/:id", validarId, obtenerLotePorId);
router.post("/", crearLote);
router.put("/:id", validarId, actualizarLote);
router.delete("/:id", validarId, eliminarLote);
// Notas - Andrea | Fin | Validación de IDs y filtro de alerta en rutas de lotes

module.exports = router;
