const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const mongoose = require("mongoose");
const app = require("../index");
const { prepararSesiones, validarSecreto } = require("../config/sesiones");
const Usuario = require("../models/Usuario");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");
const Tecnico = require("../models/Tecnico");
const Lote = require("../models/Lote");
const TipoCultivo = require("../models/TipoCultivo");
const Asignacion = require("../models/TecnicoTieneLote");

test("sesiones persistentes, cookies y permisos", { timeout: 60000 }, async t => {
    const dbName = `agrotec_test_${randomUUID().replaceAll("-", "")}`;
    let servidor;
    t.after(async () => {
        try {
            if (servidor) await new Promise(resolve => servidor.close(resolve));
            if (mongoose.connection.readyState === 1) {
                assert.equal(mongoose.connection.name, dbName);
                assert.match(dbName, /^agrotec_test_[a-f0-9]{32}$/);
                await mongoose.connection.db.dropDatabase();
            }
        } finally { await mongoose.disconnect(); }
    });
    process.env.SESSION_SECRET = "";
    assert.throws(validarSecreto, /SESSION_SECRET/);
    process.env.SESSION_SECRET = randomUUID() + randomUUID();
    await mongoose.connect(process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017", {
        dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000
    });
    await require("../config/coleccionesAuth").prepararColeccionesAuth(mongoose.connection.db);
    await require("../config/coleccionesNegocio").prepararColeccionesNegocio(mongoose.connection.db);
    await prepararSesiones(app);
    const password = "PasswordTemporal123456";
    const credenciales = await Usuario.crearPasswordSeguro(password);
    for (const [id, rolId] of [[1, 1], [2, 2], [3, 3], [4, 2]]) {
        await Usuario.create({ _id: id, nombre: `Usuario ${id}`, usuario: `usuario${id}@prueba.test`, ...credenciales });
        await UsuarioTieneRol.create({ _id: id, usuarioId: id, rolId });
    }
    await Tecnico.create([{ _id: 2, nombre: "Ingeniero", usuarioId: 2 }, { _id: 4, nombre: "Otro", usuarioId: 4 }]);
    await TipoCultivo.create({ _id: 1, nombre: "Maíz" });
    await Lote.create({ _id: 1, hectareas: 10, ubicacion: "Prueba", tipoCultivoId: 1 });
    await Asignacion.create({ _id: 1, tecnicoId: 2, loteId: 1 });
    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const base = `http://127.0.0.1:${servidor.address().port}`;
    async function pedir(ruta, { cookie, body, method = "GET", headers = {} } = {}) {
        const r = await fetch(base + ruta, {
            method, redirect: "manual",
            headers: { Connection: "close", ...(cookie ? { Cookie: cookie } : {}),
                ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
            body: body ? JSON.stringify(body) : undefined
        });
        const texto = await r.text();
        return { status: r.status, headers: r.headers, texto, cookie: r.headers.get("set-cookie")?.split(";")[0] };
    }
    const login = (id, cookie) => pedir("/auth/login", {
        method: "POST", cookie, body: { usuario: `usuario${id}@prueba.test`, password }
    });
    const sesiones = mongoose.connection.db.collection("sesiones");
    await t.test("sin sesión: vistas redirigen y API devuelve 401", async () => {
        const r = await pedir("/web/menu");
        assert.equal(r.status, 302);
        assert.equal(r.headers.get("location"), "/login");
        for (const ruta of ["/lotes", "/productores", "/tecnicos", "/observaciones", "/tipos-cultivo"]) {
            assert.equal((await pedir(ruta)).status, 401);
        }
        assert.equal(await sesiones.countDocuments(), 0);
        const incorrecto = await pedir("/auth/login", { method: "POST", body: { usuario: "usuario1@prueba.test", password: "Incorrecta123456789" } });
        assert.equal(incorrecto.status, 401);
        assert.equal(incorrecto.cookie, undefined);
    });
    let admin, ingeniero, cliente;
    await t.test("login crea cookie segura y guarda solo el ID del usuario", async () => {
        admin = await login(1);
        ingeniero = await login(2);
        cliente = await login(3);
        assert.equal(admin.status, 303);
        assert.equal(admin.headers.get("location"), "/web/menu");
        const cookie = admin.headers.get("set-cookie");
        assert.match(cookie, /HttpOnly/);
        assert.match(cookie, /SameSite=Strict/);
        assert.match(cookie, /Expires=/);
        assert.doesNotMatch(cookie, /Password|usuario1/);
        const guardadas = await sesiones.find().toArray();
        assert.equal(guardadas.length, 3);
        for (const s of guardadas) {
            assert.deepEqual(Object.keys(JSON.parse(s.session)).sort(), ["cookie", "usuarioId"]);
        }
        const menu = await pedir("/web/menu", { cookie: admin.cookie });
        assert.match(menu.texto, /Bienvenido, Usuario 1/);
        assert.doesNotMatch(menu.texto, /menu.js|sessionStorage/);
        assert.equal(menu.headers.get("cache-control"), "no-store");
        await prepararSesiones(app);
        assert.equal((await pedir("/web/menu", { cookie: admin.cookie })).status, 200);
    });
    await t.test("roles, identidad y asignación se verifican en el servidor", async () => {
        assert.equal((await pedir("/lotes", { cookie: admin.cookie })).status, 200);
        assert.equal((await pedir("/lotes", { cookie: ingeniero.cookie })).status, 403);
        assert.equal((await pedir("/web/lotes", { cookie: cliente.cookie })).status, 403);
        assert.equal((await pedir("/web/menu", { cookie: cliente.cookie })).status, 200);
        assert.equal((await pedir("/web/ingenieros/2/lotes", { cookie: ingeniero.cookie })).status, 200);
        assert.equal((await pedir("/web/ingenieros/4/lotes", { cookie: ingeniero.cookie })).status, 403);
        const body = { _id: 1, tecnicoId: 4, loteId: 1, tipoCultivoId: 1, estadoCultivo: "Bueno", observaciones: "Prueba", nivelAlerta: "Normal" };
        assert.equal((await pedir("/observaciones", { method: "POST", cookie: ingeniero.cookie, body })).status, 403);
        body.tecnicoId = 2;
        assert.equal((await pedir("/observaciones", { method: "POST", cookie: ingeniero.cookie, body })).status, 201);
        assert.equal(JSON.parse((await pedir("/observaciones", { cookie: ingeniero.cookie })).texto).length, 1);
        const otro = await login(4);
        assert.equal((await pedir("/observaciones/1", { cookie: otro.cookie })).status, 403);
        assert.equal((await pedir("/observaciones?tecnicoId=4", { cookie: ingeniero.cookie })).status, 403);
        await Asignacion.deleteOne({ _id: 1 });
        assert.equal((await pedir("/observaciones/1", { cookie: ingeniero.cookie })).status, 403);
        assert.deepEqual(JSON.parse((await pedir("/observaciones", { cookie: ingeniero.cookie })).texto), []);
        await UsuarioTieneRol.deleteOne({ usuarioId: 1 });
        assert.equal((await pedir("/lotes", { cookie: admin.cookie })).status, 403);
        await UsuarioTieneRol.create({ _id: 1, usuarioId: 1, rolId: 1 });
    });
    await t.test("rechaza solicitudes de otro origen y regenera el identificador", async () => {
        assert.equal((await pedir("/auth/logout", { method: "POST", cookie: admin.cookie, headers: { Origin: "https://otro.test" } })).status, 403);
        const nuevo = await login(1, admin.cookie);
        assert.notEqual(nuevo.cookie, admin.cookie);
        assert.equal((await pedir("/lotes", { cookie: admin.cookie })).status, 401);
        admin = nuevo;
        assert.equal((await pedir("/lotes", { cookie: admin.cookie + "alterada" })).status, 401);
    });
    await t.test("logout, cuenta inactiva y vencimiento invalidan el acceso", async () => {
        const salida = await pedir("/auth/logout", { method: "POST", cookie: admin.cookie });
        assert.equal(salida.status, 303);
        assert.match(salida.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/);
        assert.equal((await pedir("/lotes", { cookie: admin.cookie })).status, 401);
        await Usuario.updateOne({ _id: 2 }, { activo: false });
        assert.equal((await pedir("/observaciones", { cookie: ingeniero.cookie })).status, 401);
        assert.equal((await login(2)).status, 401);
        await sesiones.updateMany({}, { $set: { expires: new Date(0) } });
        assert.equal((await pedir("/web/menu", { cookie: cliente.cookie })).status, 302);
    });
    await t.test("producción exige HTTPS para emitir la cookie", async () => {
        const entornoAnterior = process.env.NODE_ENV;
        const proxyAnterior = app.get("trust proxy");
        try {
            process.env.NODE_ENV = "production";
            app.set("trust proxy", 1);
            await prepararSesiones(app);
            const body = { usuario: "usuario1@prueba.test", password };
            const https = await pedir("/auth/login", {
                method: "POST", body, headers: { "X-Forwarded-Proto": "https" }
            });
            assert.equal(https.status, 303);
            assert.match(https.headers.get("set-cookie"), /; Secure/);
            const http = await pedir("/auth/login", { method: "POST", body });
            assert.equal(http.headers.get("set-cookie"), null);
        } finally {
            if (entornoAnterior === undefined) delete process.env.NODE_ENV;
            else process.env.NODE_ENV = entornoAnterior;
            app.set("trust proxy", proxyAnterior);
        }
    });
});
