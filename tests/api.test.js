const { test } = require("node:test");
const assert = require("node:assert/strict");

const { randomUUID } = require("node:crypto");
const { once } = require("node:events");

const mongoose = require("mongoose");
const app = require("../index");

const Productor = require("../models/Productor");
const Tecnico = require("../models/Tecnico");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");

// Los subtests se ejecutan en orden y reutilizan los datos de los anteriores.
test("contrato HTTP de la API y las vistas", { timeout: 60000 }, async (t) => {
    // Esta conexión nunca toma MONGODB_URI ni importa datos productivos.
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

    await TipoCultivo.create({ _id: 1, nombre: "Maíz de prueba" });

    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const base = `http://127.0.0.1:${servidor.address().port}`;

    const solicitud = async (metodo, ruta, cuerpo, estado, html = false) => {
        const opciones = { method: metodo, headers: { Connection: "close" } };
        if (cuerpo !== undefined) {
            opciones.headers["Content-Type"] = "application/json";
            opciones.body = JSON.stringify(cuerpo);
        }
        const respuesta = await fetch(base + ruta, opciones);
        const texto = await respuesta.text();

        assert.equal(respuesta.status, estado, `${metodo} ${ruta}: ${texto}`);
        assert.match(
            respuesta.headers.get("content-type"),
            html ? /text\/html/ : /application\/json/
        );
        const resultado = html ? texto : JSON.parse(texto);

        if (!html && estado >= 400) assert.equal(typeof resultado.mensaje, "string");
        return resultado;
    };

    const acceso = (ruta, id) => ({
        cuentaId: (ruta === "/tecnicos" ? 1000 : 2000) + id,
        usuario: ruta.slice(1) + id + "@prueba.test",
        password: "PruebaTemporal123456"
    });

    const loteValido = {
        _id: 1,
        hectareas: 12.5,
        tipoCultivoId: 1,
        productorId: 1,
        ubicacion: "Parcela de prueba"
    };
    const observacionValida = {
        _id: 1,
        loteId: 1,
        tecnicoId: 1,
        fecha: "2024-02-29",
        tipoCultivoId: 1,
        estadoCultivo: "Bueno",
        observaciones: "Registro de prueba",
        nivelAlerta: "Normal"
    };

    await t.test(
        "CRUD de productores y técnicos con validaciones y precedencia de errores",
        async () => {
            for (const [ruta, clave] of [
                ["/productores", "productor"],
                ["/tecnicos", "tecnico"]
            ]) {
                assert.deepEqual(await solicitud("GET", ruta, undefined, 200), []);

                for (const cuerpo of [
                    {},
                    { _id: "1", nombre: "Nombre" },
                    { _id: 0, nombre: "Nombre" },
                    { _id: 1.5, nombre: "Nombre" },
                    { _id: Number.MAX_SAFE_INTEGER + 1, nombre: "Nombre" },
                    { _id: 1, nombre: "  " },
                    { _id: 1, nombre: 17 }
                ]) {
                    await solicitud("POST", ruta, cuerpo, 400);
                }

                const creado = await solicitud(
                    "POST",
                    ruta,
                    {
                        _id: 1,
                        nombre: "Nombre inicial",
                        desconocido: "ignorado",
                        ...acceso(ruta, 1)
                    },
                    201
                );
                assert.equal(creado[clave]._id, 1);
                assert.equal(Object.hasOwn(creado[clave], "desconocido"), false);
                await solicitud("POST", ruta, { _id: 1, nombre: "Duplicado" }, 400);

                for (const id of ["1", "1e0", "0x1"]) {
                    assert.equal((await solicitud("GET", `${ruta}/${id}`, undefined, 200))._id, 1);
                }

                await solicitud("PUT", `${ruta}/1`, {}, 400);
                await solicitud("PUT", `${ruta}/1`, { _id: 2, nombre: "Cambio" }, 400);

                await solicitud("PUT", `${ruta}/999`, { nombre: "" }, 404);
                const actualizado = await solicitud(
                    "PUT",
                    `${ruta}/1`,
                    { _id: 1, nombre: "Nombre actualizado" },
                    200
                );
                assert.equal(actualizado[clave].nombre, "Nombre actualizado");

                for (const id of ["0", "-1", "1.5", "abc", "9007199254740992"]) {
                    for (const metodo of ["GET", "PUT", "DELETE"]) {
                        await solicitud(
                            metodo,
                            `${ruta}/${id}`,
                            metodo === "PUT" ? {} : undefined,
                            400
                        );
                    }
                }
                await solicitud("GET", `${ruta}/999`, undefined, 404);
                await solicitud("DELETE", `${ruta}/999`, undefined, 404);

                await solicitud(
                    "POST",
                    ruta,
                    { _id: 2, nombre: "Descartable", ...acceso(ruta, 2) },
                    201
                );
                await solicitud("DELETE", `${ruta}/2`, undefined, 200);
                await solicitud("GET", `${ruta}/2`, undefined, 404);
                assert.equal((await solicitud("GET", ruta, undefined, 200)).length, 1);
            }
        }
    );

    await t.test("CRUD de lotes, relaciones y actualización parcial", async () => {
        assert.deepEqual(await solicitud("GET", "/lotes", undefined, 200), []);
        for (const cambios of [
            { _id: "1" },
            { hectareas: 0 },
            { hectareas: "12" },
            { ubicacion: " " },
            { productorId: 0 },
            { tipoCultivoId: 1.5 }
        ]) {
            await solicitud("POST", "/lotes", { ...loteValido, ...cambios }, 400);
        }

        await solicitud("POST", "/lotes", { ...loteValido, productorId: 999 }, 400);
        await solicitud("POST", "/lotes", { ...loteValido, tipoCultivoId: 999 }, 400);
        const creado = await solicitud("POST", "/lotes", loteValido, 201);
        assert.equal(creado.lote.hectareas, 12.5);
        await solicitud("POST", "/lotes", loteValido, 400);
        for (const id of ["1", "1e0", "0x1"]) {
            assert.equal((await solicitud("GET", `/lotes/${id}`, undefined, 200))._id, 1);
        }

        const parcial = await solicitud(
            "PUT",
            "/lotes/1",
            { _id: 1, ubicacion: "Ubicación actualizada", desconocido: "ignorado" },
            200
        );
        assert.equal(parcial.lote.ubicacion, "Ubicación actualizada");
        assert.equal(parcial.lote.hectareas, loteValido.hectareas);
        assert.equal(parcial.lote.tipoCultivoId, 1);
        assert.equal(parcial.lote.productorId, 1);
        assert.equal(Object.hasOwn(parcial.lote, "desconocido"), false);

        for (const cuerpo of [
            {},
            [],
            { desconocido: 1 },
            { _id: 2, hectareas: 5 },
            { hectareas: null },
            { hectareas: -1 },
            { ubicacion: "" },
            { productorId: "1" },
            { productorId: 999 },
            { tipoCultivoId: 999 }
        ]) {
            await solicitud("PUT", "/lotes/1", cuerpo, 400);
        }
        await solicitud("PUT", "/lotes/999", {}, 404);
        await solicitud("GET", "/lotes/999", undefined, 404);
        await solicitud("DELETE", "/lotes/999", undefined, 404);
        for (const metodo of ["GET", "PUT", "DELETE"]) {
            await solicitud(metodo, "/lotes/abc", metodo === "PUT" ? {} : undefined, 400);
        }

        assert.deepEqual(await solicitud("GET", "/lotes/1/observaciones", undefined, 200), []);
        await solicitud("GET", "/lotes/999/observaciones", undefined, 404);
        await solicitud("GET", "/lotes/0/observaciones", undefined, 400);

        await solicitud("POST", "/lotes", { ...loteValido, _id: 2 }, 201);
        await solicitud("DELETE", "/lotes/2", undefined, 200);
        await solicitud("GET", "/lotes/2", undefined, 404);
        await solicitud("DELETE", "/productores/1", undefined, 400);
    });

    await t.test("observaciones, filtros, historial y protección de las relaciones", async () => {
        await require("../models/TecnicoTieneLote").create({ _id: 1, tecnicoId: 1, loteId: 1 });
        assert.deepEqual(await solicitud("GET", "/observaciones", undefined, 200), []);

        for (const cambios of [
            { _id: "1" },
            { loteId: 0 },
            { tecnicoId: 1.5 },
            { tipoCultivoId: "1" },
            { fecha: "2025-02-29" },
            { fecha: "2024-04-31" },
            { fecha: "29/02/2024" },
            { fecha: "2024-02-29T00:00:00Z" },
            { fecha: null },
            { estadoCultivo: " " },
            { observaciones: "" },
            { nivelAlerta: "normal" }
        ]) {
            await solicitud("POST", "/observaciones", { ...observacionValida, ...cambios }, 400);
        }
        for (const campo of ["loteId", "tecnicoId", "tipoCultivoId"]) {
            await solicitud("POST", "/observaciones", { ...observacionValida, [campo]: 999 }, 400);
        }

        const creado = await solicitud(
            "POST",
            "/observaciones",
            { ...observacionValida, desconocido: "ignorado" },
            201
        );
        assert.equal(creado.observacion.fecha, "2024-02-29");
        assert.equal(Object.hasOwn(creado.observacion, "desconocido"), false);
        await solicitud("POST", "/observaciones", observacionValida, 400);
        await solicitud(
            "POST",
            "/observaciones",
            { ...observacionValida, _id: 2, nivelAlerta: "Crítico" },
            201
        );
        await solicitud(
            "POST",
            "/observaciones",
            { ...observacionValida, _id: 3, nivelAlerta: "Crítico" },
            201
        );
        await solicitud(
            "POST",
            "/observaciones",
            { ...observacionValida, _id: 4, nivelAlerta: "Atención" },
            201
        );
        for (const id of ["1", "1e0", "0x1"]) {
            assert.equal((await solicitud("GET", `/observaciones/${id}`, undefined, 200))._id, 1);
        }
        await solicitud("GET", "/observaciones/999", undefined, 404);
        await solicitud("GET", "/observaciones/abc", undefined, 400);

        for (const metodo of ["PUT", "DELETE"]) {
            const resultado = await solicitud(
                metodo,
                "/observaciones/1",
                metodo === "PUT" ? {} : undefined,
                404
            );
            assert.equal(resultado.mensaje, "Ruta no encontrada");
        }
        assert.equal((await solicitud("GET", "/lotes/1/observaciones", undefined, 200)).length, 4);
        assert.equal(
            (await solicitud("GET", "/observaciones?tecnicoId=1e0", undefined, 200)).length,
            4
        );

        for (const filtro of ["abc", "0", "1.5", "", "1&tecnicoId=1"]) {
            await solicitud("GET", `/observaciones?tecnicoId=${filtro}`, undefined, 400);
        }
        await solicitud("GET", "/observaciones?tecnicoId=999", undefined, 404);

        for (const nivel of ["Normal", "Atención", "Crítico"]) {
            const lotes = await solicitud(
                "GET",
                `/lotes?alerta=${encodeURIComponent(nivel)}`,
                undefined,
                200
            );
            assert.deepEqual(
                lotes.map((lote) => lote._id),
                [1]
            );
        }
        for (const filtro of ["normal", "", "Normal&alerta=Normal"]) {
            await solicitud("GET", `/lotes?alerta=${filtro}`, undefined, 400);
        }

        await solicitud("DELETE", "/lotes/1", undefined, 400);
        await solicitud("DELETE", "/tecnicos/1", undefined, 400);
        assert.equal((await solicitud("GET", "/lotes/1/observaciones", undefined, 200)).length, 4);
    });

    await t.test("vistas HTML, redirección y rutas desconocidas", async () => {
        const raiz = await fetch(base, { redirect: "manual", headers: { Connection: "close" } });
        assert.equal(raiz.status, 302);
        assert.equal(raiz.headers.get("location"), "/login");
        await raiz.text();
        for (const ruta of ["/web/lotes", "/web/tecnicos", "/web/lotes/1", "/web/tecnicos/1e0"]) {
            assert.match(await solicitud("GET", ruta, undefined, 200, true), /<html/);
        }

        for (const recurso of ["lotes", "tecnicos"]) {
            for (const prefijo of ["/web", "/WEB"]) {
                await solicitud("GET", `${prefijo}/${recurso}/abc`, undefined, 400, true);
                await solicitud("GET", `${prefijo}/${recurso}/999`, undefined, 404, true);
            }
        }
        assert.equal(
            (await solicitud("GET", "/ruta-inexistente", undefined, 404)).mensaje,
            "Ruta no encontrada"
        );
    });

    await t.test("JSON malformado y logger propio", async (subtest) => {
        const registros = [];

        subtest.mock.method(console, "log", (...valores) => registros.push(valores.join(" ")));
        subtest.mock.method(console, "error", () => {});

        const respuesta = await fetch(base + "/productores", {
            method: "POST",
            headers: { "Content-Type": "application/json", Connection: "close" },
            body: '{"_id":'
        });
        assert.equal(respuesta.status, 400);
        assert.deepEqual(await respuesta.json(), { mensaje: "Solicitud inválida" });
        assert.ok(registros.some((registro) => /^\[[^\]]+\] POST \/productores$/.test(registro)));
        await solicitud("GET", "/lotes?alerta=Normal", undefined, 200);
        assert.ok(registros.some((registro) => registro.endsWith(" GET /lotes?alerta=Normal")));

        subtest.mock.restoreAll();
    });

    await t.test(
        "el manejador global conserva errores de MongoDB y respuestas HTML",
        async (subtest) => {
            subtest.mock.method(console, "error", () => {});
            const duplicado = Object.assign(new Error("Duplicado simulado"), { code: 11000 });

            for (const [error, estado, mensaje] of [
                [new mongoose.Error.CastError("Number", "abc", "_id"), 400, "Solicitud inválida"],
                [new mongoose.Error.ValidationError(), 400, "Solicitud inválida"],
                [duplicado, 400, "Ya existe un registro con ese ID"],
                [new Error("Detalle privado de prueba"), 500, "Error interno del servidor"]
            ]) {
                const operacion = subtest.mock.method(Productor, "find", async () => {
                    throw error;
                });
                try {
                    assert.deepEqual(await solicitud("GET", "/productores", undefined, estado), {
                        mensaje
                    });
                } finally {
                    operacion.mock.restore();
                }
            }

            const operacion = subtest.mock.method(Lote, "find", () => {
                throw new Error("Detalle privado");
            });
            try {
                const html = await solicitud("GET", "/web/lotes", undefined, 500, true);
                assert.match(html, /Error interno del servidor/);
                assert.doesNotMatch(html, /Detalle privado/);
            } finally {
                operacion.mock.restore();
            }
            subtest.mock.restoreAll();
        }
    );

    await t.test("cada campo obligatorio y los tipos inválidos se rechazan", async () => {
        const recursos = [
            {
                ruta: "/productores",
                datos: { _id: 101, nombre: "Productor de prueba", ...acceso("/productores", 101) },
                invalidos: { _id: [null, "101", true], nombre: [null, 17, [], {}, "  "] }
            },
            {
                ruta: "/tecnicos",
                datos: { _id: 101, nombre: "Técnico de prueba", ...acceso("/tecnicos", 101) },
                invalidos: { _id: [null, "101", true], nombre: [null, 17, [], {}, "  "] }
            },
            {
                ruta: "/lotes",
                datos: { ...loteValido, _id: 101 },
                invalidos: {
                    _id: [null, "101"],
                    productorId: ["1", false],
                    tipoCultivoId: [null, "1", false],
                    hectareas: [null, "12", 0, -1],
                    ubicacion: [null, 17, "  "]
                }
            },
            {
                ruta: "/observaciones",
                datos: { ...observacionValida, _id: 101 },
                invalidos: {
                    _id: [null, "101"],
                    loteId: [null, "1", false],
                    tecnicoId: [null, "1", false],
                    tipoCultivoId: [null, "1", false],
                    fecha: [null, 17, "2026-02-30"],
                    estadoCultivo: [null, 17, "  "],
                    observaciones: [null, 17, "  "],
                    nivelAlerta: [null, [], "Urgente"]
                }
            }
        ];

        for (const { ruta, datos, invalidos } of recursos) {
            for (const campo of Object.keys(datos)) {
                if (
                    (ruta === "/observaciones" && campo === "fecha") ||
                    (ruta === "/lotes" && campo === "productorId")
                )
                    continue;
                const incompleto = { ...datos };
                delete incompleto[campo];
                await solicitud("POST", ruta, incompleto, 400);
            }

            for (const [campo, valores] of Object.entries(invalidos)) {
                for (const valor of valores) {
                    await solicitud("POST", ruta, { ...datos, [campo]: valor }, 400);
                }
            }

            await solicitud("GET", `${ruta}/101`, undefined, 404);
        }

        for (const ruta of ["/productores/1", "/tecnicos/1"]) {
            const anterior = await solicitud("GET", ruta, undefined, 200);
            for (const nombre of [null, 17, [], "  "]) {
                await solicitud("PUT", ruta, { nombre }, 400);
            }
            assert.deepEqual(await solicitud("GET", ruta, undefined, 200), anterior);
        }
    });

    await t.test(
        "las referencias inexistentes no escriben y el cultivo histórico se conserva",
        async () => {
            const lotesAnteriores = await solicitud("GET", "/lotes", undefined, 200);
            const loteAnterior = await solicitud("GET", "/lotes/1", undefined, 200);

            for (const cambios of [{ productorId: 999 }, { tipoCultivoId: 999 }]) {
                await solicitud("POST", "/lotes", { ...loteValido, _id: 201, ...cambios }, 400);
                await solicitud("GET", "/lotes/201", undefined, 404);
                await solicitud("PUT", "/lotes/1", cambios, 400);
                assert.deepEqual(await solicitud("GET", "/lotes/1", undefined, 200), loteAnterior);
            }
            assert.deepEqual(await solicitud("GET", "/lotes", undefined, 200), lotesAnteriores);

            const historialAnterior = await solicitud(
                "GET",
                "/lotes/1/observaciones",
                undefined,
                200
            );
            const observacionesAnteriores = await solicitud(
                "GET",
                "/observaciones",
                undefined,
                200
            );

            for (const campo of ["loteId", "tecnicoId", "tipoCultivoId"]) {
                await solicitud(
                    "POST",
                    "/observaciones",
                    { ...observacionValida, _id: 201, [campo]: 999 },
                    400
                );
                await solicitud("GET", "/observaciones/201", undefined, 404);
            }
            assert.deepEqual(
                await solicitud("GET", "/observaciones", undefined, 200),
                observacionesAnteriores
            );

            await TipoCultivo.create({ _id: 2, nombre: "Soja de prueba" });
            const actualizado = await solicitud("PUT", "/lotes/1", { tipoCultivoId: 2 }, 200);
            assert.equal(actualizado.lote.tipoCultivoId, 2);
            assert.deepEqual(
                await solicitud("GET", "/lotes/1/observaciones", undefined, 200),
                historialAnterior
            );
            assert.ok(historialAnterior.every((observacion) => observacion.tipoCultivoId === 1));
        }
    );

    await t.test("API y modelo conservan exactamente los tres niveles de alerta", async () => {
        for (const [indice, nivelAlerta] of ["Normal", "Atención", "Crítico"].entries()) {
            const datos = {
                ...observacionValida,
                tipoCultivoId: 2,
                _id: 301 + indice,
                nivelAlerta
            };

            assert.equal(new Observacion(datos).validateSync(), undefined);
            const creado = await solicitud("POST", "/observaciones", datos, 201);
            assert.equal(creado.observacion.nivelAlerta, nivelAlerta);
            const lotes = await solicitud(
                "GET",
                `/lotes?alerta=${encodeURIComponent(nivelAlerta)}`,
                undefined,
                200
            );
            assert.deepEqual(
                lotes.map((lote) => lote._id),
                [1]
            );
        }

        const anteriores = await solicitud("GET", "/observaciones", undefined, 200);
        for (const nivelAlerta of ["normal", "Atencion", "Critico", "Urgente", " Normal", null]) {
            const datos = { ...observacionValida, _id: 399, nivelAlerta };
            assert.ok(new Observacion(datos).validateSync());
            assert.deepEqual(await solicitud("POST", "/observaciones", datos, 400), {
                mensaje: "El nivel de alerta debe ser Normal, Atención o Crítico"
            });
            await solicitud(
                "GET",
                `/lotes?alerta=${encodeURIComponent(nivelAlerta)}`,
                undefined,
                400
            );
        }
        assert.deepEqual(await solicitud("GET", "/observaciones", undefined, 200), anteriores);
    });

    await t.test(
        "las observaciones históricas no se modifican ni se eliminan por la API",
        async () => {
            const registroAnterior = await solicitud("GET", "/observaciones/1", undefined, 200);
            const observacionesAnteriores = await solicitud(
                "GET",
                "/observaciones",
                undefined,
                200
            );
            const historialAnterior = await solicitud(
                "GET",
                "/lotes/1/observaciones",
                undefined,
                200
            );
            const intentos = [
                [
                    "PUT",
                    "/observaciones/1",
                    { ...observacionValida, observaciones: "Intento de cambio" }
                ],
                ["PATCH", "/observaciones/1", { nivelAlerta: "Crítico" }],
                ["DELETE", "/observaciones/1"],
                ["DELETE", "/observaciones"],
                ["DELETE", "/observaciones/999"]
            ];

            for (const [metodo, ruta, cuerpo] of intentos) {
                assert.deepEqual(await solicitud(metodo, ruta, cuerpo, 404), {
                    mensaje: "Ruta no encontrada"
                });
                assert.deepEqual(
                    await solicitud("GET", "/observaciones/1", undefined, 200),
                    registroAnterior
                );
                assert.deepEqual(
                    await solicitud("GET", "/observaciones", undefined, 200),
                    observacionesAnteriores
                );
                assert.deepEqual(
                    await solicitud("GET", "/lotes/1/observaciones", undefined, 200),
                    historialAnterior
                );
            }

            // Esto prueba la protección de la API; no agrega un bloqueo de borrado directo en MongoDB.
            assert.deepEqual(await Observacion.findById(1).lean(), registroAnterior);
            assert.deepEqual(await Observacion.find().lean(), observacionesAnteriores);
        }
    );

    await t.test("los DELETE bloqueados conservan todos los recursos relacionados", async () => {
        const rutas = ["/productores", "/tecnicos", "/lotes", "/observaciones"];
        const anteriores = new Map();
        for (const ruta of rutas) {
            anteriores.set(ruta, await solicitud("GET", ruta, undefined, 200));
        }

        const bloqueos = [
            ["/productores/1", "No se puede eliminar el productor porque posee lotes asociados"],
            [
                "/tecnicos/1",
                "No se puede eliminar el técnico porque posee observaciones registradas"
            ],
            ["/lotes/1", "No se puede eliminar el lote porque posee observaciones en su historial"]
        ];
        for (const [ruta, mensaje] of bloqueos) {
            assert.deepEqual(await solicitud("DELETE", ruta, undefined, 400), { mensaje });

            for (const recurso of rutas) {
                assert.deepEqual(
                    await solicitud("GET", recurso, undefined, 200),
                    anteriores.get(recurso)
                );
            }
        }
    });

    await t.test(
        "los errores HTTP conservan sus mensajes y un fallo antes de escribir no crea datos",
        async (subtest) => {
            const casos = [
                [
                    "POST",
                    "/productores",
                    {},
                    400,
                    "Se requiere un ID entero positivo y un nombre no vacío"
                ],
                [
                    "POST",
                    "/tecnicos",
                    {},
                    400,
                    "Se requiere un ID entero positivo y un nombre no vacío"
                ],
                [
                    "PUT",
                    "/productores/1",
                    {},
                    400,
                    "Se requiere un nombre no vacío; el ID no se puede cambiar"
                ],
                [
                    "PUT",
                    "/tecnicos/1",
                    { nombre: null },
                    400,
                    "Se requiere un nombre no vacío; el ID no se puede cambiar"
                ],
                [
                    "POST",
                    "/lotes",
                    {},
                    400,
                    "Se requieren IDs enteros positivos, hectáreas numéricas mayores que cero y ubicación no vacía"
                ],
                ["PUT", "/lotes/1", { ubicacion: null }, 400, "Los datos del lote son inválidos"],
                [
                    "POST",
                    "/observaciones",
                    { ...observacionValida, fecha: "2026-02-30" },
                    400,
                    "Se requieren IDs enteros positivos, fecha válida YYYY-MM-DD, estado del cultivo y texto de observaciones no vacíos"
                ],
                [
                    "POST",
                    "/productores",
                    { _id: 1, nombre: "Duplicado" },
                    400,
                    "Ya existe un productor con ese ID"
                ],
                [
                    "POST",
                    "/tecnicos",
                    { _id: 1, nombre: "Duplicado" },
                    400,
                    "Ya existe un técnico con ese ID"
                ],
                ["POST", "/lotes", loteValido, 400, "Ya existe un lote con ese ID"],
                [
                    "POST",
                    "/observaciones",
                    observacionValida,
                    400,
                    "Ya existe una observación con ese ID"
                ],
                [
                    "POST",
                    "/lotes",
                    { ...loteValido, _id: 601, productorId: 999 },
                    400,
                    "El productor no existe"
                ],
                [
                    "POST",
                    "/lotes",
                    { ...loteValido, _id: 601, tipoCultivoId: 999 },
                    400,
                    "El tipo de cultivo no existe"
                ],
                [
                    "POST",
                    "/observaciones",
                    { ...observacionValida, _id: 601, loteId: 999 },
                    400,
                    "El lote no existe"
                ],
                [
                    "POST",
                    "/observaciones",
                    { ...observacionValida, _id: 601, tecnicoId: 999 },
                    400,
                    "El técnico no existe"
                ],
                [
                    "POST",
                    "/observaciones",
                    { ...observacionValida, _id: 601, tipoCultivoId: 999 },
                    400,
                    "El tipo de cultivo no existe"
                ],
                ["GET", "/productores/abc", undefined, 400, "El ID debe ser un entero positivo"],
                ["GET", "/productores/999", undefined, 404, "El productor no existe"],
                ["GET", "/tecnicos/999", undefined, 404, "El técnico no existe"],
                ["GET", "/lotes/999", undefined, 404, "Lote no encontrado"],
                ["GET", "/observaciones/999", undefined, 404, "La observación no existe"],
                ["PUT", "/lotes/999", {}, 404, "Lote no encontrado"]
            ];
            for (const [metodo, ruta, cuerpo, estado, mensaje] of casos) {
                assert.deepEqual(await solicitud(metodo, ruta, cuerpo, estado), { mensaje });
            }

            const anteriores = await solicitud("GET", "/productores", undefined, 200);
            subtest.mock.method(console, "error", () => {});
            subtest.mock.method(Productor.prototype, "save", async () => {
                throw new Error("Detalle privado del fallo de escritura");
            });
            try {
                assert.deepEqual(
                    await solicitud(
                        "POST",
                        "/productores",
                        { _id: 601, nombre: "No se guarda", ...acceso("/productores", 601) },
                        500
                    ),
                    {
                        mensaje: "Error interno del servidor"
                    }
                );
            } finally {
                subtest.mock.restoreAll();
            }

            await solicitud("GET", "/productores/601", undefined, 404);
            assert.deepEqual(await solicitud("GET", "/productores", undefined, 200), anteriores);
        }
    );

    await t.test(
        "integración de cuentas, cliente opcional y observaciones del ingeniero",
        async () => {
            const Usuario = require("../models/Usuario");
            const UsuarioTieneRol = require("../models/UsuarioTieneRol");
            for (const [ruta, rolId] of [
                ["/productores", 3],
                ["/tecnicos", 2]
            ]) {
                const ficha = await solicitud("GET", ruta + "/1", undefined, 200);
                const datosAcceso = acceso(ruta, 1);
                assert.equal(ficha.usuarioId, datosAcceso.cuentaId);
                assert.ok(
                    await UsuarioTieneRol.exists({
                        _id: ficha.usuarioId,
                        usuarioId: ficha.usuarioId,
                        rolId
                    })
                );
                const cuenta = await Usuario.findById(ficha.usuarioId).select(
                    "+passwordHash +salt +passwordIteraciones"
                );
                assert.ok(await cuenta.validarPassword(datosAcceso.password));
                await solicitud(
                    "POST",
                    "/auth/login",
                    { usuario: datosAcceso.usuario, password: datosAcceso.password },
                    200,
                    true
                );
            }
            for (const [id, extra] of [
                [701, {}],
                [702, { productorId: null }]
            ]) {
                const creado = await solicitud(
                    "POST",
                    "/lotes",
                    {
                        _id: id,
                        hectareas: 1,
                        ubicacion: "Sin cliente",
                        tipoCultivoId: 1,
                        ...extra
                    },
                    201
                );
                assert.equal(creado.lote.productorId, null);
                await solicitud("PUT", "/lotes/" + id, { productorId: 1 }, 200);
                assert.equal(
                    (await solicitud("PUT", "/lotes/" + id, { productorId: null }, 200)).lote
                        .productorId,
                    null
                );
            }
            const Asignacion = require("../models/TecnicoTieneLote");
            await Promise.all(
                [701, 702].map((id) => solicitud("PUT", "/tecnicos/1/lotes/" + id, undefined, 200))
            );
            const asignadas = await Asignacion.find({ tecnicoId: 1, loteId: { $in: [701, 702] } });
            assert.equal(asignadas.length, 2);
            assert.equal(new Set(asignadas.map((a) => a._id)).size, 2);
            assert.ok(asignadas.every((a) => Number.isSafeInteger(a._id) && a._id > 0));
            await solicitud("PUT", "/tecnicos/1/lotes/701", undefined, 200);
            assert.equal(await Asignacion.countDocuments({ tecnicoId: 1, loteId: 701 }), 1);
            for (const id of [701, 702])
                await solicitud("DELETE", "/tecnicos/1/lotes/" + id, undefined, 200);
            const actual = { ...observacionValida, _id: 701, tipoCultivoId: 2 };
            delete actual.fecha;
            const fechaActual = () =>
                new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Argentina/Buenos_Aires",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(new Date());
            const antes = fechaActual();
            const creada = await solicitud("POST", "/observaciones", actual, 201);
            assert.ok([antes, fechaActual()].includes(creada.observacion.fecha));
            assert.equal(creada.observacion.estado, "Cargada");
            await solicitud(
                "POST",
                "/observaciones",
                { ...actual, _id: 702, tipoCultivoId: 1 },
                400
            );
            await solicitud(
                "POST",
                "/observaciones",
                { ...actual, _id: 702, loteId: 701, tipoCultivoId: 1 },
                400
            );
            await Usuario.updateOne(
                { _id: acceso("/tecnicos", 1).cuentaId },
                { $set: { activo: false } }
            );
            try {
                await solicitud("POST", "/observaciones", { ...actual, _id: 702 }, 400);
            } finally {
                await Usuario.updateOne(
                    { _id: acceso("/tecnicos", 1).cuentaId },
                    { $set: { activo: true } }
                );
            }
            assert.equal(await Observacion.findById(702), null);
        }
    );
});
