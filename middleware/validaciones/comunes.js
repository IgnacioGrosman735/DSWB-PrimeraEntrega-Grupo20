// Notas - Andrea | Inicio | Reglas comunes de validación de entrada
// Notas - Andrea | Inicio | Usar catálogo único de niveles de alerta
const nivelesAlerta = require("../../config/nivelesAlerta");
// Notas - Andrea | Fin | Usar catálogo único de niveles de alerta

const idValido = valor => Number.isSafeInteger(valor) && valor > 0;

const textoValido = valor => typeof valor === "string" && valor.trim() !== "";

const hectareasValidas = valor => typeof valor === "number" && Number.isFinite(valor) && valor > 0;

const fechaValida = valor => {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const fecha = new Date(valor);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};

// Notas - Andrea | Inicio | Validación con catálogo único de alertas
const alertaValida = valor => nivelesAlerta.includes(valor);
// Notas - Andrea | Fin | Validación con catálogo único de alertas

module.exports = {
    idValido,
    textoValido,
    hectareasValidas,
    fechaValida,
    alertaValida
};
// Notas - Andrea | Fin | Reglas comunes de validación de entrada
