const ubicaciones = new Map();
const pronosticos = new Map();

async function obtener(url, signal) {
    const respuesta = await fetch(url, { signal, redirect: "error" });
    if (!respuesta.ok) throw new Error("Servicio externo no disponible");
    return respuesta;
}

function normalizar(texto) {
    return texto.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

async function localizar(ubicacion, signal) {
    const clave = normalizar(ubicacion);
    if (ubicaciones.has(clave)) return ubicaciones.get(clave);
    const [nombre, provincia] = ubicacion.split(",").map(parte => parte.trim());
    const url = new URL("https://apis.datos.gob.ar/georef/api/localidades");
    url.search = new URLSearchParams({ nombre, exacto: "true", max: "100", campos: "nombre,provincia,centroide" });
    if (provincia) url.searchParams.set("provincia", provincia);
    const { localidades, total } = await (await obtener(url, signal)).json();
    const candidatas = localidades.filter(item =>
        normalizar(item.nombre) === normalizar(nombre) &&
        Number.isFinite(item.centroide?.lat) && Number.isFinite(item.centroide?.lon)
    );
    const primera = candidatas[0];
    // Georef puede devolver más de un registro para el mismo núcleo urbano.
    const punto = primera && total <= localidades.length && candidatas.every(item =>
        item.provincia.id === primera.provincia.id &&
        Math.abs(item.centroide.lat - primera.centroide.lat) < 0.02 &&
        Math.abs(item.centroide.lon - primera.centroide.lon) < 0.02
    ) ? primera : null;
    if (ubicaciones.size >= 500) ubicaciones.clear();
    ubicaciones.set(clave, punto);
    return punto;
}

async function consultarPronostico({ lat, lon }) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        hourly: "weather_code,wind_gusts_10m,temperature_2m,precipitation_probability",
        forecast_hours: "24"
    });
    const { hourly } = await (await obtener(url, AbortSignal.timeout(5000))).json();
    const { weather_code: codigos, wind_gusts_10m: rafagas, temperature_2m: temperaturas } = hourly;
    if (![codigos, rafagas, temperaturas].every(serie => serie?.some(Number.isFinite))) {
        throw new Error("Pronóstico incompleto");
    }
    const avisos = [];
    if (codigos.some(codigo => [95, 96, 97, 99].includes(codigo))) avisos.push("Tormentas previstas");
    if (codigos.some(codigo => [65, 82].includes(codigo))) avisos.push("Lluvia intensa prevista");
    if (rafagas.some(valor => valor >= 60)) avisos.push("Ráfagas previstas de al menos 60 km/h");
    if (temperaturas.some(valor => Number.isFinite(valor) && valor <= 0)) avisos.push("Riesgo de heladas");
    const probabilidades = (hourly.precipitation_probability ?? [])
        .filter(valor => Number.isFinite(valor) && valor >= 0 && valor <= 100);
    return {
        avisos,
        probabilidadPrecipitacion: probabilidades.length ? Math.max(...probabilidades) : null
    };
}

function obtenerPronostico(punto) {
    const clave = `${punto.lat},${punto.lon}`;
    const anterior = pronosticos.get(clave);
    if (anterior?.vence > Date.now()) return anterior.promesa;
    if (pronosticos.size >= 500) pronosticos.clear();
    const promesa = consultarPronostico(punto).catch(() => null);
    pronosticos.set(clave, { vence: Date.now() + 300_000, promesa });
    return promesa;
}

async function agregarAlertasClima(lotes) {
    if (!lotes.length) return lotes;
    const signal = AbortSignal.timeout(5000);
    const consultas = new Map();
    return Promise.all(lotes.map(async lote => {
        if (!consultas.has(lote.ubicacion)) {
            consultas.set(lote.ubicacion, localizar(lote.ubicacion, signal).catch(() => undefined));
        }
        const ubicacion = await consultas.get(lote.ubicacion);
        if (ubicacion === null) return { ...lote, clima: { mensaje: "Indicá localidad y provincia" } };
        if (!ubicacion) return { ...lote, clima: { mensaje: "No se pudo ubicar la localidad" } };
        const pronostico = await obtenerPronostico(ubicacion.centroide);
        return {
            ...lote,
            clima: {
                localidad: `${ubicacion.nombre}, ${ubicacion.provincia.nombre}`,
                pronostico
            }
        };
    }));
}

module.exports = { agregarAlertasClima };
