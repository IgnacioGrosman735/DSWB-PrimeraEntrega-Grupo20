const Lote = require("../models/Lote");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");
const Tecnico = require("../models/Tecnico");
const TipoCultivo = require("../models/TipoCultivo");
const Productor = require("../models/Productor");
const { listarCuentasIngeniero } = require("../services/cuentaIngeniero");

const recursos = {
    lotes: { modelo: Lote, titulo: "lote" },
    tecnicos: { modelo: Tecnico, titulo: "ingeniero (técnico)" },
    productores: { modelo: Productor, titulo: "cliente (productor)" },
    "tipos-cultivo": { modelo: TipoCultivo, titulo: "tipo de cultivo" }
};
const mostrarFormulario = recurso => async (req, res, next) => {
    try {
        const editar = req.params.id !== undefined;
        let datos = {};
        if (editar) {
            const id = Number(req.params.id);
            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).render("error", { mensaje: "ID inválido" });
            }
            datos = await recursos[recurso].modelo.findById(id);
            if (!datos) return res.status(404).render("error", { mensaje: "Registro no encontrado" });
        }
        const cultivos = recurso === "lotes" ? await TipoCultivo.find().sort({ nombre: 1 }) : [];
        const cuentas = recurso === "tecnicos" ? await listarCuentasIngeniero() : [];
        res.render("formularioAbm", { recurso, titulo: recursos[recurso].titulo, editar, datos, cultivos, cuentas });
    } catch (error) { next(error); }
};
const mostrarCultivos = async (req, res, next) => {
    try { res.render("tiposCultivo", { cultivos: await TipoCultivo.find().sort({ _id: 1 }) }); }
    catch (error) { next(error); }
};
const mostrarAsignaciones = recurso => async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).render("error", { mensaje: "ID inválido" });
        }
        const persona = await recursos[recurso].modelo.findById(id);
        if (!persona) return res.status(404).render("error", { mensaje: "Registro no encontrado" });
        const campo = recurso === "productores" ? "productorId" : "tecnicoId";
        const esIngeniero = recurso === "tecnicos";
        const relaciones = esIngeniero ? await TecnicoTieneLote.find({ tecnicoId: id }) : [];
        const lotes = await Lote.find(esIngeniero ? {} : { productorId: { $in: [null, id] } }).sort({ _id: 1 });
        const idsAsignados = esIngeniero ? relaciones.map(r => r.loteId) : lotes.filter(l => l.productorId === id).map(l => l._id);
        res.render("asignaciones", { recurso, persona, campo, lotes, idsAsignados });
    } catch (error) { next(error); }
};
module.exports = { mostrarFormulario, mostrarCultivos, mostrarAsignaciones };
