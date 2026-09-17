const express = require("express");
const {
    obtenerObservaciones,
    obtenerObservacionPorId,
    crearObservacion
} = require("../controllers/observacionesController");

const router = express.Router();

router.get("/", obtenerObservaciones);
router.get("/:id", obtenerObservacionPorId);
router.post("/", crearObservacion);

module.exports = router;
