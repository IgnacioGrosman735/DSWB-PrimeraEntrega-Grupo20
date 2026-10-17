const express = require("express");

const {
    obtenerLotes,
    obtenerHistorial,
    obtenerLotePorId,
    crearLote,
    // Notas - Andrea | Inicio | Carga de lote para conservar prioridad del error 404
    cargarLote,
    // Notas - Andrea | Fin | Carga de lote para conservar prioridad del error 404
    actualizarLote,
    eliminarLote
} = require("../controllers/lotesController");

const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs y filtro de alerta en rutas de lotes
const { validarId, validarAlerta } = require("../middleware/validaciones/parametros");
// Notas - Andrea | Inicio | Validaciones del cuerpo de lotes
const { validarCreacionLote, validarActualizacionLote } = require("../middleware/validaciones/lotes");
// Notas - Andrea | Fin | Validaciones del cuerpo de lotes

router.get("/", validarAlerta, obtenerLotes);
router.get("/:id/observaciones", validarId, obtenerHistorial);
router.get("/:id", validarId, obtenerLotePorId);
// Notas - Andrea | Inicio | Validación de creación y actualización parcial en las rutas
router.post("/", validarCreacionLote, crearLote);
router.put("/:id", validarId, cargarLote, validarActualizacionLote, actualizarLote);
// Notas - Andrea | Fin | Validación de creación y actualización parcial en las rutas
router.delete("/:id", validarId, eliminarLote);
// Notas - Andrea | Fin | Validación de IDs y filtro de alerta en rutas de lotes

module.exports = router;
