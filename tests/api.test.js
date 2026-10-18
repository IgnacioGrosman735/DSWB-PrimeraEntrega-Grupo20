// Notas - Andrea | Inicio | Pruebas de regresión de la API
// Notas - Andrea | Inicio | Herramientas y recursos que usan las pruebas
// Node.js ejecuta los tests. assert compara lo recibido con lo que esperamos.
const { test } = require("node:test");
const assert = require("node:assert/strict");
// randomUUID da un nombre único a la base; once permite esperar al servidor.
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
// Mongoose conecta con MongoDB. app contiene las rutas de Express que vamos a probar.
const mongoose = require("mongoose");
const app = require("../index");
// Estos modelos permiten preparar datos, revisar lo guardado y simular algunos errores.
const Productor = require("../models/Productor");
const Tecnico = require("../models/Tecnico");
const TipoCultivo = require("../models/TipoCultivo");
const Lote = require("../models/Lote");
const Observacion = require("../models/Observacion");
// Notas - Andrea | Fin | Herramientas y recursos que usan las pruebas

// Notas - Andrea | Inicio | Explicación de la prueba principal
/*
 * Qué: reúne todas las pruebas de la API y de las páginas HTML.
 * Para qué: comprobar que el proyecto responde y guarda los datos como esperamos.
 * Cuándo: al ejecutar npm test con MongoDB activo; en PowerShell puede usarse npm.cmd test.
 * La prueba principal permite hasta 60 segundos para completar el trabajo.
 * Quién: Node.js ejecuta las pruebas; Express atiende las solicitudes y Mongoose usa MongoDB.
 * Dónde: en un servidor local y una base temporal agrotec_test_<nombre único>.
 * Los await hacen que los tests se ejecuten en orden: los siguientes reutilizan datos
 * creados por los anteriores. Cada ejecución completa tiene su propia base temporal.
 * equal compara un valor; deepEqual compara todo un objeto o arreglo; ok comprueba
 * una condición; match comprueba que un texto tenga el formato esperado.
 * Códigos usados: 200 = operación correcta, 201 = registro creado, 302 = redirección,
 * 400 = solicitud rechazada, 404 = recurso o ruta inexistente, 500 = error interno.
 */
test("contrato HTTP de la API y las vistas", { timeout: 60000 }, async (t) => {
    // Notas - Andrea | Inicio | Base temporal y limpieza al finalizar
    // Esta conexión nunca toma MONGODB_URI ni importa datos productivos.
    const dbName = `agrotec_test_${randomUUID().replaceAll("-", "")}`;
    let servidor;
    let conexionPropia = false;
    // t.after se ejecuta al terminar, incluso si una comprobación falla.
    t.after(async () => {
        try {
            // Primero cerramos el servidor HTTP que abrió esta suite.
            if (servidor) {
                await new Promise((resolve, reject) => servidor.close(error => error ? reject(error) : resolve()));
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
                // finally cierra la conexión aunque falle la limpieza de la base.
                await mongoose.disconnect();
            }
        }
    });
    // Notas - Andrea | Fin | Base temporal y limpieza al finalizar

    // Notas - Andrea | Inicio | Preparar MongoDB y el servidor local
    // Usamos el servidor indicado para pruebas, pero forzamos nuestra base temporal.
    await mongoose.connect(process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017", {
        dbName,
        autoIndex: false,
        autoCreate: false,
        serverSelectionTimeoutMS: 5000
    });
    conexionPropia = true;
    assert.equal(mongoose.connection.name, dbName);
    await require("../config/coleccionesAuth").prepararColeccionesAuth(mongoose.connection.db);
    await require("../config/coleccionesNegocio").prepararColeccionesNegocio(mongoose.connection.db);
    // El cultivo 1 será la referencia válida para los primeros lotes y observaciones.
    await TipoCultivo.create({ _id: 1, nombre: "Maíz de prueba" });
    // El puerto 0 pide un puerto libre. Esperamos a que Express pueda recibir solicitudes.
    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const base = `http://127.0.0.1:${servidor.address().port}`;
    // Notas - Andrea | Fin | Preparar MongoDB y el servidor local

    // Notas - Andrea | Inicio | Ayudante para enviar y comprobar solicitudes
    // Cada test usa este ayudante como si fuera un cliente de la API.
    // Recibe método, ruta, cuerpo y estado esperado; html indica si esperamos una página.
    // Si el cuerpo es undefined, enviamos la solicitud sin datos JSON.
    const solicitud = async (metodo, ruta, cuerpo, estado, html = false) => {
        const opciones = { method: metodo, headers: { Connection: "close" } };
        if (cuerpo !== undefined) {
            // Cuando hay datos para enviar, los convertimos a JSON.
            opciones.headers["Content-Type"] = "application/json";
            opciones.body = JSON.stringify(cuerpo);
        }
        const respuesta = await fetch(base + ruta, opciones);
        const texto = await respuesta.text();
        // Comprobamos el código HTTP y si la respuesta es JSON o HTML.
        assert.equal(respuesta.status, estado, `${metodo} ${ruta}: ${texto}`);
        assert.match(respuesta.headers.get("content-type"), html ? /text\/html/ : /application\/json/);
        const resultado = html ? texto : JSON.parse(texto);
        // Todo error JSON debe incluir un mensaje que el cliente pueda leer.
        if (!html && estado >= 400) assert.equal(typeof resultado.mensaje, "string");
        return resultado;
    };
    // Notas - Andrea | Fin | Ayudante para enviar y comprobar solicitudes

    // IDs explícitos, distintos para las cuentas de clientes e ingenieros.
    const acceso = (ruta, id) => ({
        cuentaId: (ruta === "/tecnicos" ? 1000 : 2000) + id,
        usuario: ruta.slice(1) + id + "@prueba.test",
        password: "PruebaTemporal123456"
    });
    // Notas - Andrea | Inicio | Datos válidos que se reutilizan en los tests
    // Son ejemplos de partida. Con ... copiamos estos datos y cambiamos solo el campo a probar.
    const loteValido = {
        _id: 1, hectareas: 12.5, tipoCultivoId: 1, productorId: 1, ubicacion: "Parcela de prueba"
    };
    const observacionValida = {
        _id: 1, loteId: 1, tecnicoId: 1, fecha: "2024-02-29", tipoCultivoId: 1,
        estadoCultivo: "Bueno", observaciones: "Registro de prueba", nivelAlerta: "Normal"
    };
    // Notas - Andrea | Fin | Datos válidos que se reutilizan en los tests

    // Notas - Andrea | Inicio | Explicación del CRUD de productores y técnicos
    /*
     * Qué: prueba crear, consultar, actualizar y eliminar productores y técnicos.
     * Para qué: verificar que las operaciones válidas funcionen y las inválidas se rechacen.
     * Cuándo: al comenzar los tests, cuando todavía no hay productores ni técnicos.
     * Quién: la prueba simula un cliente; los middleware y controladores atienden sus pedidos.
     * Dónde: en /productores y /tecnicos, usando la base temporal.
     */
    await t.test("CRUD de productores y técnicos con validaciones y precedencia de errores", async () => {
        for (const [ruta, clave] of [["/productores", "productor"], ["/tecnicos", "tecnico"]]) {
            assert.deepEqual(await solicitud("GET", ruta, undefined, 200), []);
            // Probamos datos incompletos, IDs incorrectos y nombres que no son textos válidos.
            for (const cuerpo of [{}, { _id: "1", nombre: "Nombre" }, { _id: 0, nombre: "Nombre" },
                { _id: 1.5, nombre: "Nombre" }, { _id: Number.MAX_SAFE_INTEGER + 1, nombre: "Nombre" },
                { _id: 1, nombre: "  " }, { _id: 1, nombre: 17 }]) {
                await solicitud("POST", ruta, cuerpo, 400);
            }
            // Creamos el registro 1 y comprobamos que se ignore un campo desconocido.
            const creado = await solicitud("POST", ruta, { _id: 1, nombre: "Nombre inicial", desconocido: "ignorado", ...acceso(ruta, 1) }, 201);
            assert.equal(creado[clave]._id, 1);
            assert.equal(Object.hasOwn(creado[clave], "desconocido"), false);
            await solicitud("POST", ruta, { _id: 1, nombre: "Duplicado" }, 400);
            // Estas tres formas de escribir el ID representan el número 1 en JavaScript.
            for (const id of ["1", "1e0", "0x1"]) {
                assert.equal((await solicitud("GET", `${ruta}/${id}`, undefined, 200))._id, 1);
            }
            // Actualizar exige nombre y no permite cambiar el ID del registro.
            await solicitud("PUT", `${ruta}/1`, {}, 400);
            await solicitud("PUT", `${ruta}/1`, { _id: 2, nombre: "Cambio" }, 400);
            // El registro 999 no existe: debe responder 404 aunque el nombre también sea inválido.
            await solicitud("PUT", `${ruta}/999`, { nombre: "" }, 404);
            const actualizado = await solicitud("PUT", `${ruta}/1`, { _id: 1, nombre: "Nombre actualizado" }, 200);
            assert.equal(actualizado[clave].nombre, "Nombre actualizado");
            // Un ID inválido debe rechazarse al consultar, actualizar y eliminar.
            for (const id of ["0", "-1", "1.5", "abc", "9007199254740992"]) {
                for (const metodo of ["GET", "PUT", "DELETE"]) {
                    await solicitud(metodo, `${ruta}/${id}`, metodo === "PUT" ? {} : undefined, 400);
                }
            }
            await solicitud("GET", `${ruta}/999`, undefined, 404);
            await solicitud("DELETE", `${ruta}/999`, undefined, 404);
            // El registro 2 no tiene relaciones: se puede borrar. Dejamos el 1 para otros tests.
            await solicitud("POST", ruta, { _id: 2, nombre: "Descartable", ...acceso(ruta, 2) }, 201);
            await solicitud("DELETE", `${ruta}/2`, undefined, 200);
            await solicitud("GET", `${ruta}/2`, undefined, 404);
            assert.equal((await solicitud("GET", ruta, undefined, 200)).length, 1);
        }
    });
    // Notas - Andrea | Fin | Explicación del CRUD de productores y técnicos

    // Notas - Andrea | Inicio | Explicación del CRUD de lotes
    /*
     * Qué: prueba las operaciones de lotes, sus referencias y los cambios de algunos campos.
     * Para qué: evitar lotes con datos inválidos o relaciones que no existen.
     * Cuándo: después de crear el productor 1; el cultivo 1 se preparó al inicio.
     * Quién: la prueba envía pedidos; los validadores y el controlador de lotes los procesan.
     * Dónde: en /lotes y /lotes/:id/observaciones, dentro de la base temporal.
     */
    await t.test("CRUD de lotes, relaciones y actualización parcial", async () => {
        assert.deepEqual(await solicitud("GET", "/lotes", undefined, 200), []);
        for (const cambios of [{ _id: "1" }, { hectareas: 0 }, { hectareas: "12" },
            { ubicacion: " " }, { productorId: 0 }, { tipoCultivoId: 1.5 }]) {
            await solicitud("POST", "/lotes", { ...loteValido, ...cambios }, 400);
        }
        // Un ID puede tener formato correcto y aun así apuntar a un registro inexistente.
        await solicitud("POST", "/lotes", { ...loteValido, productorId: 999 }, 400);
        await solicitud("POST", "/lotes", { ...loteValido, tipoCultivoId: 999 }, 400);
        const creado = await solicitud("POST", "/lotes", loteValido, 201);
        assert.equal(creado.lote.hectareas, 12.5);
        await solicitud("POST", "/lotes", loteValido, 400);
        for (const id of ["1", "1e0", "0x1"]) {
            assert.equal((await solicitud("GET", `/lotes/${id}`, undefined, 200))._id, 1);
        }
        // Cambiamos solo la ubicación: las hectáreas y las relaciones deben conservarse.
        const parcial = await solicitud("PUT", "/lotes/1", { _id: 1, ubicacion: "Ubicación actualizada", desconocido: "ignorado" }, 200);
        assert.equal(parcial.lote.ubicacion, "Ubicación actualizada");
        assert.equal(parcial.lote.hectareas, loteValido.hectareas);
        assert.equal(parcial.lote.tipoCultivoId, 1);
        assert.equal(parcial.lote.productorId, 1);
        assert.equal(Object.hasOwn(parcial.lote, "desconocido"), false);
        // Rechazamos cambios vacíos, tipos incorrectos y referencias que no existen.
        for (const cuerpo of [{}, [], { desconocido: 1 }, { _id: 2, hectareas: 5 },
            { hectareas: null }, { hectareas: -1 }, { ubicacion: "" }, { productorId: "1" },
            { productorId: 999 }, { tipoCultivoId: 999 }]) {
            await solicitud("PUT", "/lotes/1", cuerpo, 400);
        }
        await solicitud("PUT", "/lotes/999", {}, 404);
        await solicitud("GET", "/lotes/999", undefined, 404);
        await solicitud("DELETE", "/lotes/999", undefined, 404);
        for (const metodo of ["GET", "PUT", "DELETE"]) {
            await solicitud(metodo, "/lotes/abc", metodo === "PUT" ? {} : undefined, 400);
        }
        // Un lote existente sin observaciones devuelve []; uno inexistente devuelve 404.
        assert.deepEqual(await solicitud("GET", "/lotes/1/observaciones", undefined, 200), []);
        await solicitud("GET", "/lotes/999/observaciones", undefined, 404);
        await solicitud("GET", "/lotes/0/observaciones", undefined, 400);
        // Podemos borrar un lote sin historial, pero su productor sigue protegido por el lote 1.
        await solicitud("POST", "/lotes", { ...loteValido, _id: 2 }, 201);
        await solicitud("DELETE", "/lotes/2", undefined, 200);
        await solicitud("GET", "/lotes/2", undefined, 404);
        await solicitud("DELETE", "/productores/1", undefined, 400);
    });
    // Notas - Andrea | Fin | Explicación del CRUD de lotes

    // Notas - Andrea | Inicio | Explicación de observaciones, filtros e historial
    /*
     * Qué: registra observaciones y consulta el historial y los filtros por técnico o alerta.
     * Para qué: validar fechas y relaciones, y conservar los registros históricos.
     * Cuándo: cuando ya existen el lote 1, el técnico 1 y el cultivo 1.
     * Quién: la prueba envía solicitudes; Express y los controladores consultan MongoDB.
     * Dónde: en /observaciones, /lotes?alerta=... y /lotes/:id/observaciones.
     */
    await t.test("observaciones, filtros, historial y protección de las relaciones", async () => {
        // El técnico debe estar vinculado a una cuenta Ingeniero y asignado al lote.
        await require("../models/TecnicoTieneLote").create({ _id: 1, tecnicoId: 1, loteId: 1 });
        assert.deepEqual(await solicitud("GET", "/observaciones", undefined, 200), []);
        // Incluimos fechas que parecen válidas por su formato, pero no existen en el calendario.
        for (const cambios of [{ _id: "1" }, { loteId: 0 }, { tecnicoId: 1.5 }, { tipoCultivoId: "1" },
            { fecha: "2025-02-29" }, { fecha: "2024-04-31" }, { fecha: "29/02/2024" },
            { fecha: "2024-02-29T00:00:00Z" }, { fecha: null }, { estadoCultivo: " " },
            { observaciones: "" }, { nivelAlerta: "normal" }]) {
            await solicitud("POST", "/observaciones", { ...observacionValida, ...cambios }, 400);
        }
        for (const campo of ["loteId", "tecnicoId", "tipoCultivoId"]) {
            await solicitud("POST", "/observaciones", { ...observacionValida, [campo]: 999 }, 400);
        }
        // El 29 de febrero de 2024 sí existe. Luego dejamos cuatro observaciones para el historial.
        const creado = await solicitud("POST", "/observaciones", { ...observacionValida, desconocido: "ignorado" }, 201);
        assert.equal(creado.observacion.fecha, "2024-02-29");
        assert.equal(Object.hasOwn(creado.observacion, "desconocido"), false);
        await solicitud("POST", "/observaciones", observacionValida, 400);
        await solicitud("POST", "/observaciones", { ...observacionValida, _id: 2, nivelAlerta: "Crítico" }, 201);
        await solicitud("POST", "/observaciones", { ...observacionValida, _id: 3, nivelAlerta: "Crítico" }, 201);
        await solicitud("POST", "/observaciones", { ...observacionValida, _id: 4, nivelAlerta: "Atención" }, 201);
        for (const id of ["1", "1e0", "0x1"]) {
            assert.equal((await solicitud("GET", `/observaciones/${id}`, undefined, 200))._id, 1);
        }
        await solicitud("GET", "/observaciones/999", undefined, 404);
        await solicitud("GET", "/observaciones/abc", undefined, 400);
        // La API no ofrece estas rutas: las observaciones solo se crean y consultan.
        for (const metodo of ["PUT", "DELETE"]) {
            const resultado = await solicitud(metodo, "/observaciones/1", metodo === "PUT" ? {} : undefined, 404);
            assert.equal(resultado.mensaje, "Ruta no encontrada");
        }
        assert.equal((await solicitud("GET", "/lotes/1/observaciones", undefined, 200)).length, 4);
        assert.equal((await solicitud("GET", "/observaciones?tecnicoId=1e0", undefined, 200)).length, 4);
        // También rechazamos un filtro repetido, por ejemplo tecnicoId=1&tecnicoId=1.
        for (const filtro of ["abc", "0", "1.5", "", "1&tecnicoId=1"]) {
            await solicitud("GET", `/observaciones?tecnicoId=${filtro}`, undefined, 400);
        }
        await solicitud("GET", "/observaciones?tecnicoId=999", undefined, 404);
        // El filtro revisa todo el historial y devuelve cada lote una sola vez.
        for (const nivel of ["Normal", "Atención", "Crítico"]) {
            const lotes = await solicitud("GET", `/lotes?alerta=${encodeURIComponent(nivel)}`, undefined, 200);
            assert.deepEqual(lotes.map(lote => lote._id), [1]);
        }
        for (const filtro of ["normal", "", "Normal&alerta=Normal"]) {
            await solicitud("GET", `/lotes?alerta=${filtro}`, undefined, 400);
        }
        // Un lote o técnico con observaciones no se puede borrar.
        await solicitud("DELETE", "/lotes/1", undefined, 400);
        await solicitud("DELETE", "/tecnicos/1", undefined, 400);
        assert.equal((await solicitud("GET", "/lotes/1/observaciones", undefined, 200)).length, 4);
    });
    // Notas - Andrea | Fin | Explicación de observaciones, filtros e historial

    // Notas - Andrea | Inicio | Explicación de las vistas y rutas desconocidas
    /*
     * Qué: prueba la página inicial, los listados, los detalles y sus errores.
     * Para qué: comprobar que las vistas devuelvan HTML y la API responda sus errores en JSON.
     * Cuándo: después de preparar los registros que se mostrarán en las páginas.
     * Quién: Express recibe las solicitudes y Pug genera las páginas que la prueba revisa.
     * Dónde: en /, /web/lotes, /web/tecnicos y una ruta que no existe.
     */
    await t.test("vistas HTML, redirección y rutas desconocidas", async () => {
        // No seguimos la redirección automáticamente: queremos comprobar el 302 y su destino.
        const raiz = await fetch(base, { redirect: "manual", headers: { Connection: "close" } });
        assert.equal(raiz.status, 302);
        assert.equal(raiz.headers.get("location"), "/login");
        await raiz.text();
        for (const ruta of ["/web/lotes", "/web/tecnicos", "/web/lotes/1", "/web/tecnicos/1e0"]) {
            assert.match(await solicitud("GET", ruta, undefined, 200, true), /<html/);
        }
        // /web y /WEB deben conservar HTML, tanto para IDs inválidos como inexistentes.
        for (const recurso of ["lotes", "tecnicos"]) {
            for (const prefijo of ["/web", "/WEB"]) {
                await solicitud("GET", `${prefijo}/${recurso}/abc`, undefined, 400, true);
                await solicitud("GET", `${prefijo}/${recurso}/999`, undefined, 404, true);
            }
        }
        assert.equal((await solicitud("GET", "/ruta-inexistente", undefined, 404)).mensaje, "Ruta no encontrada");
    });
    // Notas - Andrea | Fin | Explicación de las vistas y rutas desconocidas

    // Notas - Andrea | Inicio | Explicación del JSON malformado y el logger
    /*
     * Qué: envía JSON incompleto y revisa el registro de las solicitudes en consola.
     * Para qué: comprobar que express.json() rechace el cuerpo y que el logger siga funcionando.
     * Cuándo: al recibir un cuerpo JSON que no se puede leer, y luego una consulta válida.
     * Quién: express.json() detecta el error; el logger escribe y la prueba captura esos mensajes.
     * Dónde: en POST /productores, GET /lotes y console.log del proceso de prueba.
     */
    await t.test("JSON malformado y logger propio", async (subtest) => {
        const registros = [];
        // Sustituimos temporalmente la consola para leer los mensajes sin cambiar el logger.
        subtest.mock.method(console, "log", (...valores) => registros.push(valores.join(" ")));
        subtest.mock.method(console, "error", () => {});
        // Enviamos el texto roto directamente; JSON.stringify produciría un JSON válido.
        const respuesta = await fetch(base + "/productores", {
            method: "POST", headers: { "Content-Type": "application/json", Connection: "close" }, body: '{"_id":'
        });
        assert.equal(respuesta.status, 400);
        assert.deepEqual(await respuesta.json(), { mensaje: "Solicitud inválida" });
        assert.ok(registros.some(registro => /^\[[^\]]+\] POST \/productores$/.test(registro)));
        await solicitud("GET", "/lotes?alerta=Normal", undefined, 200);
        assert.ok(registros.some(registro => registro.endsWith(" GET /lotes?alerta=Normal")));
        // Restauramos la consola para que los siguientes tests usen su funcionamiento normal.
        subtest.mock.restoreAll();
    });
    // Notas - Andrea | Fin | Explicación del JSON malformado y el logger

    // Notas - Andrea | Inicio | Explicación del manejador global de errores
    /*
     * Qué: provoca errores controlados de consulta y revisa sus respuestas.
     * Para qué: comprobar los estados 400 y 500 y que no se muestren detalles internos.
     * Cuándo: cuando una consulta lanza un error de tipos, validación, duplicado o inesperado.
     * Quién: la prueba simula el fallo; el middleware global de Express prepara la respuesta.
     * Dónde: en GET /productores y GET /web/lotes, con JSON y HTML respectivamente.
     */
    await t.test("el manejador global conserva errores de MongoDB y respuestas HTML", async (subtest) => {
        subtest.mock.method(console, "error", () => {});
        const duplicado = Object.assign(new Error("Duplicado simulado"), { code: 11000 });
        // Estos errores son simulados: no estamos apagando ni provocando una caída real de MongoDB.
        for (const [error, estado, mensaje] of [
            [new mongoose.Error.CastError("Number", "abc", "_id"), 400, "Solicitud inválida"],
            [new mongoose.Error.ValidationError(), 400, "Solicitud inválida"],
            [duplicado, 400, "Ya existe un registro con ese ID"],
            [new Error("Detalle privado de prueba"), 500, "Error interno del servidor"]
        ]) {
            // Solo cambiamos find durante este caso. finally lo restaura aunque falle la comprobación.
            const operacion = subtest.mock.method(Productor, "find", async () => { throw error; });
            try {
                assert.deepEqual(await solicitud("GET", "/productores", undefined, estado), { mensaje });
            } finally {
                operacion.mock.restore();
            }
        }
        // En las vistas, un error interno debe generar HTML sin revelar el detalle privado.
        const operacion = subtest.mock.method(Lote, "find", () => { throw new Error("Detalle privado"); });
        try {
            const html = await solicitud("GET", "/web/lotes", undefined, 500, true);
            assert.match(html, /Error interno del servidor/);
            assert.doesNotMatch(html, /Detalle privado/);
        } finally {
            operacion.mock.restore();
        }
        subtest.mock.restoreAll();
    });
    // Notas - Andrea | Fin | Explicación del manejador global de errores
    // Notas - Andrea | Inicio | Campos obligatorios, tipos y valores de entrada
    /*
     * Qué: omite cada campo obligatorio y prueba valores de tipos incorrectos.
     * Para qué: asegurar que un dato faltante o inválido no cree ni cambie registros.
     * Cuándo: al enviar POST incompletos y PUT con nombres inválidos.
     * Quién: los middleware validan las entradas; la prueba compara las respuestas y los datos.
     * Dónde: en las rutas de productores, técnicos, lotes y observaciones.
     */
    await t.test("cada campo obligatorio y los tipos inválidos se rechazan", async () => {
        // Cada recurso indica un ejemplo válido y los valores inválidos que probaremos por campo.
        const recursos = [
            { ruta: "/productores", datos: { _id: 101, nombre: "Productor de prueba", ...acceso("/productores", 101) },
                invalidos: { _id: [null, "101", true], nombre: [null, 17, [], {}, "  "] } },
            { ruta: "/tecnicos", datos: { _id: 101, nombre: "Técnico de prueba", ...acceso("/tecnicos", 101) },
                invalidos: { _id: [null, "101", true], nombre: [null, 17, [], {}, "  "] } },
            { ruta: "/lotes", datos: { ...loteValido, _id: 101 },
                invalidos: { _id: [null, "101"], productorId: ["1", false],
                    tipoCultivoId: [null, "1", false], hectareas: [null, "12", 0, -1],
                    ubicacion: [null, 17, "  "] } },
            { ruta: "/observaciones", datos: { ...observacionValida, _id: 101 },
                invalidos: { _id: [null, "101"], loteId: [null, "1", false],
                    tecnicoId: [null, "1", false], tipoCultivoId: [null, "1", false],
                    fecha: [null, 17, "2026-02-30"], estadoCultivo: [null, 17, "  "],
                    observaciones: [null, 17, "  "], nivelAlerta: [null, [], "Urgente"] } }
        ];

        for (const { ruta, datos, invalidos } of recursos) {
            // Fecha de observación y cliente del lote pueden omitirse.
            for (const campo of Object.keys(datos)) {
                if ((ruta === "/observaciones" && campo === "fecha") || (ruta === "/lotes" && campo === "productorId")) continue;
                const incompleto = { ...datos };
                delete incompleto[campo];
                await solicitud("POST", ruta, incompleto, 400);
            }
            // Después mantenemos los campos y sustituimos sus valores por datos inválidos.
            for (const [campo, valores] of Object.entries(invalidos)) {
                for (const valor of valores) {
                    await solicitud("POST", ruta, { ...datos, [campo]: valor }, 400);
                }
            }
            // Ninguno de los intentos anteriores debe haber creado el registro 101.
            await solicitud("GET", `${ruta}/101`, undefined, 404);
        }
        // Comparamos antes y después para verificar que un PUT rechazado no cambie el nombre.
        for (const ruta of ["/productores/1", "/tecnicos/1"]) {
            const anterior = await solicitud("GET", ruta, undefined, 200);
            for (const nombre of [null, 17, [], "  "]) {
                await solicitud("PUT", ruta, { nombre }, 400);
            }
            assert.deepEqual(await solicitud("GET", ruta, undefined, 200), anterior);
        }
    });
    // Notas - Andrea | Fin | Campos obligatorios, tipos y valores de entrada

    // Notas - Andrea | Inicio | Integridad de relaciones y cultivo histórico
    /*
     * Qué: intenta guardar referencias inexistentes y luego cambia el cultivo de un lote.
     * Para qué: evitar relaciones inválidas y conservar lo registrado en observaciones anteriores.
     * Cuándo: al crear o actualizar datos relacionados, cuando ya hay un historial guardado.
     * Quién: los controladores comprueban las relaciones; la prueba compara los datos completos.
     * Dónde: en /lotes, /observaciones y el historial del lote 1.
     */
    await t.test("las referencias inexistentes no escriben y el cultivo histórico se conserva", async () => {
        // Guardamos las respuestas anteriores para detectar cualquier cambio indebido.
        const lotesAnteriores = await solicitud("GET", "/lotes", undefined, 200);
        const loteAnterior = await solicitud("GET", "/lotes/1", undefined, 200);
        // El productor y el cultivo 999 no existen; no deben crearse lotes ni alterarse el lote 1.
        for (const cambios of [{ productorId: 999 }, { tipoCultivoId: 999 }]) {
            await solicitud("POST", "/lotes", { ...loteValido, _id: 201, ...cambios }, 400);
            await solicitud("GET", "/lotes/201", undefined, 404);
            await solicitud("PUT", "/lotes/1", cambios, 400);
            assert.deepEqual(await solicitud("GET", "/lotes/1", undefined, 200), loteAnterior);
        }
        assert.deepEqual(await solicitud("GET", "/lotes", undefined, 200), lotesAnteriores);

        const historialAnterior = await solicitud("GET", "/lotes/1/observaciones", undefined, 200);
        const observacionesAnteriores = await solicitud("GET", "/observaciones", undefined, 200);
        // Revisamos por separado cada referencia necesaria para crear una observación.
        for (const campo of ["loteId", "tecnicoId", "tipoCultivoId"]) {
            await solicitud("POST", "/observaciones", { ...observacionValida, _id: 201, [campo]: 999 }, 400);
            await solicitud("GET", "/observaciones/201", undefined, 404);
        }
        assert.deepEqual(await solicitud("GET", "/observaciones", undefined, 200), observacionesAnteriores);

        // Preparamos otro cultivo válido y lo asignamos al lote actual, sin editar su historial.
        await TipoCultivo.create({ _id: 2, nombre: "Soja de prueba" });
        const actualizado = await solicitud("PUT", "/lotes/1", { tipoCultivoId: 2 }, 200);
        assert.equal(actualizado.lote.tipoCultivoId, 2);
        assert.deepEqual(await solicitud("GET", "/lotes/1/observaciones", undefined, 200), historialAnterior);
        assert.ok(historialAnterior.every(observacion => observacion.tipoCultivoId === 1));
    });
    // Notas - Andrea | Fin | Integridad de relaciones y cultivo histórico

    // Notas - Andrea | Inicio | Niveles de alerta permitidos en API y modelo
    /*
     * Qué: acepta Normal, Atención y Crítico y rechaza otras formas de escribirlos.
     * Para qué: mantener los mismos valores permitidos en la entrada de la API y en el modelo.
     * Cuándo: al registrar observaciones, validar su esquema y filtrar lotes por alerta.
     * Quién: el middleware y el esquema de Mongoose usan el catálogo compartido de alertas.
     * Dónde: en /observaciones, /lotes?alerta=... y el modelo Observacion.
     */
    await t.test("API y modelo conservan exactamente los tres niveles de alerta", async () => {
        for (const [indice, nivelAlerta] of ["Normal", "Atención", "Crítico"].entries()) {
            // El test anterior cambió el cultivo del lote; las nuevas cargas usan el actual.
            const datos = { ...observacionValida, tipoCultivoId: 2, _id: 301 + indice, nivelAlerta };
            // validateSync revisa el esquema en memoria, sin guardar. undefined significa sin error.
            assert.equal(new Observacion(datos).validateSync(), undefined);
            const creado = await solicitud("POST", "/observaciones", datos, 201);
            assert.equal(creado.observacion.nivelAlerta, nivelAlerta);
            const lotes = await solicitud("GET", `/lotes?alerta=${encodeURIComponent(nivelAlerta)}`, undefined, 200);
            assert.deepEqual(lotes.map(lote => lote._id), [1]);
        }
        // Las alertas inválidas deben rechazarse sin agregar observaciones a MongoDB.
        const anteriores = await solicitud("GET", "/observaciones", undefined, 200);
        for (const nivelAlerta of ["normal", "Atencion", "Critico", "Urgente", " Normal", null]) {
            const datos = { ...observacionValida, _id: 399, nivelAlerta };
            assert.ok(new Observacion(datos).validateSync());
            assert.deepEqual(await solicitud("POST", "/observaciones", datos, 400), {
                mensaje: "El nivel de alerta debe ser Normal, Atención o Crítico"
            });
            await solicitud("GET", `/lotes?alerta=${encodeURIComponent(nivelAlerta)}`, undefined, 400);
        }
        assert.deepEqual(await solicitud("GET", "/observaciones", undefined, 200), anteriores);
    });
    // Notas - Andrea | Fin | Niveles de alerta permitidos en API y modelo

    // Notas - Andrea | Inicio | Protección del contenido y persistencia del historial
    /*
     * Qué: intenta actualizar o borrar observaciones y revisa todo su contenido después.
     * Para qué: comprobar que la API conserva las observaciones históricas.
     * Cuándo: al intentar PUT, PATCH o DELETE sobre las rutas de observaciones.
     * Quién: Express responde 404 porque esas rutas no existen; la prueba comprueba lo guardado.
     * Dónde: en /observaciones, el historial del lote 1 y la colección temporal de observaciones.
     */
    await t.test("las observaciones históricas no se modifican ni se eliminan por la API", async () => {
        // Conservamos copias de las respuestas antes de intentar modificar o borrar el historial.
        const registroAnterior = await solicitud("GET", "/observaciones/1", undefined, 200);
        const observacionesAnteriores = await solicitud("GET", "/observaciones", undefined, 200);
        const historialAnterior = await solicitud("GET", "/lotes/1/observaciones", undefined, 200);
        const intentos = [
            ["PUT", "/observaciones/1", { ...observacionValida, observaciones: "Intento de cambio" }],
            ["PATCH", "/observaciones/1", { nivelAlerta: "Crítico" }],
            ["DELETE", "/observaciones/1"],
            ["DELETE", "/observaciones"],
            ["DELETE", "/observaciones/999"]
        ];
        // Después de cada rechazo, comparamos el registro y los listados completos.
        for (const [metodo, ruta, cuerpo] of intentos) {
            assert.deepEqual(await solicitud(metodo, ruta, cuerpo, 404), { mensaje: "Ruta no encontrada" });
            assert.deepEqual(await solicitud("GET", "/observaciones/1", undefined, 200), registroAnterior);
            assert.deepEqual(await solicitud("GET", "/observaciones", undefined, 200), observacionesAnteriores);
            assert.deepEqual(await solicitud("GET", "/lotes/1/observaciones", undefined, 200), historialAnterior);
        }
        // Consultamos también MongoDB directamente. lean devuelve objetos simples para comparar.
        // Esto prueba la protección de la API; no agrega un bloqueo de borrado directo en MongoDB.
        assert.deepEqual(await Observacion.findById(1).lean(), registroAnterior);
        assert.deepEqual(await Observacion.find().lean(), observacionesAnteriores);
    });
    // Notas - Andrea | Fin | Protección del contenido y persistencia del historial

    // Notas - Andrea | Inicio | Eliminaciones relacionadas sin pérdida de datos
    /*
     * Qué: intenta borrar un productor con lotes, un técnico con observaciones y un lote con historial.
     * Para qué: evitar que queden referencias rotas o se pierdan datos relacionados.
     * Cuándo: al recibir DELETE sobre registros que todavía tienen dependencias.
     * Quién: cada controlador detecta las relaciones y rechaza la eliminación con 400.
     * Dónde: en /productores/1, /tecnicos/1 y /lotes/1, dentro de la base temporal.
     */
    await t.test("los DELETE bloqueados conservan todos los recursos relacionados", async () => {
        // Guardamos los cuatro listados antes de enviar cualquier DELETE.
        const rutas = ["/productores", "/tecnicos", "/lotes", "/observaciones"];
        const anteriores = new Map();
        for (const ruta of rutas) {
            anteriores.set(ruta, await solicitud("GET", ruta, undefined, 200));
        }
        // Cada fila contiene la ruta bloqueada y el mensaje exacto que debe recibir el cliente.
        const bloqueos = [
            ["/productores/1", "No se puede eliminar el productor porque posee lotes asociados"],
            ["/tecnicos/1", "No se puede eliminar el técnico porque posee observaciones registradas"],
            ["/lotes/1", "No se puede eliminar el lote porque posee observaciones en su historial"]
        ];
        for (const [ruta, mensaje] of bloqueos) {
            assert.deepEqual(await solicitud("DELETE", ruta, undefined, 400), { mensaje });
            // No basta con responder 400: todos los datos deben seguir iguales.
            for (const recurso of rutas) {
                assert.deepEqual(await solicitud("GET", recurso, undefined, 200), anteriores.get(recurso));
            }
        }
    });
    // Notas - Andrea | Fin | Eliminaciones relacionadas sin pérdida de datos

    // Notas - Andrea | Inicio | Estados HTTP, mensajes específicos y errores al guardar
    /*
     * Qué: comprueba los mensajes de error y simula un fallo antes de guardar un productor.
     * Para qué: dar respuestas claras sin revelar detalles internos ni crear un registro en ese fallo.
     * Cuándo: con datos inválidos, duplicados, referencias inexistentes o el fallo simulado de save().
     * Quién: validadores y controladores rechazan los datos; el manejador global responde al fallo interno.
     * Dónde: en las cuatro rutas de recursos y en save() del modelo Productor.
     */
    await t.test("los errores HTTP conservan sus mensajes y un fallo antes de escribir no crea datos", async (subtest) => {
        // Cada fila indica método, ruta, cuerpo, estado esperado y mensaje esperado.
        const casos = [
            ["POST", "/productores", {}, 400, "Se requiere un ID entero positivo y un nombre no vacío"],
            ["POST", "/tecnicos", {}, 400, "Se requiere un ID entero positivo y un nombre no vacío"],
            ["PUT", "/productores/1", {}, 400, "Se requiere un nombre no vacío; el ID no se puede cambiar"],
            ["PUT", "/tecnicos/1", { nombre: null }, 400, "Se requiere un nombre no vacío; el ID no se puede cambiar"],
            ["POST", "/lotes", {}, 400, "Se requieren IDs enteros positivos, hectáreas numéricas mayores que cero y ubicación no vacía"],
            ["PUT", "/lotes/1", { ubicacion: null }, 400, "Los datos del lote son inválidos"],
            ["POST", "/observaciones", { ...observacionValida, fecha: "2026-02-30" }, 400,
                "Se requieren IDs enteros positivos, fecha válida YYYY-MM-DD, estado del cultivo y texto de observaciones no vacíos"],
            ["POST", "/productores", { _id: 1, nombre: "Duplicado" }, 400, "Ya existe un productor con ese ID"],
            ["POST", "/tecnicos", { _id: 1, nombre: "Duplicado" }, 400, "Ya existe un técnico con ese ID"],
            ["POST", "/lotes", loteValido, 400, "Ya existe un lote con ese ID"],
            ["POST", "/observaciones", observacionValida, 400, "Ya existe una observación con ese ID"],
            ["POST", "/lotes", { ...loteValido, _id: 601, productorId: 999 }, 400, "El productor no existe"],
            ["POST", "/lotes", { ...loteValido, _id: 601, tipoCultivoId: 999 }, 400, "El tipo de cultivo no existe"],
            ["POST", "/observaciones", { ...observacionValida, _id: 601, loteId: 999 }, 400, "El lote no existe"],
            ["POST", "/observaciones", { ...observacionValida, _id: 601, tecnicoId: 999 }, 400, "El técnico no existe"],
            ["POST", "/observaciones", { ...observacionValida, _id: 601, tipoCultivoId: 999 }, 400, "El tipo de cultivo no existe"],
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

        // Tomamos los datos anteriores y provocamos un fallo controlado, antes de escribir en MongoDB.
        const anteriores = await solicitud("GET", "/productores", undefined, 200);
        subtest.mock.method(console, "error", () => {});
        subtest.mock.method(Productor.prototype, "save", async () => {
            throw new Error("Detalle privado del fallo de escritura");
        });
        try {
            assert.deepEqual(await solicitud("POST", "/productores", { _id: 601, nombre: "No se guarda", ...acceso("/productores", 601) }, 500), {
                mensaje: "Error interno del servidor"
            });
        } finally {
            subtest.mock.restoreAll();
        }
        // El comportamiento real ya está restaurado: verificamos que el productor 601 no se guardó.
        await solicitud("GET", "/productores/601", undefined, 404);
        assert.deepEqual(await solicitud("GET", "/productores", undefined, 200), anteriores);
    });
    // Notas - Andrea | Fin | Estados HTTP, mensajes específicos y errores al guardar

    await t.test("integración de cuentas, cliente opcional y observaciones del ingeniero", async () => {
        const Usuario = require("../models/Usuario");
        const UsuarioTieneRol = require("../models/UsuarioTieneRol");
        for (const [ruta, rolId] of [["/productores", 3], ["/tecnicos", 2]]) {
            const ficha = await solicitud("GET", ruta + "/1", undefined, 200);
            const datosAcceso = acceso(ruta, 1);
            assert.equal(ficha.usuarioId, datosAcceso.cuentaId);
            assert.ok(await UsuarioTieneRol.exists({ _id: ficha.usuarioId, usuarioId: ficha.usuarioId, rolId }));
            const cuenta = await Usuario.findById(ficha.usuarioId).select("+passwordHash +salt +passwordIteraciones");
            assert.ok(await cuenta.validarPassword(datosAcceso.password));
            await solicitud("POST", "/auth/login", { usuario: datosAcceso.usuario, password: datosAcceso.password }, 200, true);
        }
        for (const [id, extra] of [[701, {}], [702, { productorId: null }]]) {
            const creado = await solicitud("POST", "/lotes", {
                _id: id, hectareas: 1, ubicacion: "Sin cliente", tipoCultivoId: 1, ...extra
            }, 201);
            assert.equal(creado.lote.productorId, null);
            await solicitud("PUT", "/lotes/" + id, { productorId: 1 }, 200);
            assert.equal((await solicitud("PUT", "/lotes/" + id, { productorId: null }, 200)).lote.productorId, null);
        }
        const actual = { ...observacionValida, _id: 701, tipoCultivoId: 2 };
        delete actual.fecha;
        const fechaActual = () => new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit"
        }).format(new Date());
        const antes = fechaActual();
        const creada = await solicitud("POST", "/observaciones", actual, 201);
        assert.ok([antes, fechaActual()].includes(creada.observacion.fecha));
        assert.equal(creada.observacion.estado, "Cargada");
        await solicitud("POST", "/observaciones", { ...actual, _id: 702, tipoCultivoId: 1 }, 400);
        await solicitud("POST", "/observaciones", { ...actual, _id: 702, loteId: 701, tipoCultivoId: 1 }, 400);
        await Usuario.updateOne({ _id: acceso("/tecnicos", 1).cuentaId }, { $set: { activo: false } });
        try {
            await solicitud("POST", "/observaciones", { ...actual, _id: 702 }, 400);
        } finally {
            await Usuario.updateOne({ _id: acceso("/tecnicos", 1).cuentaId }, { $set: { activo: true } });
        }
        assert.equal(await Observacion.findById(702), null);
    });
});
// Notas - Andrea | Fin | Explicación de la prueba principal
// Notas - Andrea | Fin | Pruebas de regresión de la API
