const Usuario = require("../models/Usuario");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");
const Tecnico = require("../models/Tecnico");
const Observacion = require("../models/Observacion");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");
const { nombreCookie, opcionesCookie } = require("../config/sesiones");

function rechazar(req, res, estado, mensaje) {
    if (/^\/web(?:\/|\?|$)/i.test(req.originalUrl)) {
        if (estado === 401) return res.redirect("/login");
        return res.status(estado).render("error", { mensaje });
    }
    return res.status(estado).json({ mensaje });
}

async function protegerRuta(req, res, next) {
    try {
        res.set("Cache-Control", "no-store");
        const usuario = req.session.usuarioId
            ? await Usuario.findById(req.session.usuarioId)
            : null;
        if (!usuario || !usuario.activo) {
            if (req.session.usuarioId) {
                await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
                res.clearCookie(nombreCookie, opcionesCookie());
            }
            return rechazar(req, res, 401, "Debés iniciar sesión");
        }
        const relaciones = await UsuarioTieneRol.find({ usuarioId: usuario._id }).populate("rolId");
        const roles = relaciones.filter(r => r.rolId).map(r => r.rolId.nombre);
        const tecnico = roles.includes("Ingeniero")
            ? await Tecnico.findOne({ usuarioId: usuario._id }) : null;
        req.perfil = { usuarioId: usuario._id, nombre: usuario.nombre, roles, tecnicoId: tecnico?._id || null };
        next();
    } catch (error) {
        next(error);
    }
}

const soloAdmin = (req, res, next) => req.perfil.roles.includes("Admin")
    ? next() : rechazar(req, res, 403, "No tenés permisos para realizar esta acción");

function ingenieroPropio(req, res, next) {
    if (req.perfil.roles.includes("Admin")) return next();
    if (req.perfil.roles.includes("Ingeniero") && req.perfil.tecnicoId &&
        Number(req.params.tecnicoId) === req.perfil.tecnicoId) return next();
    return rechazar(req, res, 403, "No tenés permisos para consultar este ingeniero");
}

async function autorizarObservaciones(req, res, next) {
    try {
        if (req.perfil.roles.includes("Admin")) return next();
        const tecnicoId = req.perfil.tecnicoId;
        if (!req.perfil.roles.includes("Ingeniero") || !tecnicoId) {
            return rechazar(req, res, 403, "No tenés permisos para consultar observaciones");
        }
        if (req.method === "POST") {
            if (req.body?.tecnicoId !== tecnicoId) {
                return rechazar(req, res, 403, "Solo podés registrar tus propias observaciones");
            }
        } else if (req.method === "GET") {
            if (req.query.tecnicoId !== undefined && Number(req.query.tecnicoId) !== tecnicoId) {
                return rechazar(req, res, 403, "Solo podés consultar tus propias observaciones");
            }
            if (req.params.id) {
                const observacion = await Observacion.findById(Number(req.params.id));
                if (observacion && (observacion.tecnicoId !== tecnicoId ||
                    !(await TecnicoTieneLote.exists({ tecnicoId, loteId: observacion.loteId })))) {
                    return rechazar(req, res, 403, "Solo podés consultar observaciones de tus lotes asignados");
                }
            }
            req.filtroTecnicoSesion = tecnicoId;
        } else {
            return rechazar(req, res, 403, "No tenés permisos para realizar esta acción");
        }
        next();
    } catch (error) {
        next(error);
    }
}

// Los formularios y fetch de la aplicación trabajan en el mismo origen.
function protegerOrigen(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("Origin");
    if (req.get("Sec-Fetch-Site") === "cross-site" ||
        (origin && origin !== `${req.protocol}://${req.get("host")}`)) {
        return res.status(403).json({ mensaje: "Origen de solicitud no permitido" });
    }
    next();
}

module.exports = { protegerRuta, soloAdmin, ingenieroPropio, autorizarObservaciones, protegerOrigen };
