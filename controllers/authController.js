const Usuario = require("../models/Usuario");
require("../models/Rol");
const { ITERACIONES } = require("../utils/password");

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

        const cuentaParaValidar =
            usuario ||
            new Usuario({
                salt: "0".repeat(32),
                passwordHash: "0".repeat(128),
                passwordIteraciones: ITERACIONES
            });
        const valido = await cuentaParaValidar.validarPassword(password);
        if (!usuario || !valido || !usuario.activo) {
            return res.status(401).render("login", { error: "Correo o contraseña incorrectos" });
        }
        await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
        req.session.usuarioId = usuario._id;
        await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
        res.redirect(303, "/web/menu");
    } catch (error) {
        next(error);
    }
}

async function cerrarSesion(req, res, next) {
    try {
        await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
        const { nombreCookie, opcionesCookie } = require("../config/sesiones");
        res.clearCookie(nombreCookie, opcionesCookie());
        res.redirect(303, "/login");
    } catch (error) {
        next(error);
    }
}

module.exports = { mostrarLogin, iniciarSesion, cerrarSesion };
