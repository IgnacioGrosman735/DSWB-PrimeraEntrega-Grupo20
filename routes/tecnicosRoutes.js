const express = require("express");
const {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico,
    // Notas - Andrea | Inicio | Carga previa para actualizar técnicos
    cargarTecnico,
    // Notas - Andrea | Fin | Carga previa para actualizar técnicos
    actualizarTecnico,
    eliminarTecnico
} = require("../controllers/tecnicosController");

const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs en rutas de técnicos
const { validarId } = require("../middleware/validaciones/parametros");
// Notas - Andrea | Inicio | Validadores del cuerpo de técnicos
const {
    validarCreacionTecnico,
    validarActualizacionTecnico
} = require("../middleware/validaciones/tecnicos");
// Notas - Andrea | Fin | Validadores del cuerpo de técnicos

router.get("/", obtenerTecnicos);
router.get("/:id", validarId, obtenerTecnicoPorId);
// Notas - Andrea | Inicio | Validación de creación y actualización de técnicos
router.post("/", validarCreacionTecnico, crearTecnico);
router.put("/:id", validarId, cargarTecnico, validarActualizacionTecnico, actualizarTecnico);
// Notas - Andrea | Fin | Validación de creación y actualización de técnicos
router.delete("/:id", validarId, eliminarTecnico);
// Notas - Andrea | Fin | Validación de IDs en rutas de técnicos

module.exports = router;
