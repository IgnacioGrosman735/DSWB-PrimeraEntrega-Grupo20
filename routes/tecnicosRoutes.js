const express = require("express");
const {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico,
    actualizarTecnico,
    eliminarTecnico
} = require("../controllers/tecnicosController");

const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs en rutas de técnicos
const { validarId } = require("../middleware/validaciones/parametros");

router.get("/", obtenerTecnicos);
router.get("/:id", validarId, obtenerTecnicoPorId);
router.post("/", crearTecnico);
router.put("/:id", validarId, actualizarTecnico);
router.delete("/:id", validarId, eliminarTecnico);
// Notas - Andrea | Fin | Validación de IDs en rutas de técnicos

module.exports = router;
