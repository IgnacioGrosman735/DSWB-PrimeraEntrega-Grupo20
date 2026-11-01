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

const { prepararSesiones, validarSecreto } = require("./config/sesiones");
const { protegerRuta, soloAdmin, protegerOrigen } = require("./middleware/sesion");
const app = express();
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
const PORT = process.env.PORT || 3100;

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use("/js", express.static(path.join(__dirname, "public/js")));

app.use((req, res, next) => {
    if (!app.locals.middlewareSesion) return next(new Error("Sesiones no inicializadas"));
    app.locals.middlewareSesion(req, res, next);
});
app.use(protegerOrigen);
app.use(authRoutes);

// La API y las vistas privadas verifican la sesión en el servidor.
app.use("/lotes", protegerRuta, soloAdmin, lotesRoutes);
app.use("/productores", protegerRuta, soloAdmin, productoresRoutes);
app.use("/tecnicos", protegerRuta, soloAdmin, tecnicosRoutes);
app.use("/tipos-cultivo", protegerRuta, soloAdmin, require("./routes/tiposCultivoRoutes"));
app.use("/observaciones", protegerRuta, observacionesRoutes);
app.use("/web", protegerRuta, vistasRoutes);

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
        validarSecreto();
        await conectarDB();
        await prepararColeccionesAuth(mongoose.connection.db);
        await prepararColeccionesNegocio(mongoose.connection.db);
        await prepararSesiones(app);
        const servidor = app.listen(PORT, () => {
            console.log("Servidor corriendo en puerto " + PORT);
        });
        servidor.on("error", async () => {
            console.error("No se pudo iniciar el servidor HTTP");
            process.exitCode = 1;
            await cerrarDB();
        });
    } catch (error) {
        console.error("El servidor HTTP no se inició:",
            error.message.startsWith("Configurá SESSION_SECRET") ? error.message : error.name);
        process.exitCode = 1;
        await cerrarDB();
    }
};

if (require.main === module) {
    iniciar();
}

module.exports = app;
