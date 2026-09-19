const express = require("express");
const { mostrarLotes, mostrarLote } = require("../controllers/lotesController");
const { mostrarTecnicos, mostrarTecnico } = require("../controllers/tecnicosController");
const router = express.Router();

router.get("/lotes", mostrarLotes);
router.get("/lotes/:id", mostrarLote);
router.get("/tecnicos", mostrarTecnicos);
router.get("/tecnicos/:id", mostrarTecnico);

module.exports = router;
