const path = require("node:path");

// Las variables de la terminal o del hosting tienen prioridad sobre el archivo local.
const resultado = require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
    quiet: true,
    override: false
});

// El hosting puede usar únicamente variables de entorno, sin archivo .env.
if (resultado.error && resultado.error.code !== "ENOENT") {
    throw new Error("No se pudo leer la configuración privada .env");
}
