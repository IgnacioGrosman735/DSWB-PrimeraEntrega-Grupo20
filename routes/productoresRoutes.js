const express = require("express");
// Notas - Andrea | Inicio | Controladores y validadores de solicitudes de productores
const {
    obtenerProductores,
    obtenerProductorPorId,
    crearProductor,
    actualizarProductor,
    eliminarProductor,
    cargarProductor
} = require("../controllers/productoresController");
const {
    validarCreacionProductor,
    validarActualizacionProductor
} = require("../middleware/validaciones/productores");
// Notas - Andrea | Fin | Controladores y validadores de solicitudes de productores

const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs en rutas de productores
const { validarId } = require("../middleware/validaciones/parametros");

router.get("/", obtenerProductores);
router.get("/:id", validarId, obtenerProductorPorId);
// Notas - Andrea | Inicio | Validar cuerpos y conservar la prioridad del productor inexistente
router.post("/", validarCreacionProductor, crearProductor);
router.put("/:id", validarId, cargarProductor, validarActualizacionProductor, actualizarProductor);
// Notas - Andrea | Fin | Validar cuerpos y conservar la prioridad del productor inexistente
router.delete("/:id", validarId, eliminarProductor);
// Notas - Andrea | Fin | Validación de IDs en rutas de productores

module.exports = router;
