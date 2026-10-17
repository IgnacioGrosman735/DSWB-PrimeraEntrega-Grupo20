const express = require("express");
const mongoose = require("mongoose");
const conectarDB = require("./config/database");
const path = require("path");
const logger = require("./middleware/logger");
const lotesRoutes = require("./routes/lotesRoutes");
const vistasRoutes = require("./routes/vistasRoutes");
const productoresRoutes = require("./routes/productoresRoutes");
const tecnicosRoutes = require("./routes/tecnicosRoutes");
const observacionesRoutes = require("./routes/observacionesRoutes");

const app = express();
const PORT = process.env.PORT || 3100;

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(logger);
app.use(express.json());

// Rutas de la API y de las vistas.
app.use("/lotes", lotesRoutes);
app.use("/productores", productoresRoutes);
app.use("/tecnicos", tecnicosRoutes);
app.use("/observaciones", observacionesRoutes);
app.use("/web", vistasRoutes);
app.get("/", (req, res) => res.redirect("/web/lotes"));

app.use((req, res) => {
    res.status(404).json({ mensaje: "Ruta no encontrada" });
});

// Express envía aquí los errores de lectura/escritura y del body JSON.
app.use((error, req, res, next) => {
    let estado = error.status || 500;
    if (error.name === "ValidationError" || error.name === "CastError" || error.code === 11000) {
        estado = 400;
    }
    const mensaje = error.code === 11000 ? "Ya existe un registro con ese ID" :
        estado >= 500 ? "Error interno del servidor" : "Solicitud inválida";
    console.error("Error al procesar la solicitud:", error.name);

    if (req.originalUrl.startsWith("/web")) {
        return res.status(estado).render("error", { mensaje });
    }

    res.status(estado).json({ mensaje });
});

const iniciar = async () => {
    try {
        await conectarDB();
        const servidor = app.listen(PORT, () => {
            console.log("Servidor corriendo en puerto " + PORT);
        });
        servidor.on("error", async () => {
            console.error("No se pudo iniciar el servidor HTTP");
            await mongoose.disconnect();
            process.exitCode = 1;
        });
    } catch (error) {
        console.error("No se pudo conectar con MongoDB. El servidor HTTP no se inició.");
        await mongoose.disconnect();
        process.exitCode = 1;
    }
};

// Notas - Andrea | Inicio | Exportar la aplicación para pruebas sin iniciar el servidor
if (require.main === module) {
    iniciar();
}

module.exports = app;
// Notas - Andrea | Fin | Exportar la aplicación para pruebas sin iniciar el servidor
