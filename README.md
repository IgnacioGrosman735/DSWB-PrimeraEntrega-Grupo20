# AgroTec — Monitoreo de lotes

AgroTec brinda servicios de monitoreo a productores agrícolas. Esta aplicación centraliza la información que antes se registraba en papel y planillas, y permite consultar el historial de observaciones de cada lote.

Actualmente administra productores, técnicos y lotes, registra observaciones y permite consultar el historial, los lotes por alerta y las observaciones por técnico.

## Estado actual del proyecto

| Recurso | Estado actual | Funcionalidad |
| --- | --- | --- |
| Productores (clientes) | CRUD y alta de acceso | API y formularios desde el menú Admin. |
| Lotes | CRUD e historial implementados | Administración mediante la API. |
| Técnicos (ingenieros) | CRUD y alta de acceso | API, formularios y asignación de lotes. |
| Observaciones | Registro y consulta implementados | Conservar el historial sin eliminación. |
| Tipos de cultivo | CRUD implementado | Administración mediante API y vistas Pug. |
| Usuarios y roles | Login y cuentas vinculadas | Correo, contraseña con hash y salt y presentación del perfil. |

### Usuarios y perfiles

El ingreso se realiza en `/login` con correo y contraseña. El campo `usuario` guarda el correo único y `nombre` el nombre para mostrar. Los roles son `1 = Admin`, `2 = Ingeniero` y `3 = Cliente`; no hay registro público ni ABM de roles.

- **Admin:** administra lotes, cultivos, clientes e ingenieros. Al crear un cliente o ingeniero ingresa los IDs de ficha y usuario, nombre, correo y contraseña; el backend crea la cuenta, asigna el rol y vincula la ficha mediante `usuarioId`. La importación crea la cuenta Admin con hash, salt y rol.
- **Ingeniero:** consulta sus lotes asignados, registra observaciones y ve su propio historial por lote. La ficha técnica debe estar vinculada a una cuenta activa con rol Ingeniero.
- **Cliente:** puede iniciar sesión; los reportes de su perfil quedan pendientes.

Al editar una ficha sin cuenta se puede crear su acceso. También se puede vincular una cuenta Ingeniero existente desde la edición del técnico. Eliminar una ficha no elimina su cuenta; la modificación de credenciales y baja de cuentas no están implementadas en estos formularios.

`models/Usuario.js` genera hash y salt mediante PBKDF2 asíncrono con SHA-512, 220000 iteraciones y salt aleatorio de 16 bytes. Los métodos `crearPasswordSeguro()` y `validarPassword()` se usan con `await`; la comparación utiliza `timingSafeEqual`. La contraseña tiene entre 15 y 128 caracteres y nunca se almacena en texto plano.

**Alcance pendiente:** no hay sesiones ni autorización de rutas por rol. Los menús se adaptan al perfil, pero los endpoints siguen accesibles directamente. `sessionStorage` conserva solo la presentación del menú. El enlace «Olvidé mi contraseña» indica contactar al administrador; no recupera contraseñas automáticamente.

### Asignaciones y observaciones

Un lote puede crearse sin asignaciones. Desde Clientes e Ingenieros se asignan o quitan lotes: cada lote admite como máximo un cliente y varios ingenieros. Las asignaciones de ingenieros se guardan en `tecnico_tiene_lotes`, sin repetir la pareja técnico–lote.

En «Mis lotes y observaciones», cada lote tiene dos acciones: **Nueva observación** y **Ver historial**. El historial filtra por lote e ingeniero; después de guardar se abre esa vista. Si la fecha se omite, se asigna la actual en el servidor (zona America/Argentina/Buenos_Aires). Si se envía, debe ser una fecha real en formato YYYY-MM-DD y se conserva.

El campo `estado` admite Pendiente y Cargada, separado de `estadoCultivo`. El servidor guarda las nuevas observaciones como Cargada; los registros antiguos sin ese campo se muestran igual. Pendiente queda previsto para la futura app local: el almacenamiento offline y la sincronización todavía no están implementados. También quedan pendientes los múltiples cultivos por lote.

## Tecnologías e instalación

La aplicación utiliza JavaScript, Node.js, Express, CommonJS, MongoDB, Mongoose y Pug. La persistencia se realiza en MongoDB; los archivos JSON de `data/` contienen los datos de ejemplo para la carga inicial.

Requisitos:

- Node.js 20 o superior y npm.
- MongoDB Community Server instalado y en ejecución.

### 1. Iniciar MongoDB local

En Windows, MongoDB puede ejecutarse como servicio. Desde Servicios, iniciar **MongoDB Server (MongoDB)** y verificar su estado en PowerShell:

```powershell
Get-Service MongoDB
```

El estado debe ser `Running`. Si MongoDB se instaló sin servicio, iniciar `mongod` con una carpeta de datos y mantener esa terminal abierta:

```powershell
New-Item -ItemType Directory -Force ./tmp/mongodb-data
mongod --dbpath ./tmp/mongodb-data --bind_ip 127.0.0.1 --port 27017
```

Si `mongod` no está en PATH, usar la ruta completa al ejecutable. El servicio de Windows administra su propia carpeta de datos y no necesita este segundo método. Para conservar la información entre reinicios, mantener la misma carpeta de datos.

### 2. Instalar y configurar el proyecto

Desde la carpeta del proyecto, instalar las dependencias:

```powershell
npm install
```

La configuración predeterminada permite conectarse a MongoDB local sin definir variables adicionales:

| Variable | Valor predeterminado | Descripción |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/agrotec` | Dirección de conexión y nombre de la base de datos. |
| `PORT` | `3100` | Puerto HTTP de la aplicación. |

Para utilizar otros valores, configurar las variables antes de ejecutar los comandos de importación o inicio. Ejemplo en PowerShell:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/agrotec"
$env:PORT = "3100"
```

Las variables configuradas así pertenecen a esa sesión de PowerShell. `.env.example` muestra las opciones disponibles; la aplicación no carga archivos `.env` automáticamente.

### 3. Carga inicial y ejecución

Para cargar los datos de ejemplo por primera vez, ejecutar con la API detenida y las cinco colecciones vacías:

```powershell
npm run importar
```

El importador valida los cinco JSON, sus identificadores y relaciones. Crea las nueve colecciones si no existen (`usuarios`, `roles`, `usuarios_tiene_roles`, `productores`, `tecnicos`, `tiposCultivo`, `lotes`, `observaciones` y `tecnico_tiene_lotes`), prepara sus validaciones e índices e inserta los 27 documentos de ejemplo. No hace falta crearlas manualmente en Compass. Cancela si alguna de las cinco colecciones de datos de ejemplo ya contiene registros y no sobrescribe información. Si falla durante la escritura, revisar si quedó una carga parcial antes de repetirlo.

También prepara los roles y crea el Admin de prueba: correo `admin@prueba.com`, contraseña `administrador123456789` y nombre `seba`. Usa el ID `1` para el usuario y su relación con el rol Admin; guarda la contraseña mediante hash y salt. Si la cuenta ya existe, conserva sus datos y contraseña. Si esos IDs o el correo pertenecen a otra cuenta o relación, cancela la carga.

Una vez realizada la carga inicial, iniciar el servidor:

```powershell
npm start
```

La aplicación queda disponible en [http://localhost:3100](http://localhost:3100), salvo que se configure otro puerto. Para reiniciarla, detener el proceso con `Ctrl+C` y volver a ejecutar `npm start`. La importación no se repite al iniciar; los datos se conservan en MongoDB.

El servidor conecta a MongoDB y prepara validadores, índices y roles antes de aceptar solicitudes. No crea cuentas predeterminadas. Si la conexión falla, muestra un mensaje en consola y termina con código de salida 1. Revisar que MongoDB esté activo y que `MONGODB_URI` sea correcta.

<!-- Notas - Andrea | Inicio | Comandos de ejecución y pruebas -->
| Comando | Acción |
| --- | --- |
| `npm install` | Instala las dependencias del proyecto. |
| `npm start` | Conecta a MongoDB e inicia Express. |
| `npm run dev` | Ejecuta `node --watch index.js` y reinicia ante cambios en el código. |
| `npm run importar` | Carga los datos de ejemplo en las cinco colecciones vacías y crea el Admin inicial. |
| `npm run auth:preparar` | Opcional: prepara colecciones de autenticación y roles sin iniciar Express; también se preparan al arrancar. |
| `npm test` | Ejecuta `node --test` con las pruebas HTTP y MongoDB de `tests/api.test.js`. |
<!-- Notas - Andrea | Fin | Comandos de ejecución y pruebas -->

Los endpoints pueden probarse con Postman o Thunder Client utilizando los ejemplos de este documento. La prueba de persistencia consiste en crear datos, detener el servidor con Ctrl+C, volver a ejecutar npm start con la misma base y consultar los registros sin repetir la importación.

<!-- Notas - Andrea | Inicio | Pruebas automatizadas con MongoDB aislado -->
## Pruebas automatizadas

Con MongoDB en ejecución y las dependencias instaladas, ejecutar:

```powershell
npm test
```

Si PowerShell bloquea `npm.ps1`, usar `npm.cmd test`. El comando utiliza el ejecutor integrado de Node.js (`node --test`), sin agregar una dependencia de pruebas.

`tests/api.test.js` importa `app` sin iniciar automáticamente la aplicación, prepara sus propios datos y realiza solicitudes HTTP para comprobar CRUD, historial, filtros, relaciones, validaciones, logger, respuestas JSON y vistas HTML. Las observaciones conservan únicamente las operaciones de creación y consulta.

<!-- Notas - Andrea | Inicio | Cobertura de validaciones y reglas de negocio -->
La misma suite incorpora seis grupos de comprobaciones de validaciones y reglas de negocio:

1. Omite cada campo obligatorio por separado y prueba tipos y valores inválidos en los cuerpos de creación y actualización.
2. Comprueba las referencias de lotes y observaciones, y compara los documentos antes y después de las solicitudes rechazadas para detectar escrituras indebidas.
3. Verifica los tres niveles de alerta permitidos, su coincidencia entre middleware y modelo y el rechazo de variantes inválidas.
4. Comprueba que el historial conserva todos sus campos después de actualizar el lote y tras los intentos de PUT, PATCH y DELETE de observaciones.
5. Comprueba que los DELETE bloqueados preservan los recursos relacionados y el historial completo.
6. Verifica estados HTTP y mensajes exactos; simula un fallo de `save()` antes de la escritura para comprobar la respuesta `500` y que los documentos no cambien.

Además se comprueban las cuentas vinculadas, el login, los lotes sin cliente, la fecha opcional y el rechazo de observaciones sin cuenta activa, sin asignación o con otro cultivo.

Estas comprobaciones utilizan MongoDB real en la base temporal de la suite. Las comparaciones incluyen los datos almacenados, además de las respuestas HTTP.
<!-- Notas - Andrea | Fin | Cobertura de validaciones y reglas de negocio -->

Las pruebas se conectan de forma predeterminada a `mongodb://127.0.0.1:27017`. Para usar otro servidor de MongoDB de pruebas, configurar una variable independiente:

```powershell
$env:TEST_MONGODB_URI = "mongodb://127.0.0.1:27017"
npm.cmd test
```

Cada ejecución usa una base nueva con nombre `agrotec_test_<uuid>`. La suite no utiliza `MONGODB_URI` ni la base `agrotec`: fuerza el nombre de la base temporal incluso si la URI de pruebas incluye otro nombre. Al finalizar, comprueba que la conexión corresponde a la base temporal generada antes de eliminarla y cierra las conexiones. No requiere importar los JSON ni limpiar la base de la aplicación.
<!-- Notas - Andrea | Fin | Pruebas automatizadas con MongoDB aislado -->

## Estructura

<!-- Notas - Andrea | Inicio | Organización modular y flujo de middleware -->
- `index.js`: configuración de Express y Pug, middleware y rutas. Exporta `app` para las pruebas e inicia el servidor únicamente al ejecutarse directamente.
- `config/database.js`: conexión a MongoDB mediante Mongoose.
- `config/coleccionesAuth.js` y `coleccionesNegocio.js`: validaciones e índices de MongoDB.
- `config/cerrarDB.js`: cierre de conexión en los scripts y ante fallos del arranque.
- `models/`: esquemas, validaciones y referencias de los recursos, usuarios, roles y asignaciones.
<!-- Notas - Andrea | Inicio | Catálogo compartido de niveles de alerta -->
- `config/nivelesAlerta.js`: catálogo inmutable con los niveles de alerta, compartido por el middleware de validación y el esquema de observaciones.
<!-- Notas - Andrea | Fin | Catálogo compartido de niveles de alerta -->
- `controllers/`: procesamiento de solicitudes, reglas de negocio, consultas a MongoDB y renderizado de vistas.
- `routes/`: endpoints de los recursos, autenticación y vistas.
- `middleware/logger.js`: registro de fecha, método y URL de las solicitudes.
- `middleware/auth.js`: validación de correo y contraseña del login.
- `views/`: plantillas Pug de login, perfiles, ABM, asignaciones e historial.
- `public/js/`: envío de formularios con fetch y presentación del menú.
- `services/`: creación de accesos y consultas de cuentas de ingenieros.
- `utils/`: validaciones compartidas de correo y contraseña.
- `data/`: archivos JSON con datos de ejemplo para importar.
- `scripts/`: importación inicial y preparación opcional de autenticación.
- `middleware/validaciones/comunes.js`: funciones compartidas para validar IDs, textos, hectáreas, fechas y niveles de alerta.
- `middleware/validaciones/parametros.js`: validación de IDs recibidos en las rutas de la API y de las vistas, y de los filtros `alerta` y `tecnicoId`.
- `middleware/validaciones/productores.js` y `tecnicos.js`: validación de los cuerpos de creación y actualización de cada recurso.
- `middleware/validaciones/lotes.js`: validación de los cuerpos de creación y actualización parcial.
- `middleware/validaciones/observaciones.js`: validación del cuerpo de creación.
- `tests/api.test.js`: pruebas de regresión de endpoints, validaciones, relaciones, logger y manejo de errores.

Las rutas ejecutan los middleware de validación y delegan las operaciones en los controladores. Los validadores comprueban parámetros, filtros y cuerpos; los controladores consultan MongoDB, comprueban relaciones y dependencias y realizan las operaciones mediante los modelos Mongoose con `async/await`. Los modelos conservan sus validaciones al guardar, también para la importación. La API y las vistas utilizan MongoDB; los archivos JSON solo se leen durante la importación.

El orden de ejecución se conserva:

```text
logger → express.json() → rutas → validaciones → controladores
Sin ruta coincidente → middleware 404
Errores enviados a next(error) → manejador global de errores
```

En los PUT, la ruta valida el ID, busca el recurso mediante una función del controlador, valida el cuerpo y ejecuta la actualización. Así conserva la respuesta `404` para un recurso inexistente aunque el cuerpo también sea inválido. Los errores de las vistas `/web` se presentan en HTML.
<!-- Notas - Andrea | Fin | Organización modular y flujo de middleware -->

## Recursos y datos iniciales

### Colecciones e identificadores

La base utiliza las siguientes colecciones. Las cinco primeras tienen datos de ejemplo en JSON:

| JSON original | Colección | Campos almacenados |
| --- | --- | --- |
| productores.json | productores | _id, nombre, usuarioId opcional |
| lotes.json | lotes | _id, hectareas, tipoCultivoId, productorId, ubicacion |
| tecnicos.json | tecnicos | _id, nombre, usuarioId opcional |
| tiposCultivo.json | tiposCultivo | _id, nombre |
| observaciones.json | observaciones | _id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta, estado |
| — | usuarios | _id, nombre, usuario, passwordHash, salt, passwordIteraciones, activo, createdAt, updatedAt |
| — | roles | _id, nombre |
| — | usuarios_tiene_roles | _id, usuarioId, rolId |
| — | tecnico_tiene_lotes | _id, tecnicoId, loteId |

`_id` es la clave primaria y debe ser un entero positivo seguro. Su índice garantiza la unicidad dentro de la colección. Durante la importación, el campo `id` de los JSON se guarda como `_id`.

Los IDs de fichas y usuarios se ingresan manualmente como enteros positivos y únicos dentro de cada colección. No se utilizan contadores. Las altas de acceso reciben `cuentaId` (se guarda como usuarios._id), además del `_id` de la ficha. El backend usa el mismo `cuentaId` como `_id` de usuarios_tiene_roles; no se solicita en el formulario. Este flujo crea una relación de rol por usuario. El backend calcula el ID de cada nueva asignación de ingeniero a lote sumando uno al mayor ID existente (o usa 1 si no hay asignaciones), con reintentos ante inserciones simultáneas. Los roles iniciales conservan los IDs 1, 2 y 3. Los registros existentes no se renumeran.

La API recibe y devuelve `_id`, la clave de MongoDB. Por ejemplo, `GET /productores/1` devuelve `{"_id":1,"nombre":"Gallo"}`. Las rutas conservan el parámetro `:id` numérico; los campos relacionados siguen llamándose `productorId`, `tipoCultivoId`, `loteId` y `tecnicoId`.

Los campos `productorId`, `tipoCultivoId`, `loteId` y `tecnicoId` guardan referencias numéricas al `_id` del recurso correspondiente. Los controladores comprueban la existencia de esos recursos antes de guardar y sus dependencias antes de eliminar.

### Campos de la API y datos de ejemplo

| Recurso | Campos |
| --- | --- |
| Productor | _id, nombre, usuarioId; el alta recibe usuario (correo), password, cuentaId |
| Lote | _id, hectareas, tipoCultivoId, productorId, ubicacion |
| Técnico | _id, nombre, usuarioId; el alta recibe usuario (correo), password, cuentaId |
| Tipo de cultivo | _id, nombre |
| Observación | _id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta, estado |

La carga inicial incluye:

- Tres productores: 1 = Gallo, 2 = El Colibrí y 3 = Los Choclos Hermanos.
- Tres lotes: 1 = Córdoba, 250 hectáreas; 2 = Rosario, 100 hectáreas; 3 = Santa Fe, 50 hectáreas. Cada uno referencia al productor y tipo de cultivo con su mismo número de ID.
- Doce técnicos con IDs del 1 al 12 en `data/tecnicos.json`. Los técnicos relacionados con las observaciones actuales son 1 = Pedro González y 2 = Mónica López.
- Cultivos iniciales: 1 = Arroz, 2 = Soja y 3 = Maíz.
- Seis observaciones con IDs del 1 al 6, fechadas entre el 10 y el 16 de septiembre de 2026. Cada lote tiene dos observaciones.

Las solicitudes de creación modifican MongoDB. Los ejemplos usan IDs libres respecto de la carga inicial: 4 para productor y lote, 13 para técnico y 7 para observación. Si esos IDs ya existen, elegir otros y adaptar las solicitudes siguientes.

El cultivo del lote y el cultivo registrado en una observación usan IDs. Una observación conserva el cultivo registrado en esa fecha aunque el lote se actualice después.

## Reglas y validaciones

<!-- Notas - Andrea | Inicio | Integridad de relaciones y conservación del historial -->
- Cada lote referencia un cultivo existente. El productor es opcional: puede omitirse o ser `null`; si se indica, debe existir.
- Cada observación pertenece a un lote existente y referencia un técnico y un tipo de cultivo existentes.
- Antes de crear o actualizar un lote, el controlador comprueba su cultivo y el productor si está asignado. Antes de crear una observación, comprueba su lote, técnico y cultivo. Una referencia inexistente se rechaza con `400` antes de guardar.
- Al registrar una observación, el cultivo debe coincidir con el actual del lote. Actualizar el lote después no cambia el cultivo de sus observaciones históricas.
- El técnico debe tener una cuenta Ingeniero activa y una asignación vigente al lote. Estas comprobaciones validan relaciones; no autentican al emisor de la solicitud.
- La fecha es opcional en POST: si se omite se genera la actual; si se envía, debe ser una fecha real con formato YYYY-MM-DD. Un valor `null`, vacío o inválido se rechaza. MongoDB valida tipo y formato; Mongoose valida la fecha de calendario.
- Los únicos niveles de alerta admitidos son `Normal`, `Atención` y `Crítico`, respetando mayúsculas y tildes. `config/nivelesAlerta.js` define una única lista con `Object.freeze()`, utilizada por la validación de entrada y por el `enum` de Mongoose.
- La API conserva las observaciones como historial: permite crearlas y consultarlas; PUT, PATCH y DELETE de observaciones no tienen rutas y responden `404`. No existe borrado lógico. La protección del historial corresponde a estas rutas y a las comprobaciones de los controladores.
- No se puede eliminar un productor con lotes asociados.
- No se puede eliminar un técnico con observaciones o lotes asignados.
- No se puede eliminar un lote con observaciones o asignaciones de ingenieros, ni un tipo de cultivo utilizado por lotes u observaciones.
- Los DELETE anteriores responden `400` cuando encuentran dependencias; la operación rechazada conserva el registro y sus datos relacionados. Un registro sin dependencias puede eliminarse con `200`; si no existe, se responde `404`.
<!-- Notas - Andrea | Fin | Integridad de relaciones y conservación del historial -->
<!-- Notas - Andrea | Inicio | Reglas de validación de entrada y responsabilidades -->
- El cliente envía el `_id` al crear un recurso; no se genera automáticamente. Debe ser un número entero positivo seguro (`Number.isSafeInteger`) y no repetirse en ese recurso. Los identificadores relacionados también deben ser enteros positivos seguros. PUT permite repetir el `_id` actual, pero rechaza cambiarlo.
- Las hectáreas deben ser numéricas y finitas; el modelo y MongoDB exigen un mínimo de `0.000001`. Nombre, ubicación, estado del cultivo y texto de observaciones deben ser textos no vacíos, según el recurso.
- PUT de lote requiere al menos uno de estos campos: `hectareas`, `tipoCultivoId`, `productorId` o `ubicacion`. Conserva los campos omitidos y permite `productorId: null` para desasignar al cliente. PUT de productor y de técnico requieren `nombre`.
- Los campos numéricos del cuerpo JSON deben ser números; no se convierten textos como `"1"`. Los IDs de las rutas y el filtro `tecnicoId` conservan la conversión mediante `Number()` y luego se comprueba que sean enteros positivos seguros.
- Solo se guardan los campos definidos para cada recurso. El antiguo `tecnicoId` en lotes se rechaza: las asignaciones se administran mediante la colección intermedia.
- Las validaciones de entrada se realizan en `middleware/validaciones/`; las comprobaciones de existencia, duplicados y relaciones siguen en los controladores. Mongoose conserva las validaciones de sus esquemas. Se mantienen `express.json()`, el logger propio y los middleware de ruta inexistente (404) y manejo global de errores.
<!-- Notas - Andrea | Fin | Reglas de validación de entrada y responsabilidades -->

<!-- Notas - Andrea | Inicio | Campos obligatorios por operación -->
Todos los campos de la siguiente tabla son obligatorios al crear el recurso:

| Recurso | Campos obligatorios en POST | Campos de PUT |
| --- | --- | --- |
| Productor | `_id`, `nombre`, `usuario`, `password`, `cuentaId` | `nombre` obligatorio. |
| Técnico | `_id`, `nombre`, `usuario`, `password`, `cuentaId` | `nombre` obligatorio. |
| Lote | `_id`, `hectareas`, `tipoCultivoId`, `ubicacion` | Al menos uno de los cuatro campos distintos de `_id`; los omitidos se conservan. |
| Observación | `_id`, `loteId`, `tecnicoId`, `tipoCultivoId`, `estadoCultivo`, `observaciones`, `nivelAlerta` | Sin ruta de actualización. |

La validación comprueba el tipo y el valor de cada campo. Un ID numérico no admite fracciones, cero, negativos ni valores fuera del rango de enteros seguros; un texto obligatorio no admite `null`, números ni cadenas vacías o formadas solo por espacios. Las solicitudes inválidas se rechazan antes de guardar.
<!-- Notas - Andrea | Fin | Campos obligatorios por operación -->

### Compatibilidad de la integración

Antes de incorporar esta rama a develop, actualizar los consumidores de la API y los ejemplos del equipo:

| Operación | Comportamiento acordado |
| --- | --- |
| POST /productores y /tecnicos | Requieren cuenta de acceso: usuario (correo), password, cuentaId, además de _id y nombre. Las solicitudes antiguas con solo ID y nombre responden 400. |
| POST y PUT /lotes | Admiten cliente existente o sin asignar. Omitir productorId en PUT conserva el anterior; null lo desasigna. |
| POST /observaciones | Admite fecha enviada válida o fecha actual si se omite. Exige cuenta Ingeniero activa, asignación al lote y cultivo coincidente. |
| PUT /tecnicos/:id/lotes/:loteId | Una nueva asignación requiere su _id manual en el cuerpo. |
| GET / | Redirige a /login. Los listados siguen disponibles en /web/lotes y /web/tecnicos. |

Se conservan los middleware de Andrea, la prioridad del 404 en las actualizaciones de recursos inexistentes, el logger y la protección del historial. Las pruebas preparan cuentas, roles y asignaciones; se mantienen los casos de fecha enviada y se agregan los de fecha omitida y cliente opcional. No se modifican los IDs ni los datos de las bases existentes.

El correo es único y se normaliza a minúsculas. El servidor asigna el rol según el recurso. Si falla el guardado de una ficha, se intenta retirar su nueva cuenta y relación de rol; esta compensación no es una transacción.

## Endpoints y tabla de pruebas manuales

Base: `http://localhost:3100`. En POST y PUT seleccionar Body JSON y el header `Content-Type: application/json`. P1, P2, T1, T2, L1, L2 y O1 corresponden a los ejemplos de abajo. Ejecutarlos con IDs libres.

| Método | Endpoint | Parámetros | Body | Respuesta esperada | Respuesta ante error |
| --- | --- | --- | --- | --- | --- |
| GET | /productores | Ninguno | No | 200, arreglo de productores | 500, error interno |
| GET | /productores/:id | ID de ruta, ej. 4 | No | 200, productor | 400 ID inválido; 404 inexistente |
| POST | /productores | Ninguno | P1 | 201, mensaje y productor | 400 datos inválidos, ID o correo duplicado |
| PUT | /productores/:id | ID de ruta | P2 | 200, mensaje y productor | 400 datos inválidos; 404 inexistente |
| DELETE | /productores/:id | ID de ruta | No | 200, mensaje | 400 si posee lotes; 404 inexistente |
| GET | /tecnicos | Ninguno | No | 200, arreglo de técnicos | 500, error interno |
| GET | /tecnicos/:id | ID de ruta, ej. 13 | No | 200, técnico | 400 ID inválido; 404 inexistente |
| POST | /tecnicos | Ninguno | T1 | 201, mensaje y técnico | 400 datos inválidos, ID o correo duplicado |
| PUT | /tecnicos/:id | ID de ruta | T2 | 200, mensaje y técnico | 400 datos inválidos; 404 inexistente |
| DELETE | /tecnicos/:id | ID de ruta | No | 200, mensaje | 400 si posee observaciones o asignaciones; 404 inexistente |
| GET | /lotes | alerta opcional | No | 200, arreglo de lotes | 400 alerta inválida |
| GET | /lotes/:id | ID de ruta | No | 200, lote | 400 ID inválido; 404 inexistente |
| POST | /lotes | Ninguno | L1 | 201, mensaje y lote | 400 datos, ID duplicado o relación inexistente |
| PUT | /lotes/:id | ID de ruta | L2 | 200, mensaje y lote | 400 datos o relación inválida; 404 inexistente |
| DELETE | /lotes/:id | ID de ruta | No | 200, mensaje | 400 si posee observaciones o asignaciones; 404 inexistente |
| GET | /lotes/:id/observaciones | ID del lote | No | 200, historial o [] | 400 ID inválido; 404 lote inexistente |
| GET | /observaciones | tecnicoId opcional | No | 200, arreglo de observaciones | 400 ID inválido; 404 técnico inexistente |
| GET | /observaciones/:id | ID de observación | No | 200, observación | 400 ID inválido; 404 inexistente |
| POST | /observaciones | Ninguno | O1 | 201, mensaje y observación | 400 campos, alerta, duplicado o relación inválida |
| GET | /tipos-cultivo | Ninguno | No | 200, catálogo | 500 error interno |
| POST | /tipos-cultivo | Ninguno | _id, nombre | 201, tipoCultivo | 400 datos o duplicado |
| PUT | /tipos-cultivo/:id | ID de ruta | nombre | 200, tipoCultivo | 400 datos; 404 inexistente |
| DELETE | /tipos-cultivo/:id | ID de ruta | No | 200, mensaje | 400 si está relacionado; 404 inexistente |
| PUT | /tecnicos/:id/lotes/:loteId | IDs de técnico y lote | No | 200, asignación | 400 IDs; 404 inexistente; 409 reintentar |
| DELETE | /tecnicos/:id/lotes/:loteId | IDs de técnico y lote | No | 200, desasignación | 400 IDs; 404 inexistente |
| GET | / | Ninguno | No | 302, redirección al login | 500, error interno |
| GET | /web/lotes | Ninguno | No | 200, HTML del listado Pug | 500, error interno |
| GET | /web/lotes/:id | ID del lote | No | 200, HTML del detalle Pug | 400 ID inválido; 404 lote inexistente |
| GET | /web/tecnicos | Ninguno | No | 200, HTML del listado Pug | 500, error interno |
| GET | /web/tecnicos/:id | ID del técnico | No | 200, HTML del detalle Pug | 400 ID inválido; 404 inexistente |

Los IDs inválidos también devuelven 400 en PUT y DELETE. Cualquier operación que consulte MongoDB puede devolver 500 ante un error interno.

### Manejo de errores

<!-- Notas - Andrea | Inicio | Estados HTTP de validaciones y reglas de negocio -->
| Estado | Cuándo se utiliza |
| --- | --- |
| `200` | Consultas, actualizaciones y eliminaciones exitosas. Un listado sin coincidencias devuelve `[]`. |
| `201` | Creación exitosa de un productor, técnico, lote u observación. |
| `401` | Credenciales incorrectas o cuenta inactiva al iniciar sesión. |
| `400` | Campos, tipos, valores, IDs o filtros inválidos; IDs duplicados; relaciones inexistentes al guardar; eliminaciones bloqueadas por dependencias. |
| `404` | Recurso consultado, actualizado o eliminado inexistente; técnico inexistente en el filtro `tecnicoId`; ruta no disponible, incluidas las modificaciones o eliminaciones de observaciones. |
| `500` | Fallo inesperado al consultar, guardar o eliminar. El mensaje público es `Error interno del servidor`. |

Una misma ausencia tiene distinto estado según la operación: consultar `/productores/999` responde `404` si no existe; intentar guardar un lote con `productorId: 999` responde `400`. En ambos casos el mensaje es `El productor no existe`. En PUT, la búsqueda del recurso precede a la validación del cuerpo, por lo que un registro inexistente conserva su respuesta `404`.
<!-- Notas - Andrea | Fin | Estados HTTP de validaciones y reglas de negocio -->

<!-- Notas - Andrea | Inicio | Errores de validación y reglas de negocio -->
Los middleware de validación responden con `400` y un mensaje específico cuando los parámetros, filtros o cuerpos son inválidos. Los controladores conservan las respuestas `400` o `404` correspondientes a duplicados, recursos inexistentes, relaciones y dependencias. Para las vistas `/web`, los errores de ID se renderizan con `error.pug`; la API responde JSON.
<!-- Notas - Andrea | Fin | Errores de validación y reglas de negocio -->

Después de las rutas, el middleware 404 responde JSON:

```json
{
  "mensaje": "Ruta no encontrada"
}
```

El middleware global conserva error.status cuando corresponde y trata ValidationError, CastError, código 11000 de duplicado y código 121 de validación MongoDB como 400. Registra el nombre del error en consola sin exponer detalles internos.

- JSON mal formado y validaciones del esquema: 400, Solicitud inválida.
- ID duplicado detectado por MongoDB: 400, Ya existe un registro con ese ID.
- Error inesperado de consulta: 500, Error interno del servidor.
- Para /web se renderiza error.pug con el mismo estado; para la API se responde JSON.

Las validaciones de negocio devuelven mensajes específicos con estados 400 o 404, según corresponda.

### Vistas Pug

Las plantillas reciben datos mediante `res.render()`. Los formularios de alta y edición envían JSON con fetch a la API. El menú Admin enlaza los ABM de lotes, clientes, ingenieros y tipos de cultivo; las asignaciones se administran desde las fichas de clientes e ingenieros.

| Método | URL | Función |
| --- | --- | --- |
| GET | /login | Formulario de ingreso. |
| POST | /auth/login | Valida credenciales y cuenta activa; devuelve el perfil en HTML. |
| GET | /auth/olvide-password | Instrucciones para contactar al administrador. |
| GET | /web/menu | Menú del perfil. |
| GET | /web/productores | Listado de clientes y sus lotes. |
| GET | /web/tipos-cultivo | Listado de cultivos. |
| GET | /web/{recurso}/nuevo | Formulario de alta. |
| GET | /web/{recurso}/:id/editar | Formulario de edición. |
| GET | /web/productores/:id/lotes | Asignaciones del cliente. |
| GET | /web/tecnicos/:id/lotes | Asignaciones del ingeniero. |
| GET | /web/ingenieros/:tecnicoId/lotes | Lotes del perfil Ingeniero. |
| GET | /web/ingenieros/:tecnicoId/lotes/:loteId/observaciones | Nueva observación. |
| GET | /web/ingenieros/:tecnicoId/lotes/:loteId/historial | Historial del ingeniero en ese lote. |

`{recurso}` corresponde a lotes, productores, tecnicos o tipos-cultivo. El login responde 400 ante formato inválido y 401 ante credenciales incorrectas o cuenta inactiva. No existen endpoints independientes de ABM de usuarios y roles: las altas de acceso se realizan mediante productores y técnicos.

### Ejemplos de solicitudes

P1 — POST `/productores`:

```json
{
  "_id": 4,
  "nombre": "Productor de demostración",
  "cuentaId": 2,
  "usuario": "cliente@ejemplo.com",
  "password": "ClaveDePrueba123456"
}
```

P2 — PUT `/productores/4`:

```json
{
  "nombre": "Productor actualizado"
}
```

T1 — POST `/tecnicos`:

```json
{
  "_id": 13,
  "nombre": "Técnico de demostración",
  "cuentaId": 3,
  "usuario": "ingeniero@ejemplo.com",
  "password": "ClaveDePrueba123456"
}
```

T2 — PUT `/tecnicos/13`:

```json
{
  "nombre": "Técnico actualizado"
}
```

L1 — POST `/lotes` (crear primero el productor 4):

```json
{
  "_id": 4,
  "hectareas": 120,
  "tipoCultivoId": 2,
  "productorId": 4,
  "ubicacion": "Córdoba"
}
```

L2 — PUT `/lotes/4`:

```json
{
  "hectareas": 150,
  "tipoCultivoId": 3,
  "productorId": 4,
  "ubicacion": "Santa Fe"
}
```

O1 — POST `/observaciones` (crear el técnico 13 con T1 y asignarlo al lote 1 mediante `PUT /tecnicos/13/lotes/1` sin body; usar el ID libre 7):

```json
{
  "_id": 7,
  "loteId": 1,
  "tecnicoId": 13,
  "tipoCultivoId": 1,
  "estadoCultivo": "Requiere revisión",
  "observaciones": "Se registra una situación que requiere atención del técnico",
  "nivelAlerta": "Crítico"
}
```

### Ejemplos de respuestas

Los valores de `usuarioId` corresponden a los `cuentaId` elegidos en las altas. La fecha de observación corresponde a la enviada o, si se omite, al día de registro.

POST `/productores`, estado 201:

```json
{
  "mensaje": "Productor creado",
  "productor": {
    "_id": 4,
    "nombre": "Productor de demostración",
    "usuarioId": 2
  }
}
```

POST `/tecnicos`, estado 201:

```json
{
  "mensaje": "Técnico creado",
  "tecnico": {
    "_id": 13,
    "nombre": "Técnico de demostración",
    "usuarioId": 3
  }
}
```

POST `/lotes`, estado 201:

```json
{
  "mensaje": "Lote creado",
  "lote": {
    "_id": 4,
    "hectareas": 120,
    "tipoCultivoId": 2,
    "productorId": 4,
    "ubicacion": "Córdoba"
  }
}
```

POST `/observaciones`, estado 201:

```json
{
  "mensaje": "Observación registrada",
  "observacion": {
    "_id": 7,
    "loteId": 1,
    "tecnicoId": 13,
    "fecha": "2026-10-18",
    "tipoCultivoId": 1,
    "estadoCultivo": "Requiere revisión",
    "observaciones": "Se registra una situación que requiere atención del técnico",
    "nivelAlerta": "Crítico",
    "estado": "Cargada"
  }
}
```

GET por ID devuelve el objeto sin el envoltorio `mensaje`. GET de listado y las consultas devuelven arreglos; si no hay coincidencias devuelven `[]`. PUT de productores, técnicos y lotes responde con `mensaje` y el objeto actualizado; tipos de cultivo devuelve `{ "tipoCultivo": ... }`. DELETE exitoso devuelve `{"mensaje":"Lote eliminado"}` , `{"mensaje":"Productor eliminado"}` o `{"mensaje":"Técnico eliminado"}`.

Ejemplos de error:

```json
{
  "mensaje": "El productor no existe"
}
```

404 al consultar un productor inexistente; 400 al referenciarlo en un lote.

```json
{
  "mensaje": "El nivel de alerta debe ser Normal, Atención o Crítico"
}
```

400 al crear una observación o filtrar lotes con una alerta inválida.

```json
{
  "mensaje": "No se puede eliminar el productor porque posee lotes asociados"
}
```

400 al intentar eliminar un productor con lotes.

Al intentar DELETE `/tecnicos/1`, estado 400:

```json
{
  "mensaje": "No se puede eliminar el técnico porque posee observaciones registradas"
}
```

## Tres consultas implementadas

1. GET `/lotes/1/observaciones`: devuelve todas las observaciones del lote 1. Primero comprueba que el lote exista.
2. GET `/lotes?alerta=Crítico`: devuelve cada lote que tenga al menos una observación histórica con esa alerta, sin repetir lotes. No representa necesariamente la alerta más reciente. También acepta Normal y Atención.
3. GET `/observaciones?tecnicoId=1`: devuelve las observaciones del técnico 1. Comprueba que el técnico exista.

Para los filtros usar la pestaña Params de Postman/ThunderClient; la herramienta codifica las tildes de la URL. Las consultas utilizan `req.query` y los detalles e historial utilizan `req.params`. El parámetro debe escribirse exactamente `tecnicoId`, con I mayúscula: `tecnicoid` no activa el filtro.

Con los datos incluidos, antes de agregar nuevas observaciones, el historial del lote 1 contiene las observaciones 1 y 4; el filtro por alerta `Crítico` devuelve el lote 3; y el filtro por técnico 1 devuelve las observaciones 1, 3 y 5. El lote 3 aparece en la consulta de alerta crítica aunque su observación posterior tenga nivel `Atención`, porque se consulta todo el historial.

## Integrantes y responsabilidades

- Integrante: [Grosman Ignacio] — Responsabilidad: [ Desarrollo y Gestión del repositorio en GitHub ]
- Integrante: [Fernández Sebastián] — Responsabilidad: [ Desarrollo ]
- Integrante: [Ferreira Urdaneta Glaucia Elena] — Responsabilidad: [ Desarrollo ]
- Integrante: [Maslucan Moreno Andrea Tamara] — Responsabilidad: [ Desarrollo ]

