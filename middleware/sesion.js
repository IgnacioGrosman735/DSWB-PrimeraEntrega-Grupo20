const Usuario = require("../models/Usuario");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");
const Tecnico = require("../models/Tecnico");
const Observacion = require("../models/Observacion");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");
const { nombreCookie, opcionesCookie } = require("../config/sesiones");

function rechazar(req, res, estado, mensaje) {
    const ruta = req.originalUrl.split("?")[0].toLowerCase();
    const esVista = ruta === "/web" || ruta.startsWith("/web/");
    if (esVista) {
        if (estado === 401) {
            return res.redirect("/login");
        }
        return res.status(estado).render("error", { mensaje });
    }
    return res.status(estado).json({ mensaje });
}

async function protegerRuta(req, res, next) {
    try {
        res.set("Cache-Control", "no-store");
        // La sesión conserva el ID; los datos actuales se consultan en la base.
        let usuario = null;
        if (req.session.usuarioId) {
            usuario = await Usuario.findById(req.session.usuarioId);
        }
        if (!usuario || !usuario.activo) {
            if (req.session.usuarioId) {
                await new Promise((resolve, reject) => {
                    req.session.destroy((error) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        resolve();
                    });
                });
                res.clearCookie(nombreCookie, opcionesCookie());
            }
            return rechazar(req, res, 401, "Debés iniciar sesión");
        }
        const relaciones = await UsuarioTieneRol.find({ usuarioId: usuario._id }).populate("rolId");
        const roles = [];
        for (const relacion of relaciones) {
            if (relacion.rolId) {
                roles.push(relacion.rolId.nombre);
            }
        }

        let tecnicoId = null;
        if (roles.includes("Ingeniero")) {
            const tecnico = await Tecnico.findOne({ usuarioId: usuario._id });
            if (tecnico) {
                tecnicoId = tecnico._id;
            }
        }

        // Los controladores reciben el perfil de esta solicitud en req.perfil.
        req.perfil = {
            usuarioId: usuario._id,
            nombre: usuario.nombre,
            roles: roles,
            tecnicoId: tecnicoId
        };
        next();
    } catch (error) {
        next(error);
    }
}

function soloAdmin(req, res, next) {
    if (!req.perfil.roles.includes("Admin")) {
        return rechazar(req, res, 403, "No tenés permisos para realizar esta acción");
    }
    next();
}

function ingenieroPropio(req, res, next) {
    if (req.perfil.roles.includes("Admin")) {
        return next();
    }
    const esIngeniero = req.perfil.roles.includes("Ingeniero");
    const tieneFicha = req.perfil.tecnicoId !== null;
    const esSuFicha = Number(req.params.tecnicoId) === req.perfil.tecnicoId;
    if (esIngeniero && tieneFicha && esSuFicha) {
        return next();
    }
    return rechazar(req, res, 403, "No tenés permisos para consultar este ingeniero");
}

async function autorizarObservaciones(req, res, next) {
    try {
        if (req.perfil.roles.includes("Admin")) {
            return next();
        }
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
                if (observacion) {
                    if (observacion.tecnicoId !== tecnicoId) {
                        return rechazar(req, res, 403, "Solo podés consultar observaciones de tus lotes asignados");
                    }
                    const asignacion = await TecnicoTieneLote.exists({
                        tecnicoId: tecnicoId,
                        loteId: observacion.loteId
                    });
                    if (!asignacion) {
                        return rechazar(req, res, 403, "Solo podés consultar observaciones de tus lotes asignados");
                    }
                }
            }
            // El controlador usará este ID para filtrar los resultados.
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
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }
    const origenRecibido = req.get("Origin");
    const origenAplicacion = `${req.protocol}://${req.get("host")}`;
    const vieneDeOtroSitio = req.get("Sec-Fetch-Site") === "cross-site";
    const origenDiferente = origenRecibido && origenRecibido !== origenAplicacion;
    if (vieneDeOtroSitio || origenDiferente) {
        return res.status(403).json({ mensaje: "Origen de solicitud no permitido" });
    }
    next();
}

module.exports = { protegerRuta, soloAdmin, ingenieroPropio, autorizarObservaciones, protegerOrigen };
