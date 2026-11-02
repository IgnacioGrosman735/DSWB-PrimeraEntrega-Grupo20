const Usuario = require("../models/Usuario");
require("../models/Rol");
const { ITERACIONES } = require("../utils/password");
const { nombreCookie, opcionesCookie } = require("../config/sesiones");

const mostrarLogin = (req, res, next) => {
    try {
        res.render("login", { error: null });
    } catch (error) {
        next(error);
    }
};

async function iniciarSesion(req, res, next) {
    try {
        const { usuario: correo, password } = req.credenciales;
        const usuario = await Usuario.findOne({ usuario: correo }).select(
            "+passwordHash +salt +passwordIteraciones"
        );

        // También calculamos un hash si el correo no existe.
        let cuentaParaValidar = usuario;
        if (!cuentaParaValidar) {
            cuentaParaValidar = new Usuario({
                salt: "0".repeat(32),
                passwordHash: "0".repeat(128),
                passwordIteraciones: ITERACIONES
            });
        }
        const valido = await cuentaParaValidar.validarPassword(password);
        if (!usuario || !valido || !usuario.activo) {
            return res.status(401).render("login", { error: "Correo o contraseña incorrectos" });
        }
        // Crear un identificador nuevo después de validar las credenciales.
        await new Promise((resolve, reject) => {
            req.session.regenerate((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        req.session.usuarioId = usuario._id;
        // Esperar a que MongoDB guarde la sesión antes de abrir el menú.
        await new Promise((resolve, reject) => {
            req.session.save((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        res.redirect(303, "/web/menu");
    } catch (error) {
        next(error);
    }
}

async function cerrarSesion(req, res, next) {
    try {
        // Eliminar la sesión del servidor antes de borrar la cookie.
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
        res.redirect(303, "/login");
    } catch (error) {
        next(error);
    }
}

module.exports = { mostrarLogin, iniciarSesion, cerrarSesion };
