const express = require("express");

const router = express.Router();

const {

    obtenerLotes,
    obtenerLotePorId,
    crearLote,
    actualizarLote,
    eliminarLote

} = require("../controllers/lotesController");

// rutas CRUD

router.get("/", obtenerLotes);

router.get("/:id", obtenerLotePorId);

router.post("/", crearLote);

router.put("/:id", actualizarLote);

router.delete("/:id", eliminarLote);


module.exports = router;