const express = require("express");
const app = express();
const PORT = 3100;

const lotesRoutes = require("./routes/lotesRoutes");

app.use(express.json());

// usar rutas
app.use("/lotes", lotesRoutes);

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto " + PORT);
});
