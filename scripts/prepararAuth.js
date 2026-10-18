const mongoose = require("mongoose");
const cerrarDB = require("../config/cerrarDB");
const { prepararColeccionesAuth } = require("../config/coleccionesAuth");

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/agrotec", {
            serverSelectionTimeoutMS: 5000
        });
        await prepararColeccionesAuth(mongoose.connection.db);
        console.log(
            "Colecciones, validadores, índices y roles preparados. No se crearon cuentas ni contraseñas predeterminadas."
        );
    } catch (error) {
        console.error("No se pudo preparar autenticación:", error.name, error.code || "");
        process.exitCode = 1;
    } finally {
        await cerrarDB();
    }
})();
