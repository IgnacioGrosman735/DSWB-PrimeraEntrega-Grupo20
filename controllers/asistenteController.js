const { consultarGemini } = require("../services/geminiService");
const { obtenerEstadoLotesDelPerfil } = require("../services/estadoLotes");
const { filtrarUltimosDias } = require("../services/periodoConsultaLotes");
const { responderSeguimiento } = require("../services/seguimientoAgrobot");
const { responderClima } = require("../services/climaAgrobot");

const limitePregunta = 500;
const limiteConsultas = 5;
const ventanaMs = 60_000;
const consultasPorUsuario = new Map();

function mostrarAsistente(req, res) {
    return res.render("asistente", {
        ...req.perfil,
        pregunta: "",
        respuesta: null,
        error: null,
        limitePregunta
    });
}

async function procesarConsulta(req, res) {
    const usuarioId = req.perfil?.usuarioId;
    const entrada = req.body?.pregunta;
    const pregunta = typeof entrada === "string" ? entrada.trim() : "";

    function renderizar(estado, error, respuesta = null) {
        return res.status(estado).render("asistente", {
            ...req.perfil,
            pregunta: pregunta.slice(0, limitePregunta),
            respuesta,
            error,
            limitePregunta
        });
    }

    if (usuarioId == null) {
        return renderizar(401, "Iniciá sesión para consultar a Agrobot.");
    }
    if (typeof entrada !== "string") {
        return renderizar(400, "La pregunta debe ser texto.");
    }
    if (!pregunta) {
        return renderizar(400, "Escribí una pregunta para consultar a Agrobot.");
    }
    if (pregunta.length > limitePregunta) {
        return renderizar(400, `La pregunta puede tener hasta ${limitePregunta} caracteres.`);
    }
    const claveUsuario = String(usuarioId);
    const ahora = Date.now();
    let ventana = consultasPorUsuario.get(claveUsuario);
    if (!ventana || ventana.vence <= ahora) {
        ventana = { vence: ahora + ventanaMs, cantidad: 0 };
        consultasPorUsuario.set(claveUsuario, ventana);
        const ventanaActual = ventana;
        setTimeout(() => {
            if (consultasPorUsuario.get(claveUsuario) === ventanaActual) {
                consultasPorUsuario.delete(claveUsuario);
            }
        }, ventanaMs).unref();
    }
    if (ventana.cantidad >= limiteConsultas) {
        const segundos = Math.ceil((ventana.vence - ahora) / 1000);
        res.set("Retry-After", String(segundos));
        return renderizar(429, `Alcanzaste el límite de consultas. Volvé a intentar en ${segundos} s.`);
    }
    ventana.cantidad += 1;

    let lotes;
    try {
        lotes = await obtenerEstadoLotesDelPerfil(req.perfil);
    } catch {
        return renderizar(503, "No se pudo consultar el tablero de lotes. Intentá de nuevo en unos instantes.");
    }

    const clima = await responderClima(pregunta, lotes);
    if (clima !== null) return renderizar(200, null, clima);

    const fechaActual = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
    const datosLotes = lotes.map(({ _id, nivelActual, fechaUltima }) => ({
        id: _id,
        nivelActual,
        fechaUltima: fechaUltima ?? null
    }));
    const contexto = {
        roles: req.perfil.roles,
        fechaActual,
        ...filtrarUltimosDias(pregunta, fechaActual, datosLotes)
    };
    let seguimiento;
    try {
        seguimiento = await responderSeguimiento(
            pregunta, fechaActual, datosLotes, req.perfil, contexto.periodo
        );
    } catch {
        return renderizar(503, "No se pudo consultar el historial del lote. Intentá de nuevo en unos instantes.");
    }
    if (seguimiento !== null) return renderizar(200, null, seguimiento);
    if (!process.env.GEMINI_API_KEY?.trim() || !process.env.GEMINI_MODEL?.trim()) {
        ventana.cantidad -= 1;
        return renderizar(503, "Falta configurar la clave o el modelo de Gemini. Avisale al administrador.");
    }
    let respuesta;
    try {
        respuesta = await consultarGemini(pregunta, contexto);
    } catch (error) {
        if (error.code === "GEMINI_TIMEOUT") {
            return renderizar(504, "Gemini tardó demasiado en responder. Intentá de nuevo en unos instantes.");
        }
        return renderizar(502, "Gemini no pudo responder a la consulta. Intentá de nuevo en unos instantes.");
    }
    return renderizar(200, null, respuesta);
}

module.exports = { mostrarAsistente, procesarConsulta };
