// Notas - Andrea | Inicio | Reglas comunes de validación de entrada
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

const alertaValida = valor => ["Normal", "Atención", "Crítico"].includes(valor);

module.exports = {
    idValido,
    textoValido,
    hectareasValidas,
    fechaValida,
    alertaValida
};
// Notas - Andrea | Fin | Reglas comunes de validación de entrada
