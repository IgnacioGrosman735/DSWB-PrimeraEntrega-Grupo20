const router = require("express").Router();
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");

router.param("id", (req, res, next, valor) => {
    const id = Number(valor);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: "El ID debe ser un entero positivo" });
    }
    req.cultivoId = id;
    next();
});

router.get("/", async (req, res, next) => {
    try { res.json(await TipoCultivo.find().sort({ _id: 1 })); }
    catch (error) { next(error); }
});

async function guardar(req, res, next) {
    try {
        const datos = req.body || {};
        const id = req.method === "POST" ? datos._id : req.cultivoId;
        if (!Number.isSafeInteger(id) || id <= 0 ||
            typeof datos.nombre !== "string" || !datos.nombre.trim() ||
            (datos._id !== undefined && datos._id !== id)) {
            return res.status(400).json({ mensaje: "Se requiere ID entero positivo y nombre; el ID no se puede cambiar" });
        }
        if (req.method === "POST") {
            const tipoCultivo = await TipoCultivo.create({ _id: id, nombre: datos.nombre.trim() });
            return res.status(201).json({ tipoCultivo });
        }
        const tipoCultivo = await TipoCultivo.findById(id);
        if (!tipoCultivo) return res.status(404).json({ mensaje: "El tipo de cultivo no existe" });
        tipoCultivo.nombre = datos.nombre.trim();
        await tipoCultivo.save();
        res.json({ tipoCultivo });
    } catch (error) { next(error); }
}
router.post("/", guardar);
router.put("/:id", guardar);
router.delete("/:id", async (req, res, next) => {
    try {
        const id = req.cultivoId;
        if (!await TipoCultivo.exists({ _id: id })) {
            return res.status(404).json({ mensaje: "El tipo de cultivo no existe" });
        }
        if (await Lote.exists({ tipoCultivoId: id }) || await Observacion.exists({ tipoCultivoId: id })) {
            return res.status(400).json({ mensaje: "No se puede eliminar un cultivo asociado a lotes u observaciones" });
        }
        await TipoCultivo.deleteOne({ _id: id });
        res.json({ mensaje: "Tipo de cultivo eliminado" });
    } catch (error) { next(error); }
});
module.exports = router;
