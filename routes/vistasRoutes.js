const express = require("express");
const { mostrarLotes, mostrarLote } = require("../controllers/lotesController");
const { mostrarTecnicos, mostrarTecnico } = require("../controllers/tecnicosController");
const router = express.Router();

// Notas - Andrea | Inicio | Validación de IDs con respuesta HTML en vistas
const { validarId } = require("../middleware/validaciones/parametros");

router.get("/lotes", mostrarLotes);
router.get("/lotes/:id", validarId, mostrarLote);
router.get("/tecnicos", mostrarTecnicos);
router.get("/tecnicos/:id", validarId, mostrarTecnico);
// Notas - Andrea | Fin | Validación de IDs con respuesta HTML en vistas

module.exports = router;
