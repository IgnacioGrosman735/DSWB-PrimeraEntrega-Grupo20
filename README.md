# AgroTec — Monitoreo de lotes

AgroTec brinda servicios de monitoreo a productores agrícolas. Esta aplicación centraliza la información que antes se registraba en papel y planillas, y permite consultar el historial de observaciones de cada lote.

Actualmente administra productores, técnicos y lotes, registra observaciones y permite consultar el historial, los lotes por alerta y las observaciones por técnico.

## Estado actual del proyecto

| Recurso | Estado actual | Funcionalidad |
| --- | --- | --- |
| Productores | CRUD implementado | Administración mediante la API. |
| Lotes | CRUD e historial implementados | Administración mediante la API. |
| Técnicos | CRUD implementado | Administración mediante la API. |
| Observaciones | Registro y consulta implementados | Conservar el historial sin eliminación. |
| Tipos de cultivo | Catálogo fijo en MongoDB (`tiposCultivo`) | Se tienen los tipos de cultivo que abarca el negocio, sin CRUD público. |

El catálogo de tipos de cultivo se define como fijo. Actualmente incluye Arroz, Soja y Maíz. Se evaluará luego si hace falta la implementación de CRUD.

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

El importador valida los cinco JSON, sus identificadores y relaciones, e inserta 27 documentos. Cancela si alguna colección ya contiene datos y no sobrescribe información. Si falla durante la escritura, revisar si quedó una carga parcial antes de repetirlo.

Una vez realizada la carga inicial, iniciar el servidor:

```powershell
npm start
```

La aplicación queda disponible en [http://localhost:3100](http://localhost:3100), salvo que se configure otro puerto. Para reiniciarla, detener el proceso con `Ctrl+C` y volver a ejecutar `npm start`. La importación no se repite al iniciar; los datos se conservan en MongoDB.

El servidor espera la conexión a MongoDB antes de aceptar solicitudes. Si la conexión falla, muestra un mensaje en consola y termina con código de salida 1. Revisar que MongoDB esté activo y que `MONGODB_URI` sea correcta.

<!-- Notas - Andrea | Inicio | Comandos de ejecución y pruebas -->
| Comando | Acción |
| --- | --- |
| `npm install` | Instala las dependencias del proyecto. |
| `npm start` | Conecta a MongoDB e inicia Express. |
| `npm run dev` | Ejecuta `node --watch index.js` y reinicia ante cambios en el código. |
| `npm run importar` | Carga los datos de ejemplo en las cinco colecciones vacías. |
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
- `models/`: esquemas de productores, lotes, técnicos, tipos de cultivo y observaciones, con validaciones y referencias.
- `controllers/`: procesamiento de solicitudes, reglas de negocio, consultas a MongoDB y renderizado de vistas.
- `routes/`: rutas de productores, técnicos, lotes, observaciones y vistas.
- `middleware/logger.js`: registro de fecha, método y URL de las solicitudes.
- `middleware/validaciones/comunes.js`: funciones compartidas para validar IDs, textos, hectáreas, fechas y niveles de alerta.
- `middleware/validaciones/parametros.js`: validación de IDs recibidos en las rutas de la API y de las vistas, y de los filtros `alerta` y `tecnicoId`.
- `middleware/validaciones/productores.js` y `tecnicos.js`: validación de los cuerpos de creación y actualización de cada recurso.
- `middleware/validaciones/lotes.js`: validación de los cuerpos de creación y actualización parcial.
- `middleware/validaciones/observaciones.js`: validación del cuerpo de creación.
- `views/`: plantillas Pug para listados y detalles de lotes y técnicos, y página de error.
- `data/`: archivos JSON con datos de ejemplo para importar.
- `scripts/`: carga inicial de datos de ejemplo.
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

La base utiliza las siguientes colecciones, con nombres correspondientes a los archivos de carga inicial:

| JSON original | Colección | Campos almacenados |
| --- | --- | --- |
| productores.json | productores | _id, nombre |
| lotes.json | lotes | _id, hectareas, tipoCultivoId, productorId, ubicacion |
| tecnicos.json | tecnicos | _id, nombre |
| tiposCultivo.json | tiposCultivo | _id, nombre |
| observaciones.json | observaciones | _id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta |

`_id` es un entero positivo seguro y el único identificador almacenado en cada documento. Su índice garantiza la unicidad dentro de la colección. Durante la importación, el campo `id` de los JSON se guarda como `_id`.

La API recibe y devuelve `_id`, la clave de MongoDB. Por ejemplo, `GET /productores/1` devuelve `{"_id":1,"nombre":"Gallo"}`. Las rutas conservan el parámetro `:id` numérico; los campos relacionados siguen llamándose `productorId`, `tipoCultivoId`, `loteId` y `tecnicoId`.

Los campos `productorId`, `tipoCultivoId`, `loteId` y `tecnicoId` guardan referencias numéricas al `_id` del recurso correspondiente. Los controladores comprueban la existencia de esos recursos antes de guardar y sus dependencias antes de eliminar.

### Campos de la API y datos de ejemplo

| Recurso | Campos |
| --- | --- |
| Productor | _id, nombre |
| Lote | _id, hectareas, tipoCultivoId, productorId, ubicacion |
| Técnico | _id, nombre |
| Tipo de cultivo | _id, nombre |
| Observación | _id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta |

La carga inicial incluye:

- Tres productores: 1 = Gallo, 2 = El Colibrí y 3 = Los Choclos Hermanos.
- Tres lotes: 1 = Córdoba, 250 hectáreas; 2 = Rosario, 100 hectáreas; 3 = Santa Fe, 50 hectáreas. Cada uno referencia al productor y tipo de cultivo con su mismo número de ID.
- Doce técnicos con IDs del 1 al 12 en `data/tecnicos.json`. Los técnicos relacionados con las observaciones actuales son 1 = Pedro González y 2 = Mónica López.
- Catálogo fijo de cultivos: 1 = Arroz, 2 = Soja y 3 = Maíz.
- Seis observaciones con IDs del 1 al 6, fechadas entre el 10 y el 16 de septiembre de 2026. Cada lote tiene dos observaciones.

Las solicitudes de creación modifican MongoDB. Los ejemplos usan IDs libres respecto de la carga inicial: 4 para productor y lote, 13 para técnico y 7 para observación. Si esos IDs ya existen, elegir otros y adaptar las solicitudes siguientes.

El cultivo del lote y el cultivo registrado en una observación usan IDs. Una observación conserva el cultivo registrado en esa fecha aunque el lote se actualice después.

## Reglas y validaciones

- Cada lote pertenece a un productor existente y referencia un tipo de cultivo existente.
- Cada observación pertenece a un lote existente y referencia un técnico y un tipo de cultivo existentes.
- La fecha es obligatoria: texto con formato YYYY-MM-DD y una fecha de calendario válida.
- Los únicos niveles de alerta admitidos son `Normal`, `Atención` y `Crítico`, respetando mayúsculas y tildes.
- Las observaciones se conservan como historial. No existen endpoints PUT ni DELETE de observaciones, ni borrado lógico.
- No se puede eliminar un productor con lotes asociados.
- No se puede eliminar un técnico con observaciones registradas, para conservar las relaciones del historial.
- No se puede eliminar un lote con observaciones: así se preservan el historial y sus referencias.
<!-- Notas - Andrea | Inicio | Reglas de validación de entrada y responsabilidades -->
- El cliente envía el `_id` al crear un recurso; no se genera automáticamente. Debe ser un número entero positivo seguro (`Number.isSafeInteger`) y no repetirse en ese recurso. Los identificadores relacionados también deben ser enteros positivos seguros. PUT permite repetir el `_id` actual, pero rechaza cambiarlo.
- Las hectáreas deben ser numéricas, finitas y mayores a cero. Nombre, ubicación, estado del cultivo y texto de observaciones deben ser textos no vacíos, según el recurso.
- PUT de lote requiere al menos uno de estos campos: `hectareas`, `tipoCultivoId`, `productorId` o `ubicacion`. Conserva los campos omitidos y rechaza valores inválidos, incluido `null`. PUT de productor y de técnico requieren `nombre`.
- Los campos numéricos del cuerpo JSON deben ser números; no se convierten textos como `"1"`. Los IDs de las rutas y el filtro `tecnicoId` conservan la conversión mediante `Number()` y luego se comprueba que sean enteros positivos seguros.
- Los campos desconocidos del cuerpo se ignoran; solo se guardan los campos definidos para cada recurso.
- Las validaciones de entrada se realizan en `middleware/validaciones/`; las comprobaciones de existencia, duplicados y relaciones siguen en los controladores. Mongoose conserva las validaciones de sus esquemas. Se mantienen `express.json()`, el logger propio y los middleware de ruta inexistente (404) y manejo global de errores.
<!-- Notas - Andrea | Fin | Reglas de validación de entrada y responsabilidades -->

## Endpoints y tabla de pruebas manuales

Base: `http://localhost:3100`. En POST y PUT seleccionar Body JSON y el header `Content-Type: application/json`. P1, P2, T1, T2, L1, L2 y O1 corresponden a los ejemplos de abajo. Ejecutarlos con IDs libres.

| Método | Endpoint | Parámetros | Body | Respuesta esperada | Respuesta ante error |
| --- | --- | --- | --- | --- | --- |
| GET | /productores | Ninguno | No | 200, arreglo de productores | 500, error interno |
| GET | /productores/:id | ID de ruta, ej. 4 | No | 200, productor | 400 ID inválido; 404 inexistente |
| POST | /productores | Ninguno | P1 | 201, mensaje y productor | 400 datos inválidos o ID duplicado |
| PUT | /productores/:id | ID de ruta | P2 | 200, mensaje y productor | 400 datos inválidos; 404 inexistente |
| DELETE | /productores/:id | ID de ruta | No | 200, mensaje | 400 si posee lotes; 404 inexistente |
| GET | /tecnicos | Ninguno | No | 200, arreglo de técnicos | 500, error interno |
| GET | /tecnicos/:id | ID de ruta, ej. 13 | No | 200, técnico | 400 ID inválido; 404 inexistente |
| POST | /tecnicos | Ninguno | T1 | 201, mensaje y técnico | 400 datos inválidos o ID duplicado |
| PUT | /tecnicos/:id | ID de ruta | T2 | 200, mensaje y técnico | 400 datos inválidos; 404 inexistente |
| DELETE | /tecnicos/:id | ID de ruta | No | 200, mensaje | 400 si posee observaciones; 404 inexistente |
| GET | /lotes | alerta opcional | No | 200, arreglo de lotes | 400 alerta inválida |
| GET | /lotes/:id | ID de ruta | No | 200, lote | 400 ID inválido; 404 inexistente |
| POST | /lotes | Ninguno | L1 | 201, mensaje y lote | 400 datos, ID duplicado o relación inexistente |
| PUT | /lotes/:id | ID de ruta | L2 | 200, mensaje y lote | 400 datos o relación inválida; 404 inexistente |
| DELETE | /lotes/:id | ID de ruta | No | 200, mensaje | 400 si posee observaciones; 404 inexistente |
| GET | /lotes/:id/observaciones | ID del lote | No | 200, historial o [] | 400 ID inválido; 404 lote inexistente |
| GET | /observaciones | tecnicoId opcional | No | 200, arreglo de observaciones | 400 ID inválido; 404 técnico inexistente |
| GET | /observaciones/:id | ID de observación | No | 200, observación | 400 ID inválido; 404 inexistente |
| POST | /observaciones | Ninguno | O1 | 201, mensaje y observación | 400 campos, fecha, alerta, duplicado o relación inválida |
| GET | / | Ninguno | No | 302, redirección al listado web | 500, error interno |
| GET | /web/lotes | Ninguno | No | 200, HTML del listado Pug | 500, error interno |
| GET | /web/lotes/:id | ID del lote | No | 200, HTML del detalle Pug | 400 ID inválido; 404 lote inexistente |
| GET | /web/tecnicos | Ninguno | No | 200, HTML del listado Pug | 500, error interno |
| GET | /web/tecnicos/:id | ID del técnico | No | 200, HTML del detalle Pug | 400 ID inválido; 404 inexistente |

Los IDs inválidos también devuelven 400 en PUT y DELETE. Cualquier operación que consulte MongoDB puede devolver 500 ante un error interno.

### Manejo de errores

<!-- Notas - Andrea | Inicio | Errores de validación y reglas de negocio -->
Los middleware de validación responden con `400` y un mensaje específico cuando los parámetros, filtros o cuerpos son inválidos. Los controladores conservan las respuestas `400` o `404` correspondientes a duplicados, recursos inexistentes, relaciones y dependencias. Para las vistas `/web`, los errores de ID se renderizan con `error.pug`; la API responde JSON.
<!-- Notas - Andrea | Fin | Errores de validación y reglas de negocio -->

Después de las rutas, el middleware 404 responde JSON:

```json
{
  "mensaje": "Ruta no encontrada"
}
```

El middleware global conserva error.status cuando corresponde y trata ValidationError, CastError y código 11000 de duplicado como 400. Registra el nombre del error en consola sin exponer detalles internos.

- JSON mal formado y validaciones del esquema: 400, Solicitud inválida.
- ID duplicado detectado por MongoDB: 400, Ya existe un registro con ese ID.
- Error inesperado de consulta: 500, Error interno del servidor.
- Para /web se renderiza error.pug con el mismo estado; para la API se responde JSON.

Las validaciones de negocio devuelven mensajes específicos con estados 400 o 404, según corresponda.

### Vistas Pug

`GET /` redirige a `/web/lotes`. El listado muestra ID, ubicación y hectáreas de cada lote, con enlaces a `/web/lotes/:id`. El detalle muestra el nombre del productor y del cultivo, la ubicación y las hectáreas. También están disponibles `/web/tecnicos` y `/web/tecnicos/:id`: el listado muestra ID y nombre con enlaces al detalle; el detalle muestra el ID y el nombre del técnico. Las vistas reciben datos mediante `res.render()` y no contienen formularios de edición. Las altas, modificaciones y bajas se realizan mediante los endpoints JSON.

### Ejemplos de solicitudes

P1 — POST `/productores`:

```json
{
  "_id": 4,
  "nombre": "Productor de demostración"
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
  "nombre": "Técnico de demostración"
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

O1 — POST `/observaciones` (utiliza el lote inicial 1 y el ID libre 7):

```json
{
  "_id": 7,
  "loteId": 1,
  "tecnicoId": 1,
  "fecha": "2026-09-17",
  "tipoCultivoId": 1,
  "estadoCultivo": "Requiere revisión",
  "observaciones": "Se registra una situación que requiere atención del técnico",
  "nivelAlerta": "Crítico"
}
```

### Ejemplos de respuestas

POST `/productores`, estado 201:

```json
{
  "mensaje": "Productor creado",
  "productor": {
    "_id": 4,
    "nombre": "Productor de demostración"
  }
}
```

POST `/tecnicos`, estado 201:

```json
{
  "mensaje": "Técnico creado",
  "tecnico": {
    "_id": 13,
    "nombre": "Técnico de demostración"
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
    "tecnicoId": 1,
    "fecha": "2026-09-17",
    "tipoCultivoId": 1,
    "estadoCultivo": "Requiere revisión",
    "observaciones": "Se registra una situación que requiere atención del técnico",
    "nivelAlerta": "Crítico"
  }
}
```

GET por ID devuelve el objeto sin el envoltorio `mensaje`. GET de listado y las consultas devuelven arreglos; si no hay coincidencias devuelven `[]`. PUT responde con `mensaje` y el objeto actualizado. DELETE exitoso devuelve `{"mensaje":"Lote eliminado"}` , `{"mensaje":"Productor eliminado"}` o `{"mensaje":"Técnico eliminado"}`.

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
