function filtrarUltimosDias(pregunta, fechaActual, lotes) {
    const coincidencia = pregunta.match(/(?:^|[^\p{L}\p{N}])[uú]ltimos\s+([1-9]\d*)\s+d[ií]as\b/iu);
    if (!coincidencia) return { lotes };

    const dias = Number(coincidencia[1]);
    const fechaDesde = new Date(`${fechaActual}T00:00:00Z`);
    fechaDesde.setUTCDate(fechaDesde.getUTCDate() - (dias - 1));
    const desde = fechaDesde >= new Date("0001-01-01") ? fechaDesde.toISOString().slice(0, 10) : "0001-01-01";
    return {
        periodo: { desde, hasta: fechaActual },
        lotes: lotes.filter(({ fechaUltima }) =>
            fechaUltima && fechaUltima >= desde && fechaUltima <= fechaActual
        )
    };
}

module.exports = { filtrarUltimosDias };
