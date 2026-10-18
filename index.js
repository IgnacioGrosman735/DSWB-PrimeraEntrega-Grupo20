const express = require("express");
const mongoose = require("mongoose");
const conectarDB = require("./config/database");
const cerrarDB = require("./config/cerrarDB");
const path = require("path");
const logger = require("./middleware/logger");
const lotesRoutes = require("./routes/lotesRoutes");
const vistasRoutes = require("./routes/vistasRoutes");
const productoresRoutes = require("./routes/productoresRoutes");
const tecnicosRoutes = require("./routes/tecnicosRoutes");
const observacionesRoutes = require("./routes/observacionesRoutes");
const authRoutes = require("./routes/authRoutes");
const { prepararColeccionesAuth } = require("./config/coleccionesAuth");

const { prepararColeccionesNegocio } = require("./config/coleccionesNegocio");

const app = express();
const PORT = process.env.PORT || 3100;

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use("/js", express.static(path.join(__dirname, "public/js")));

app.use(authRoutes);

// Etapa sin sesiones: los CRUD todavía no tienen control de acceso.
app.use("/lotes", lotesRoutes);
app.use("/productores", productoresRoutes);
app.use("/tecnicos", tecnicosRoutes);
app.use("/tipos-cultivo", require("./routes/tiposCultivoRoutes"));
app.use("/observaciones", observacionesRoutes);
app.use("/web", vistasRoutes);

app.get("/", (req, res) => res.redirect("/login"));

app.use((req, res) => {
    res.status(404).json({ mensaje: "Ruta no encontrada" });
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    let estado = error.status || 500;
    if (
        error.name === "ValidationError" ||
        error.name === "CastError" ||
        error.code === 11000 ||
        error.code === 121
    ) {
        estado = 400;
    }
    const mensaje =
        error.code === 11000
            ? error.keyPattern?.usuario
                ? "Ese correo ya tiene una cuenta"
                : error.keyPattern?.usuarioId
                  ? "Esa cuenta ya está vinculada a una ficha"
                  : "Ya existe un registro con ese ID"
            : estado >= 500
              ? "Error interno del servidor"
              : error.mensajePublico || "Solicitud inválida";
    console.error("Error al procesar la solicitud:", error.name);

    if (req.originalUrl.startsWith("/web")) {
        return res.status(estado).render("error", { mensaje });
    }

    res.status(estado).json({ mensaje });
});

const iniciar = async () => {
    try {
        await conectarDB();
        await prepararColeccionesAuth(mongoose.connection.db);
        await prepararColeccionesNegocio(mongoose.connection.db);
        const servidor = app.listen(PORT, () => {
            console.log("Servidor corriendo en puerto " + PORT);
        });
        servidor.on("error", async () => {
            console.error("No se pudo iniciar el servidor HTTP");
            process.exitCode = 1;
            await cerrarDB();
        });
    } catch (error) {
        console.error("No se pudo preparar MongoDB. El servidor HTTP no se inició:", error.name);
        process.exitCode = 1;
        await cerrarDB();
    }
};

if (require.main === module) {
    iniciar();
}

module.exports = app;
