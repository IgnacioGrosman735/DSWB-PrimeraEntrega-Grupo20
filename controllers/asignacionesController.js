const Tecnico = require("../models/Tecnico");
const Lote = require("../models/Lote");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");

async function cambiarAsignacion(req, res, next) {
    try {
        const tecnicoId = Number(req.params.id);
        const loteId = Number(req.params.loteId);
        if (![tecnicoId, loteId].every(id => Number.isSafeInteger(id) && id > 0)) {
            return res.status(400).json({ mensaje: "Los IDs deben ser enteros positivos" });
        }
        if (!await Tecnico.exists({ _id: tecnicoId }) || !await Lote.exists({ _id: loteId })) {
            return res.status(404).json({ mensaje: "El ingeniero o el lote no existe" });
        }
        if (req.method === "DELETE") {
            await TecnicoTieneLote.deleteOne({ tecnicoId, loteId });
            return res.json({ mensaje: "Asignación quitada; el lote y su historial se conservan" });
        }
        if (!await TecnicoTieneLote.exists({ tecnicoId, loteId })) {
            const id = req.body?._id;
            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({ mensaje: "Ingresá un ID entero positivo para la asignación" });
            }
            try {
                await TecnicoTieneLote.create({ _id: id, tecnicoId, loteId });
            } catch (error) {
                // Dos clics simultáneos no deben crear una relación duplicada.
                if (error.code !== 11000 || !await TecnicoTieneLote.exists({ tecnicoId, loteId })) throw error;
            }
        }
        res.json({ mensaje: "Lote asignado" });
    } catch (error) { next(error); }
}
module.exports = { cambiarAsignacion };
