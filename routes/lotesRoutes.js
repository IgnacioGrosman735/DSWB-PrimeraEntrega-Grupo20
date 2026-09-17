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

// CRUD e historial de lotes.

router.get("/", obtenerLotes);
router.get("/:id/observaciones", obtenerHistorial);
router.get("/:id", obtenerLotePorId);
router.post("/", crearLote);
router.put("/:id", actualizarLote);
router.delete("/:id", eliminarLote);

module.exports = router;
