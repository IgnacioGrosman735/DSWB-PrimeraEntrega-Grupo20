const mongoose = require("mongoose");

async function cerrarDB() {
    try {
        await mongoose.disconnect();
    } catch (error) {
        console.error("No se pudo cerrar la conexión con MongoDB:", error.name);
        process.exitCode = 1;
    }
}

module.exports = cerrarDB;
