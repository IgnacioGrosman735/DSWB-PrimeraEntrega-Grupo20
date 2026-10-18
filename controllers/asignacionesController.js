const Tecnico = require("../models/Tecnico");
const Lote = require("../models/Lote");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");

async function cambiarAsignacion(req, res, next) {
    try {
        const tecnicoId = Number(req.params.id);
        const loteId = Number(req.params.loteId);
        if (![tecnicoId, loteId].every((id) => Number.isSafeInteger(id) && id > 0)) {
            return res.status(400).json({ mensaje: "Los IDs deben ser enteros positivos" });
        }
        if (!(await Tecnico.exists({ _id: tecnicoId })) || !(await Lote.exists({ _id: loteId }))) {
            return res.status(404).json({ mensaje: "El ingeniero o el lote no existe" });
        }
        if (req.method === "DELETE") {
            await TecnicoTieneLote.deleteOne({ tecnicoId, loteId });
            return res.json({ mensaje: "Asignación quitada; el lote y su historial se conservan" });
        }
        if (!(await TecnicoTieneLote.exists({ tecnicoId, loteId }))) {
            // Buscar el siguiente ID libre sin pedirlo en el formulario.
            for (let intento = 0; intento < 3; intento++) {
                const ultima = await TecnicoTieneLote.findOne().sort({ _id: -1 });
                const id = (ultima?._id || 0) + 1;
                if (!Number.isSafeInteger(id))
                    throw new Error("No quedan IDs disponibles para asignaciones");
                try {
                    await TecnicoTieneLote.create({ _id: id, tecnicoId, loteId });
                    break;
                } catch (error) {
                    if (error.code !== 11000) throw error;
                    // Si otro pedido creó la misma pareja, la asignación ya está hecha.
                    if (await TecnicoTieneLote.exists({ tecnicoId, loteId })) break;
                    // Si ocupó el ID para otra pareja, recalcularlo y volver a intentar.
                    if (intento === 2) {
                        return res
                            .status(409)
                            .json({ mensaje: "No se pudo asignar el lote. Volvé a intentar." });
                    }
                }
            }
        }
        res.json({ mensaje: "Lote asignado" });
    } catch (error) {
        next(error);
    }
}
module.exports = { cambiarAsignacion };
