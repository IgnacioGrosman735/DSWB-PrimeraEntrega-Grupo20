const express = require("express");
const {
    obtenerProductores,
    obtenerProductorPorId,
    crearProductor,
    actualizarProductor,
    eliminarProductor
} = require("../controllers/productoresController");

const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs en rutas de productores
const { validarId } = require("../middleware/validaciones/parametros");

router.get("/", obtenerProductores);
router.get("/:id", validarId, obtenerProductorPorId);
router.post("/", crearProductor);
router.put("/:id", validarId, actualizarProductor);
router.delete("/:id", validarId, eliminarProductor);
// Notas - Andrea | Fin | Validación de IDs en rutas de productores

module.exports = router;
