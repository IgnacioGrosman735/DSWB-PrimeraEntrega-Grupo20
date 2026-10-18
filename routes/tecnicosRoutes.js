const express = require("express");
const {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico,
    actualizarTecnico,
    eliminarTecnico
} = require("../controllers/tecnicosController");

const router = express.Router();
const { cambiarAsignacion } = require("../controllers/asignacionesController");
router.put("/:id/lotes/:loteId", cambiarAsignacion);
router.delete("/:id/lotes/:loteId", cambiarAsignacion);

router.get("/", obtenerTecnicos);
router.get("/:id", obtenerTecnicoPorId);
router.post("/", crearTecnico);
router.put("/:id", actualizarTecnico);
router.delete("/:id", eliminarTecnico);

module.exports = router;
