const express = require("express");
const {
    obtenerProductores,
    obtenerProductorPorId,
    crearProductor,
    actualizarProductor,
    eliminarProductor
} = require("../controllers/productoresController");

const router = express.Router();

router.get("/", obtenerProductores);
router.get("/:id", obtenerProductorPorId);
router.post("/", crearProductor);
router.put("/:id", actualizarProductor);
router.delete("/:id", eliminarProductor);

module.exports = router;
