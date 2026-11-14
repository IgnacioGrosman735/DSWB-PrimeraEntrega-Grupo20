const { agregarAlertasClima } = require("./alertasClima");

async function responderClima(pregunta, lotes) {
    const texto = pregunta.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const clima = /\b(meteorologic[oa]s?|clima|pronostico|precipitacion)\b/.test(texto);
    const listado = /\blotes\s+con\s+alertas?\b/.test(texto) &&
        !/\b(critic[oa]s?|normal|atencion|historial|pasad[oa]s?)\b/.test(texto);
    if (!clima && !listado) return null;

    const id = texto.match(/\blote\s*#?\s*(\d+)\b/);
    if (!id && !/\blotes\b/.test(texto)) {
        return "Indicá el número de lote o pedí «lotes con alertas meteorológicas».";
    }
    const seleccion = id ? lotes.filter(lote => lote._id === Number(id[1])) : lotes;
    if (id && !seleccion.length) return "Ese lote no está disponible para tu perfil.";
    if (!seleccion.length) return "No hay lotes visibles para tu perfil.";

    const resultados = await agregarAlertasClima(seleccion);
    const encabezado = "Pronóstico de las próximas 24 h · Open-Meteo";
    if (id) {
        const [lote] = resultados;
        const { localidad, pronostico, mensaje } = lote.clima;
        if (!pronostico) return `Lote ${lote._id} · ${mensaje ?? "Pronóstico no disponible"}.`;
        const probabilidad = pronostico.probabilidadPrecipitacion;
        return [
            encabezado,
            `Lote ${lote._id} · ${localidad}`,
            ...(pronostico.avisos.length ? pronostico.avisos : ["Sin avisos meteorológicos previstos."]),
            `Prob. Precipitación: ${probabilidad == null ? "no disponible" : probabilidad + " %"}`
        ].join("\n");
    }

    const conAvisos = resultados.filter(lote => lote.clima.pronostico?.avisos.length);
    const sinPronostico = resultados.filter(lote => !lote.clima.pronostico);
    const lineas = [
        encabezado,
        ...conAvisos.map(({ _id, clima }) =>
            `Lote ${_id} · ${clima.localidad} · ${clima.pronostico.avisos.join(", ")}`
        )
    ];
    if (!conAvisos.length && sinPronostico.length < resultados.length) {
        lineas.push("No hay avisos en los lotes con pronóstico disponible.");
    }
    if (sinPronostico.length) {
        lineas.push(`Sin pronóstico disponible: ${sinPronostico.map(lote => `lote ${lote._id}`).join(", ")}.`);
    }
    return lineas.join("\n");
}

module.exports = { responderClima };
