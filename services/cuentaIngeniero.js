const Usuario = require("../models/Usuario");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");
const Rol = require("../models/Rol");

async function cuentaIngenieroValida(usuarioId) {
    if (usuarioId === null) return true;
    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) return false;
    const rol = await Rol.findOne({ nombre: "Ingeniero" });
    return !!(
        rol &&
        (await Usuario.exists({ _id: usuarioId, activo: true })) &&
        (await UsuarioTieneRol.exists({ usuarioId, rolId: rol._id }))
    );
}
async function listarCuentasIngeniero() {
    const rol = await Rol.findOne({ nombre: "Ingeniero" });
    if (!rol) return [];
    const relaciones = await UsuarioTieneRol.find({ rolId: rol._id });
    return Usuario.find({ _id: { $in: relaciones.map((r) => r.usuarioId) }, activo: true }).sort({
        nombre: 1
    });
}
module.exports = { cuentaIngenieroValida, listarCuentasIngeniero };
