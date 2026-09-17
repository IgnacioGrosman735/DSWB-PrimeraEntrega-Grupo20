const express = require("express");
const { mostrarLotes, mostrarLote } = require("../controllers/lotesController");
const router = express.Router();

router.get("/", mostrarLotes);
router.get("/:id", mostrarLote);

module.exports = router;
