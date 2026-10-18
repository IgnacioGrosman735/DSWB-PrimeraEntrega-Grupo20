const express = require("express");
const { mostrarLotes, mostrarLote } = require("../controllers/lotesController");
const { mostrarTecnicos, mostrarTecnico } = require("../controllers/tecnicosController");
const { mostrarLotesIngeniero, mostrarCargaObservacion, mostrarHistorialObservaciones } = require("../controllers/observacionesController");
const router = express.Router();
router.get("/ingenieros/:tecnicoId/lotes", mostrarLotesIngeniero);
router.get("/ingenieros/:tecnicoId/lotes/:loteId/historial", mostrarHistorialObservaciones);
router.get("/ingenieros/:tecnicoId/lotes/:loteId/observaciones", mostrarCargaObservacion);
router.get("/menu", (req, res) => res.render("perfil", { nombre: null, roles: [], tecnicoId: null }));
const { mostrarFormulario, mostrarCultivos, mostrarAsignaciones } = require("../controllers/formulariosController");

router.get("/productores/:id/lotes", mostrarAsignaciones("productores"));
router.get("/tecnicos/:id/lotes", mostrarAsignaciones("tecnicos"));

for (const recurso of ["lotes", "tecnicos", "tipos-cultivo", "productores"]) {
    router.get(`/${recurso}/nuevo`, mostrarFormulario(recurso));
    router.get(`/${recurso}/:id/editar`, mostrarFormulario(recurso));
}
router.get("/tipos-cultivo", mostrarCultivos);
router.get("/productores", async (req, res, next) => {
    try {
        const Productor = require("../models/Productor");
        const Lote = require("../models/Lote");
        res.render("productores", { productores: await Productor.find().sort({ nombre: 1 }), lotes: await Lote.find().sort({ _id: 1 }) });
    } catch (error) { next(error); }
});

// Notas - Andrea | Inicio | Validación de IDs con respuesta HTML en vistas
const { validarId } = require("../middleware/validaciones/parametros");

router.get("/lotes", mostrarLotes);
router.get("/lotes/:id", validarId, mostrarLote);
router.get("/tecnicos", mostrarTecnicos);
router.get("/tecnicos/:id", validarId, mostrarTecnico);
// Notas - Andrea | Fin | Validación de IDs con respuesta HTML en vistas

module.exports = router;
