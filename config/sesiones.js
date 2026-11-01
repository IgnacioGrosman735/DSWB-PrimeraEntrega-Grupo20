const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");

const nombreCookie = "agrotec.sid";
const duracion = 30 * 60 * 1000;
const opcionesCookie = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
});

function validarSecreto() {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
        throw new Error("Configurá SESSION_SECRET con un secreto aleatorio de al menos 32 caracteres");
    }
}

async function prepararSesiones(app) {
    validarSecreto();
    // Compartir la conexión y la base activa, incluida la base aislada de pruebas.
    const store = MongoStore.create({
        client: mongoose.connection.getClient(),
        dbName: mongoose.connection.name,
        collectionName: "sesiones",
        ttl: duracion / 1000,
        autoRemove: "disabled"
    });
    await mongoose.connection.db.collection("sesiones").createIndex(
        { expires: 1 }, { expireAfterSeconds: 0 }
    );
    store.on("error", () => console.error("Error en el almacenamiento de sesiones"));
    app.locals.middlewareSesion = session({
        name: nombreCookie,
        secret: process.env.SESSION_SECRET,
        store,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: { ...opcionesCookie(), maxAge: duracion }
    });
}

module.exports = { prepararSesiones, validarSecreto, nombreCookie, opcionesCookie };
