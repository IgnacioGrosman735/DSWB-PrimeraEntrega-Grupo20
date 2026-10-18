const express = require("express");

const {
    obtenerProductores,
    obtenerProductorPorId,
    crearProductor,
    actualizarProductor,
    eliminarProductor,
    cargarProductor
} = require("../controllers/productoresController");
const {
    validarCreacionProductor,
    validarActualizacionProductor
} = require("../middleware/validaciones/productores");

const router = express.Router();

const { validarId } = require("../middleware/validaciones/parametros");

router.get("/", obtenerProductores);
router.get("/:id", validarId, obtenerProductorPorId);

router.post("/", validarCreacionProductor, crearProductor);
router.put("/:id", validarId, cargarProductor, validarActualizacionProductor, actualizarProductor);

router.delete("/:id", validarId, eliminarProductor);

module.exports = router;
