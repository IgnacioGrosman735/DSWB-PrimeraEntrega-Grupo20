const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const session = require("express-session");
const Usuario = require("../models/Usuario");
const UsuarioTieneRol = require("../models/UsuarioTieneRol");
const Productor = require("../models/Productor");
const Lote = require("../models/Lote");
const { filtrarUltimosDias } = require("../services/periodoConsultaLotes");
const { responderSeguimiento } = require("../services/seguimientoAgrobot");
const Observacion = require("../models/Observacion");
const TecnicoTieneLote = require("../models/TecnicoTieneLote");

test("seguimiento prioriza alertas y aplica un plazo estricto", async () => {
    const lotes = [
        { id: 1, nivelActual: "Crítico", fechaUltima: "2026-10-28" },
        { id: 2, nivelActual: "Atención", fechaUltima: "2026-10-29" },
        { id: 3, nivelActual: "Sin datos", fechaUltima: null },
        { id: 4, nivelActual: "Normal", fechaUltima: "2026-11-13" }
    ];
    const fecha = "2026-11-13";
    const alertas = await responderSeguimiento("¿Qué lotes requieren atención hoy?", fecha, lotes);
    assert.match(alertas, /Crítico \(1\)[\s\S]*Atención \(1\)[\s\S]*Sin datos \(1\)/);
    assert.doesNotMatch(alertas, /Lote 4/);
    const atrasos = await responderSeguimiento("¿Qué lotes llevan más de 15 días sin revisión?", fecha, lotes);
    assert.match(atrasos, /observación \(1\)\nLote 1/);
    assert.match(atrasos, /Sin observaciones cargadas \(1\)\nLote 3/);
    assert.doesNotMatch(atrasos, /Lote 2/);
});

test("historial de Agrobot filtra por lote y por ingeniero", async t => {
    const lotes = [{ id: 12 }];
    const fecha = "2026-11-13";
    const asignacion = t.mock.method(TecnicoTieneLote, "exists", async filtro =>
        filtro.tecnicoId === 7 && filtro.loteId === 12);
    const buscar = t.mock.method(Observacion, "find", filtro => {
        assert.deepEqual(filtro, {
            loteId: 12, tecnicoId: 7, estado: { $ne: "Pendiente" }, fecha: { $lte: fecha }
        });
        return { sort: () => ({ limit: async () => [
            { fecha, nivelAlerta: "Crítico", estadoCultivo: "Daños" },
            { fecha: "2026-11-12", nivelAlerta: "Atención", estadoCultivo: "Revisión" }
        ] }) };
    });
    const contar = t.mock.method(Observacion, "countDocuments", async filtro => {
        assert.deepEqual(filtro, {
            loteId: 12, estado: { $ne: "Pendiente" }, fecha: { $gte: "2026-11-01", $lte: fecha },
            nivelAlerta: "Crítico"
        });
        return 2;
    });
    const pregunta = "¿Qué cambió desde la última revisión del lote 12?";
    assert.match(await responderSeguimiento(pregunta, fecha, lotes, { roles: ["Cliente"] }), /historial está disponible/);
    assert.match(await responderSeguimiento(pregunta, fecha, lotes, {
        roles: ["Cliente", "Ingeniero"], tecnicoId: 8
    }), /no está disponible/);
    assert.equal(buscar.mock.callCount(), 0);
    assert.match(await responderSeguimiento(pregunta, fecha, lotes, {
        roles: ["Ingeniero"], tecnicoId: 7
    }), /pasó de Atención a Crítico/);
    assert.equal(asignacion.mock.callCount(), 2);
    assert.match(await responderSeguimiento("¿El lote 12 tuvo una alerta crítica este mes?", fecha, lotes, {
        roles: ["Admin"]
    }), /disponible: 2/);
    assert.equal(contar.mock.callCount(), 1);
});

test("qué ha cambiado consulta el detalle histórico del período", async t => {
    const fecha = "2026-11-13";
    const pregunta = "que ha cambiado en el lote 1 en los últimos 15 días";
    const lotes = [{ id: 1, fechaUltima: "2026-10-12" }];
    const { periodo } = filtrarUltimosDias(pregunta, fecha, lotes);
    t.mock.method(Observacion, "find", (filtro, campos) => {
        assert.deepEqual(filtro, {
            loteId: 1, estado: { $ne: "Pendiente" },
            fecha: { $gte: "2026-10-30", $lte: fecha }
        });
        assert.equal(campos.observaciones, 1);
        return { sort: async () => [
            { fecha, nivelAlerta: "Atención", estadoCultivo: "Revisión", observaciones: "Hojas amarillas" },
            { fecha: "2026-10-30", nivelAlerta: "Normal", estadoCultivo: "Bueno" }
        ] };
    });
    const respuesta = await responderSeguimiento(pregunta, fecha, lotes, { roles: ["Admin"] }, periodo);
    assert.match(respuesta, /Del 2026-10-30 al 2026-11-13/);
    assert.match(respuesta, /Hojas amarillas/);
    assert.match(respuesta, /pasó de Normal a Atención/);
});

test("últimos 7 días incluye hoy y excluye fechas fuera del rango", () => {
    const lotes = [
        { id: 1, fechaUltima: "2026-11-06" },
        { id: 2, fechaUltima: "2026-11-07" },
        { id: 3, fechaUltima: "2026-11-13" },
        { id: 4, fechaUltima: "2026-11-14" },
        { id: 5, fechaUltima: null }
    ];
    assert.deepEqual(filtrarUltimosDias("Lotes en Atención en los últimos 7 días", "2026-11-13", lotes), {
        periodo: { desde: "2026-11-07", hasta: "2026-11-13" },
        lotes: [lotes[1], lotes[2]]
    });
    assert.deepEqual(filtrarUltimosDias("Listá mis lotes", "2026-11-13", lotes), { lotes });
});

test("Agrobot procesa consultas desde una sesión válida", { timeout: 15000 }, async t => {
    const gemini = require("../services/geminiService");
    const consultar = t.mock.method(gemini, "consultarGemini", async () => "<b>Respuesta simulada</b>");
    const app = require("../index");
    const claveAnterior = process.env.GEMINI_API_KEY;
    const modeloAnterior = process.env.GEMINI_MODEL;
    const middlewareAnterior = app.locals.middlewareSesion;
    t.after(() => {
        if (claveAnterior === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = claveAnterior;
        if (modeloAnterior === undefined) delete process.env.GEMINI_MODEL;
        else process.env.GEMINI_MODEL = modeloAnterior;
        app.locals.middlewareSesion = middlewareAnterior;
    });
    process.env.GEMINI_API_KEY = "clave-simulada";
    process.env.GEMINI_MODEL = "modelo-simulado";

    const sesiones = session({
        secret: "secreto-exclusivo-para-pruebas-de-agrobot",
        resave: false,
        saveUninitialized: false
    });
    app.locals.middlewareSesion = sesiones;
    t.mock.method(Usuario, "findById", async id => ({ _id: id, activo: true }));
    t.mock.method(UsuarioTieneRol, "find", () => ({
        populate: async () => [{ rolId: { nombre: "Cliente" } }]
    }));
    t.mock.method(Productor, "findOne", async ({ usuarioId }) => ({ _id: usuarioId }));
    t.mock.method(Lote, "find", async ({ productorId }) => [{ _id: productorId + 10 }]);
    t.mock.method(Lote, "obtenerEstadoActual", async ids => {
        assert.ok(Array.isArray(ids));
        return ids.map(_id => ({ _id, nivelActual: "Crítico", fechaUltima: "2026-11-12" }));
    });

    const servidor = require("node:http").createServer((req, res) => {
        if (req.url !== "/sesion-de-prueba") return app(req, res);
        sesiones(req, res, () => {
            req.session.usuarioId = Number(req.headers["x-usuario-prueba"]);
            res.writeHead(204);
            res.end();
        });
    });
    servidor.listen(0, "127.0.0.1");
    t.after(() => new Promise(resolve => servidor.close(resolve)));
    await once(servidor, "listening");
    const base = `http://127.0.0.1:${servidor.address().port}`;
    const ruta = "/web/asistente";

    async function pedir({ cookie, body } = {}) {
        return fetch(base + ruta, {
            method: body === undefined ? "GET" : "POST",
            redirect: "manual",
            headers: {
                ...(cookie ? { Cookie: cookie } : {}),
                ...(body === undefined ? {} : { "Content-Type": "application/json" })
            },
            body: JSON.stringify(body)
        });
    }

    async function abrirSesion(usuarioId) {
        const r = await fetch(base + "/sesion-de-prueba", {
            headers: { "X-Usuario-Prueba": String(usuarioId) }
        });
        assert.equal(r.status, 204);
        return r.headers.get("set-cookie").split(";")[0];
    }

    await t.test("GET y POST sin sesión redirigen al login", async () => {
        for (const body of [undefined, { pregunta: "Hola" }]) {
            const r = await pedir({ body });
            assert.equal(r.status, 302);
            assert.equal(r.headers.get("location"), "/login");
            await r.text();
        }
        assert.equal(consultar.mock.callCount(), 0);
    });

    const cookie = await abrirSesion(1);
    const enviar = pregunta => pedir({ cookie, body: { pregunta } });

    await t.test("abre el formulario para Cliente y valida la pregunta", async () => {
        const pantalla = await pedir({ cookie });
        assert.equal(pantalla.status, 200);
        assert.match(await pantalla.text(), /action="\/web\/asistente" method="POST"/);
        for (const [pregunta, mensaje] of [
            [undefined, /debe ser texto/],
            [[], /debe ser texto/],
            ["   ", /Escribí una pregunta/],
            ["a".repeat(501), /hasta 500 caracteres/]
        ]) {
            const r = await enviar(pregunta);
            assert.equal(r.status, 400);
            assert.match(await r.text(), mensaje);
        }
        assert.equal(consultar.mock.callCount(), 0);
    });

    await t.test("recorta la pregunta y renderiza la respuesta como texto", async () => {
        const pregunta = "a".repeat(500);
        const r = await enviar(`  ${pregunta}  `);
        assert.equal(r.status, 200);
        const html = await r.text();
        assert.match(html, /&lt;b&gt;Respuesta simulada&lt;\/b&gt;/);
        assert.doesNotMatch(html, /<b>Respuesta simulada<\/b>/);
        const [recibida, contexto] = consultar.mock.calls[0].arguments;
        assert.equal(recibida, pregunta);
        assert.deepEqual(contexto.roles, ["Cliente"]);
        assert.match(contexto.fechaActual, /^\d{4}-\d{2}-\d{2}$/);
        assert.deepEqual(contexto.lotes, [
            { id: 11, nivelActual: "Crítico", fechaUltima: "2026-11-12" }
        ]);
    });

    await t.test("distingue configuración faltante, fallo y tiempo de espera", async () => {
        delete process.env.GEMINI_API_KEY;
        const sinClave = await enviar("Hola");
        assert.equal(sinClave.status, 503);
        assert.match(await sinClave.text(), /Falta configurar la clave/);
        assert.equal(consultar.mock.callCount(), 1);
        process.env.GEMINI_API_KEY = "clave-simulada";

        for (const [code, status, mensaje] of [
            ["GEMINI_TIMEOUT", 504, /tardó demasiado/],
            ["OTRO", 502, /no pudo responder/]
        ]) {
            consultar.mock.mockImplementationOnce(async () => {
                throw Object.assign(new Error("Detalle interno del proveedor"), { code });
            });
            const r = await enviar("Hola");
            assert.equal(r.status, status);
            const html = await r.text();
            assert.match(html, mensaje);
            assert.doesNotMatch(html, /Detalle interno del proveedor/);
        }
    });

    await t.test("limita las consultas por usuario y conserva el cupo de otros", async () => {
        for (let i = 0; i < 2; i++) {
            const r = await enviar("Hola");
            assert.equal(r.status, 200);
            await r.text();
        }
        const otraSesion = await abrirSesion(1);
        const limite = await pedir({ cookie: otraSesion, body: { pregunta: "Hola" } });
        assert.equal(limite.status, 429);
        assert.ok(Number(limite.headers.get("retry-after")) > 0);
        assert.match(await limite.text(), /Alcanzaste el límite/);
        assert.equal(consultar.mock.callCount(), 5);

        const otro = await pedir({ cookie: await abrirSesion(2), body: { pregunta: "Hola" } });
        assert.equal(otro.status, 200);
        await otro.text();
        assert.equal(consultar.mock.callCount(), 6);
        assert.equal(consultar.mock.calls[5].arguments[1].lotes[0].id, 12);
    });

    await t.test("responde consultas de seguimiento sin llamar a Gemini", async () => {
        delete process.env.GEMINI_API_KEY;
        const cookie = await abrirSesion(3);
        const r = await pedir({ cookie, body: { pregunta: "¿Qué lotes requieren atención hoy?" } });
        assert.equal(r.status, 200);
        const html = await r.text();
        assert.match(html, /Lote 13 · Crítico/);
        assert.doesNotMatch(html, /Lote 11 · Crítico/);
        assert.equal(consultar.mock.callCount(), 6);
    });
});
