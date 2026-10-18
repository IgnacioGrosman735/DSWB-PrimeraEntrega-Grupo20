const Usuario = require("../models/Usuario");
const Rol = require("../models/Rol");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");
const { normalizarEmail, emailValido, nombreValido } = require("../utils/datosUsuario");
const { passwordValida } = require("../utils/password");

async function crearAcceso(ficha, nombreRol, datos) {
    const usuario = normalizarEmail(datos.usuario);
    const invalido = (mensaje) =>
        Object.assign(new Error(mensaje), { status: 400, mensajePublico: mensaje });
    if (ficha.usuarioId) throw invalido("Esta ficha ya tiene una cuenta vinculada");
    if (!Number.isSafeInteger(datos.cuentaId) || datos.cuentaId <= 0) {
        throw invalido("Ingresá un ID entero positivo para el usuario");
    }
    if (await Usuario.exists({ _id: datos.cuentaId }))
        throw invalido("Ese ID de usuario ya existe");
    if (await UsuarioTieneRol.exists({ _id: datos.cuentaId }))
        throw invalido("El ID del usuario ya está ocupado por una relación usuario-rol");
    if (!nombreValido(ficha.nombre) || !emailValido(usuario) || !passwordValida(datos.password)) {
        throw invalido(
            "Ingresá un nombre de hasta 100 caracteres, correo válido y contraseña de 15 a 128 caracteres"
        );
    }
    if (await Usuario.exists({ usuario })) throw invalido("Ese correo ya tiene una cuenta");
    const rol = await Rol.findOne({ nombre: nombreRol });
    if (!rol) throw new Error("No se encontró el rol para crear el acceso");
    const credenciales = await Usuario.crearPasswordSeguro(datos.password);
    let cuenta;
    let relacion;
    try {
        cuenta = await Usuario.create({
            _id: datos.cuentaId,
            nombre: ficha.nombre,
            usuario,
            ...credenciales,
            activo: true
        });
        // Una relación por usuario: reutilizamos su ID, sin autoincremento.
        relacion = await UsuarioTieneRol.create({
            _id: datos.cuentaId,
            usuarioId: cuenta._id,
            rolId: rol._id
        });
        ficha.usuarioId = cuenta._id;
        await ficha.save();
        return ficha;
    } catch (error) {
        if (relacion) await UsuarioTieneRol.deleteOne({ _id: relacion._id });
        if (cuenta) await Usuario.deleteOne({ _id: cuenta._id });
        ficha.usuarioId = undefined;
        throw error;
    }
}

module.exports = { crearAcceso };
