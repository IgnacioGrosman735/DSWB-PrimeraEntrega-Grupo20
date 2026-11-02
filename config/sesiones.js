const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");

const nombreCookie = "agrotec.sid";
// La cookie expresa la duración en milisegundos.
const duracion = 30 * 60 * 1000;
function opcionesCookie() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/"
    };
}

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
    // Creamos el índice aquí para esperar su preparación antes de iniciar Express.
    // MongoDB elimina las sesiones cuando vence la fecha del campo expires.
    await mongoose.connection.db.collection("sesiones").createIndex(
        { expires: 1 },
        { expireAfterSeconds: 0 }
    );
    store.on("error", () => {
        console.error("Error en el almacenamiento de sesiones");
    });
    const cookie = opcionesCookie();
    cookie.maxAge = duracion;

    // index.js usa este middleware una vez que MongoDB está conectado.
    app.locals.middlewareSesion = session({
        name: nombreCookie,
        secret: process.env.SESSION_SECRET,
        store,
        resave: false, // No reescribir toda la sesión si no cambió.
        saveUninitialized: false, // No guardar sesiones vacías.
        rolling: true, // Renovar el vencimiento durante el uso.
        cookie: cookie
    });
}

module.exports = { prepararSesiones, validarSecreto, nombreCookie, opcionesCookie };
