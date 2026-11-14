const Lote = require("../models/Lote");
const Productor = require("../models/Productor");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");

async function obtenerEstadoLotesDelPerfil(perfil) {
    const { roles, tecnicoId, usuarioId } = perfil;
    let idsLotes;
    if (!roles.includes("Admin")) {
        idsLotes = [];
        if (roles.includes("Ingeniero") && tecnicoId != null) {
            const asignaciones = await TecnicoTieneLote.find({ tecnicoId });
            idsLotes.push(...asignaciones.map((asignacion) => asignacion.loteId));
        }
        if (roles.includes("Cliente")) {
            const productor = await Productor.findOne({ usuarioId });
            if (productor) {
                const lotes = await Lote.find({ productorId: productor._id }, { _id: 1 });
                idsLotes.push(...lotes.map((lote) => lote._id));
            }
        }
    }
    return Lote.obtenerEstadoActual(idsLotes);
}

module.exports = { obtenerEstadoLotesDelPerfil };
