const express = require("express");
const {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico,
    actualizarTecnico,
    eliminarTecnico
} = require("../controllers/tecnicosController");

const router = express.Router();

router.get("/", obtenerTecnicos);
router.get("/:id", obtenerTecnicoPorId);
router.post("/", crearTecnico);
router.put("/:id", actualizarTecnico);
router.delete("/:id", eliminarTecnico);

module.exports = router;
