const express = require("express");

const {
    obtenerLotes,
    obtenerHistorial,
    obtenerLotePorId,
    crearLote,

    cargarLote,

    actualizarLote,
    eliminarLote
} = require("../controllers/lotesController");

const router = express.Router();

const { validarId, validarAlerta } = require("../middleware/validaciones/parametros");

const {
    validarCreacionLote,
    validarActualizacionLote
} = require("../middleware/validaciones/lotes");

router.get("/", validarAlerta, obtenerLotes);
router.get("/:id/observaciones", validarId, obtenerHistorial);
router.get("/:id", validarId, obtenerLotePorId);

router.post("/", validarCreacionLote, crearLote);
router.put("/:id", validarId, cargarLote, validarActualizacionLote, actualizarLote);

router.delete("/:id", validarId, eliminarLote);

module.exports = router;
