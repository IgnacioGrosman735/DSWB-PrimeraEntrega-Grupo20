const { normalizarEmail, emailValido } = require("../utils/datosUsuario");

function validarLogin(req, res, next) {
    const { usuario, password } = req.body || {};
    const correo = normalizarEmail(usuario);
    if (
        !emailValido(correo) ||
        typeof password !== "string" ||
        password.length < 15 ||
        password.length > 128
    ) {
        return res
            .status(400)
            .render("login", {
                error: "Ingresá un correo válido y una contraseña de 15 a 128 caracteres."
            });
    }
    req.credenciales = { usuario: correo, password };
    next();
}

module.exports = { validarLogin };
