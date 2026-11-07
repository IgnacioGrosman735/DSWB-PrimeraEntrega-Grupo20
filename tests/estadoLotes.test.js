const { test } = require("node:test");
const assert = require("node:assert/strict");

const { randomUUID } = require("node:crypto");
const { once } = require("node:events");

const mongoose = require("mongoose");
const app = require("../index");

const Productor = require("../models/Productor");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");
const Tecnico = require("../models/Tecnico");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");
const Usuario = require("../models/Usuario");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");

// Pares [lote, nivel] en el orden en que los devuelve la consulta.
const niveles = (lotes) => lotes.map((lote) => [lote._id, lote.nivelActual]);

test("estado actual de los lotes y tablero", { timeout: 60000 }, async (t) => {
    // Base temporal propia: nunca usa MONGODB_URI ni la base de Atlas.
    const dbName = `agrotec_test_${randomUUID().replaceAll("-", "")}`;
    let servidor;
    let conexionPropia = false;

    t.after(async () => {
        try {
            if (servidor) {
                await new Promise((resolve, reject) =>
                    servidor.close((error) => (error ? reject(error) : resolve()))
                );
            }
        } finally {
            try {
                if (conexionPropia && mongoose.connection.readyState === 1) {
                    // Antes de borrar, verificamos el nombre generado y la base conectada.
                    assert.match(dbName, /^agrotec_test_[a-f0-9]{32}$/);
                    assert.equal(mongoose.connection.name, dbName);
                    await mongoose.connection.db.dropDatabase();
                }
            } finally {
                await mongoose.disconnect();
            }
        }
    });

    await mongoose.connect(process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017", {
        dbName,
        autoIndex: false,
        autoCreate: false,
        serverSelectionTimeoutMS: 5000
    });
    conexionPropia = true;
    assert.equal(mongoose.connection.name, dbName);
    await require("../config/coleccionesAuth").prepararColeccionesAuth(mongoose.connection.db);
    await require("../config/coleccionesNegocio").prepararColeccionesNegocio(
        mongoose.connection.db
    );

    await TipoCultivo.create({ _id: 1, nombre: "Soja" });
    await Productor.create({ _id: 1, nombre: "Productor de prueba" });
    await Lote.create(
        [1, 2, 3, 4, 5].map((id) => ({
            _id: id, hectareas: 100 * id, tipoCultivoId: 1, productorId: 1, ubicacion: "Lote " + id
        }))
    );

    const observacion = (id, loteId, fecha, nivelAlerta, estado = "Cargada") => ({
        _id: id, loteId, tecnicoId: 1, tipoCultivoId: 1, fecha,
        estadoCultivo: "Prueba", observaciones: "Prueba", nivelAlerta, estado
    });
    await Observacion.create([
        // Lote 1: gana la más reciente por fecha.
        observacion(1, 1, "2026-01-10", "Normal"),
        observacion(2, 1, "2026-02-10", "Crítico"),
        // Lote 2: misma fecha, desempata el _id mayor.
        observacion(3, 2, "2026-03-01", "Normal"),
        observacion(4, 2, "2026-03-01", "Atención"),
        // Lote 3: la pendiente es la más nueva, pero no cuenta.
        observacion(5, 3, "2026-01-01", "Normal"),
        observacion(6, 3, "2026-05-01", "Crítico", "Pendiente")
    ]);
    // Lote 4: observación histórica sin campo estado, como las de la primera importación.
    // Se inserta sin Mongoose para que no complete el valor por defecto.
    await mongoose.connection.db.collection("observaciones").insertOne({
        _id: 7, loteId: 4, tecnicoId: 1, tipoCultivoId: 1, fecha: "2026-04-01",
        estadoCultivo: "Prueba", observaciones: "Prueba", nivelAlerta: "Atención"
    });
    // Lote 5: sin observaciones.

    await t.test("toma la última observación válida y ordena por prioridad", async () => {
        const lotes = await Lote.obtenerEstadoActual();
        assert.deepEqual(niveles(lotes), [
            [1, "Crítico"], [2, "Atención"], [4, "Atención"], [5, "Sin datos"], [3, "Normal"]
        ]);
        const sinDatos = lotes.find((lote) => lote._id === 5);
        assert.equal(sinDatos.fechaUltima, undefined);
        assert.equal(sinDatos.productor, "Productor de prueba");
        assert.equal(sinDatos.cultivo, "Soja");
    });

    await t.test("filtra por lotes y un filtro vacío no devuelve nada", async () => {
        assert.deepEqual(niveles(await Lote.obtenerEstadoActual([3, 1])), [
            [1, "Crítico"], [3, "Normal"]
        ]);
        assert.deepEqual(await Lote.obtenerEstadoActual([]), []);
        // El filtro anterior no queda guardado en la consulta compartida.
        assert.equal((await Lote.obtenerEstadoActual()).length, 5);
    });

    // Usuarios para las pruebas HTTP: un Admin y un Ingeniero con los lotes 3 y 5.
    process.env.SESSION_SECRET = randomUUID() + randomUUID();
    await require("../config/sesiones").prepararSesiones(app);
    const password = "ClaveDePrueba123456";
    for (const [id, rolId] of [[900001, 1], [900002, 2]]) {
        await Usuario.create({
            _id: id, nombre: "Usuario " + id, usuario: `u${id}@prueba.test`,
            ...await Usuario.crearPasswordSeguro(password), activo: true
        });
        await UsuarioTieneRol.create({ _id: id, usuarioId: id, rolId });
    }
    await Tecnico.create({ _id: 1, nombre: "Ingeniero de prueba", usuarioId: 900002 });
    await TecnicoTieneLote.create([
        { _id: 1, tecnicoId: 1, loteId: 3 },
        { _id: 2, tecnicoId: 1, loteId: 5 }
    ]);

    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const base = `http://127.0.0.1:${servidor.address().port}`;

    const iniciarSesion = async (usuario) => {
        const respuesta = await fetch(base + "/auth/login", {
            method: "POST", redirect: "manual",
            headers: { "Content-Type": "application/json", Connection: "close" },
            body: JSON.stringify({ usuario, password })
        });
        assert.equal(respuesta.status, 303);
        await respuesta.text();
        return respuesta.headers.get("set-cookie").split(";")[0];
    };
    const pedir = (ruta, cookie) =>
        fetch(base + ruta, {
            redirect: "manual",
            headers: { Connection: "close", ...(cookie ? { Cookie: cookie } : {}) }
        });

    await t.test("GET /lotes/estado: exige sesión y no lo captura la ruta /:id", async () => {
        const sinSesion = await pedir("/lotes/estado");
        assert.equal(sinSesion.status, 401);
        await sinSesion.text();

        const respuesta = await pedir("/lotes/estado", await iniciarSesion("u900001@prueba.test"));
        assert.equal(respuesta.status, 200);
        const ids = (await respuesta.json()).map((lote) => lote._id);
        assert.deepEqual(ids, [1, 2, 4, 5, 3]);
    });

    await t.test("GET /web/tablero: el ingeniero ve solo sus lotes asignados", async () => {
        const respuesta = await pedir("/web/tablero", await iniciarSesion("u900002@prueba.test"));
        assert.equal(respuesta.status, 200);
        const html = await respuesta.text();
        const filas = [...html.matchAll(/<span class="nivel [a-z-]+">([^<]+)<\/span>/g)].map(
            (coincidencia) => coincidencia[1]
        );
        assert.deepEqual(filas, ["Sin datos", "Normal"]);
    });
});
