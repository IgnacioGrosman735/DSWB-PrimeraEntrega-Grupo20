const express = require("express");
const path = require("path");
const logger = require("./middleware/logger");
const lotesRoutes = require("./routes/lotesRoutes");
const vistasRoutes = require("./routes/vistasRoutes");
const productoresRoutes = require("./routes/productoresRoutes");
const tecnicosRoutes = require("./routes/tecnicosRoutes");
const observacionesRoutes = require("./routes/observacionesRoutes");

const app = express();
const PORT = 3100;

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
    const estado = error.status || 500;
    const mensaje = estado >= 500 ? "Error interno del servidor" : "Solicitud inválida";
    console.error(error.message);

    if (req.originalUrl.startsWith("/web")) {
        return res.status(estado).render("error", { mensaje });
    }

    res.status(estado).json({ mensaje });
});

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto " + PORT);
});
