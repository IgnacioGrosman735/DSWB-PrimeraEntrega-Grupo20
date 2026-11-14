const Observacion = require("../models/Observacion");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");

const msPorDia = 86_400_000;

function describirLotes(lotes) {
    return lotes.map(({ id, nivelActual, fechaUltima }) =>
        `Lote ${id} · ${nivelActual} · ${fechaUltima ?? "Sin observaciones cargadas"}`
    ).join("\n");
}

async function responderSeguimiento(pregunta, fechaActual, lotes, perfil, periodo) {
    const texto = pregunta.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const loteConsultado = texto.match(/\blote\s*#?\s*(\d+)\b/);
    const id = loteConsultado ? Number(loteConsultado[1]) : null;
    const tuvoCritico = /\b(tuvo|estuvo|hubo)\b.*\bcritic[oa]s?\b.*\beste mes\b/.test(texto);
    const cambio = /\b(que cambio|que (ha|habia) cambiado|que cambios|evolucion|cambios desde la ultima)\b/.test(texto);
    if (tuvoCritico || cambio) {
        if (id === null) return "Indicá el número de lote que querés consultar.";
        if (!lotes.some(lote => lote.id === id)) return "Ese lote no está disponible para tu perfil.";
        const filtro = { loteId: id, estado: { $ne: "Pendiente" }, fecha: { $lte: fechaActual } };
        if (!perfil.roles.includes("Admin")) {
            if (!perfil.roles.includes("Ingeniero") || perfil.tecnicoId == null) {
                return "Tu perfil puede consultar el estado vigente en el tablero. El historial está disponible para Admin y para el ingeniero asignado.";
            }
            if (!await TecnicoTieneLote.exists({ tecnicoId: perfil.tecnicoId, loteId: id })) {
                return "El historial de ese lote no está disponible para tu perfil.";
            }
            filtro.tecnicoId = perfil.tecnicoId;
        }
        if (tuvoCritico) {
            const desde = `${fechaActual.slice(0, 7)}-01`;
            filtro.fecha.$gte = desde;
            filtro.nivelAlerta = "Crítico";
            const total = await Observacion.countDocuments(filtro);
            return `Lote ${id} · Del ${desde} al ${fechaActual}\nObservaciones críticas en tu historial disponible: ${total}.`;
        }

        if (periodo) filtro.fecha.$gte = periodo.desde;
        const consulta = Observacion.find(filtro, {
            fecha: 1, nivelAlerta: 1, estadoCultivo: 1, observaciones: 1
        }).sort({ fecha: -1, _id: -1 });
        const registros = await (periodo ? consulta : consulta.limit(2));
        const describir = registro => [
            `${registro.fecha} · ${registro.nivelAlerta} · ${registro.estadoCultivo}`,
            registro.observaciones
        ].filter(Boolean).join("\n");
        if (periodo) {
            const encabezado = `Lote ${id} · Del ${periodo.desde} al ${periodo.hasta}`;
            if (!registros.length) return `${encabezado}\nNo hay observaciones cargadas en tu historial para ese período.`;
            const lineas = [encabezado];
            let previa;
            for (const registro of registros.reverse()) {
                lineas.push(describir(registro));
                if (previa && previa.nivelAlerta !== registro.nivelAlerta) {
                    lineas.push(`El nivel pasó de ${previa.nivelAlerta} a ${registro.nivelAlerta}.`);
                }
                previa = registro;
            }
            if (registros.length === 1) lineas.push("Hay una sola observación en el período. Se necesitan dos para comparar.");
            return lineas.join("\n\n");
        }
        if (registros.length < 2) {
            return `Lote ${id} · Se necesitan dos observaciones cargadas en tu historial para comparar revisiones.`;
        }
        const [actual, anterior] = registros;
        const nivel = anterior.nivelAlerta === actual.nivelAlerta
            ? `El nivel se mantuvo en ${actual.nivelAlerta}.`
            : `El nivel pasó de ${anterior.nivelAlerta} a ${actual.nivelAlerta}.`;
        return [
            `Lote ${id} · Comparación de las dos últimas observaciones disponibles`,
            describir(anterior),
            describir(actual),
            nivel
        ].join("\n");
    }

    if (/\bsin\s+(observaciones?|revision|seguimiento)\b/.test(texto)) {
        const plazo = texto.match(/\bmas de\s+(\d+)\s+dias\b/);
        if (!plazo) return "Indicá cuántos días querés usar. Por ejemplo, «lotes con más de 15 días sin observaciones».";
        const dias = Number(plazo[1]);
        if (!Number.isSafeInteger(dias)) return "Indicá un número de días válido.";
        const atrasados = lotes
            .filter(lote =>
                lote.fechaUltima &&
                (Date.parse(fechaActual) - Date.parse(lote.fechaUltima)) / msPorDia > dias
            )
            .sort((a, b) => a.fechaUltima.localeCompare(b.fechaUltima));
        const sinDatos = lotes.filter(lote => !lote.fechaUltima);
        return [
            `Más de ${dias} días desde la última observación (${atrasados.length})`,
            describirLotes(atrasados) || "Sin coincidencias.",
            `\nSin observaciones cargadas (${sinDatos.length})`,
            describirLotes(sinDatos) || "Sin coincidencias."
        ].join("\n");
    }

    if (/\b(requieren|necesitan)\s+atencion\b/.test(texto)) {
        const visibles = periodo
            ? lotes.filter(({ fechaUltima }) =>
                fechaUltima && fechaUltima >= periodo.desde && fechaUltima <= periodo.hasta
            )
            : lotes;
        return ["Crítico", "Atención", "Sin datos"].map(nivel => {
            const grupo = visibles.filter(lote => lote.nivelActual === nivel);
            return `${nivel} (${grupo.length})\n${describirLotes(grupo) || "Sin coincidencias."}`;
        }).join("\n\n");
    }

    return null;
}

module.exports = { responderSeguimiento };
