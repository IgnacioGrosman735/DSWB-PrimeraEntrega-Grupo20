const Usuario = require("../models/Usuario");
const Tecnico = require("../models/Tecnico");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");
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
        const usuario = await Usuario.findOne({ usuario: correo }).select("+passwordHash +salt +passwordIteraciones");

        const cuentaParaValidar = usuario || new Usuario({
            salt: "0".repeat(32), passwordHash: "0".repeat(128), passwordIteraciones: ITERACIONES
        });
        const valido = await cuentaParaValidar.validarPassword(password);
        if (!usuario || !valido || !usuario.activo) {
            return res.status(401).render("login", { error: "Correo o contraseña incorrectos" });
        }
        const relaciones = await UsuarioTieneRol.find({ usuarioId: usuario._id }).populate("rolId");
        const roles = relaciones.filter(relacion => relacion.rolId).map(relacion => relacion.rolId.nombre);
        const tecnico = roles.includes("Ingeniero") ? await Tecnico.findOne({ usuarioId: usuario._id }) : null;
        res.render("perfil", { nombre: usuario.nombre, roles, tecnicoId: tecnico?._id || null });
    } catch (error) {
        next(error);
    }
}

module.exports = { mostrarLogin, iniciarSesion };
