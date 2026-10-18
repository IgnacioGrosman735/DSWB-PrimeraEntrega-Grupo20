const normalizarEmail = email => typeof email === "string" ? email.trim().toLowerCase() : "";
const emailValido = email => typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const nombreValido = nombre => typeof nombre === "string" && nombre.trim().length >= 1 && nombre.trim().length <= 100;

module.exports = { normalizarEmail, emailValido, nombreValido };
