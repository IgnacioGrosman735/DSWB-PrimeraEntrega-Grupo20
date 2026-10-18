const express = require("express");
const {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico,

    cargarTecnico,

    actualizarTecnico,
    eliminarTecnico
} = require("../controllers/tecnicosController");

const router = express.Router();
const { cambiarAsignacion } = require("../controllers/asignacionesController");
router.put("/:id/lotes/:loteId", cambiarAsignacion);
router.delete("/:id/lotes/:loteId", cambiarAsignacion);

const { validarId } = require("../middleware/validaciones/parametros");

const {
    validarCreacionTecnico,
    validarActualizacionTecnico
} = require("../middleware/validaciones/tecnicos");

router.get("/", obtenerTecnicos);
router.get("/:id", validarId, obtenerTecnicoPorId);

router.post("/", validarCreacionTecnico, crearTecnico);
router.put("/:id", validarId, cargarTecnico, validarActualizacionTecnico, actualizarTecnico);

router.delete("/:id", validarId, eliminarTecnico);

module.exports = router;
