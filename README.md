# AgroTec — Monitoreo de lotes

AgroTec brinda servicios de monitoreo a productores agrícolas. Esta aplicación centraliza la información que antes se registraba en papel y planillas, y permite consultar el historial de observaciones de cada lote.

Actualmente administra productores, Técnicos  y lotes, registra observaciones y permite consultar el historial, los lotes por alerta y las observaciones por técnico.
## Estado actual y alcance previsto

| Recurso | Estado actual | Alcance previsto |
| --- | --- | --- |
| Productores | CRUD implementado | Administración mediante la API. |
| Lotes | CRUD e historial implementados | Administración mediante la API. |
| Técnicos | CRUD implementado | Administración mediante la API. |
| Observaciones | Registro y consulta implementados | Conservar el historial sin eliminación. |
| Tipos de cultivo | Catálogo fijo en `data/tiposCultivo.json` | Mantener los tipos de cultivo que abarca el negocio, sin CRUD público. |

El catálogo de tipos de cultivo se define como fijo. Actualmente incluye Arroz, Soja y Maíz.

## Tecnologías e instalación

JavaScript, Node.js (20 o superior), NPM, Express, CommonJS, fs, path, archivos JSON y Pug. No se utiliza una base de datos externa.

Desde la carpeta del proyecto:

```sh
npm install
npm start
```

Servidor: http://localhost:3100. El puerto está definido como `3100` en `index.js`.

| Comando | Acción |
| --- | --- |
| `npm install` | Instala Express y Pug, las dependencias declaradas en package.json. |
| `npm start` | Ejecuta `node index.js`. |
| `npm run dev` | Ejecuta `node --watch index.js` y reinicia ante cambios en el código. |

No hay un script `test` ni pruebas automatizadas. Las pruebas de la entrega se realizan con Postman o ThunderClient.

## Estructura

- `index.js`: configuración de Express, Pug, logger, rutas y errores básicos.
- `models/`: Productor, Tecnico y Lote utilizan `esValido()`; Observacion utiliza `esValida()` y el método estático `alertaValida()`.TipoCultivo tiene constructor y propiedades, sin métodos de validación propios.
- `controllers/`: productores, Tecnicos, lotes y observaciones; procesan requests, validan relaciones y leen/escriben JSON.
- `routes/`: rutas de productores, tecnicos, lotes, observaciones y vistas.
- `middleware/logger.js`: registra fecha/hora, método y URL, y llama a next(). No valida datos.
- `views/`: listado de lotes, detalle y error mediante Pug y res.render().
- `data/`: productores.json, lotes.json, tecnicos.json, tiposCultivo.json y observaciones.json.

Los controladores utilizan `fs.readFileSync()`, `JSON.parse()`, `fs.writeFileSync()` y `JSON.stringify()` para la persistencia. Los archivos JSON deben existir antes de iniciar las operaciones; no hay creación automática de archivos ni recuperación de datos.

## Recursos y datos iniciales

| Recurso | Campos |
| --- | --- |
| Productor | id, nombre |
| Lote | id, hectareas, tipoCultivoId, productorId, ubicacion |
| Técnico | id, nombre |
| Tipo de cultivo | id, nombre |
| Observación | id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta |

Los datos actualmente incluidos en los archivos JSON son:

- Tres productores: 1 = Gallo, 2 = El Colibrí y 3 = Los Choclos Hermanos.
- Tres lotes: 1 = Córdoba, 250 hectáreas; 2 = Rosario, 100 hectáreas; 3 = Santa Fe, 50 hectáreas. Cada uno referencia al productor y tipo de cultivo con su mismo número de ID.
- Dos técnicos: 1 = Juan Pérez y 2 = María García.
- Catálogo fijo de cultivos: 1 = Arroz, 2 = Soja y 3 = Maíz.
- Seis observaciones con IDs del 1 al 6, fechadas entre el 10 y el 16 de septiembre de 2026. Cada lote tiene dos observaciones.

Las pruebas de creación modifican los archivos JSON. Los ejemplos usan IDs libres respecto de esta carga inicial: 4 para productor y lote, y 7 para observación. Si ya se ejecutaron, elegir otros IDs libres y adaptar las solicitudes siguientes.

El cultivo del lote y el cultivo registrado en una observación usan IDs. Una observación conserva el cultivo registrado en esa fecha aunque el lote se actualice después.

## Reglas y validaciones

- Cada lote pertenece a un productor existente y referencia un tipo de cultivo existente.
- Cada observación pertenece a un lote existente y referencia un técnico y un tipo de cultivo existentes.
- La fecha es obligatoria: texto con formato YYYY-MM-DD y una fecha de calendario válida.
- Los únicos niveles de alerta admitidos son `Normal`, `Atención` y `Crítico`, respetando mayúsculas y tildes.
- Las observaciones se conservan como historial. No existen endpoints PUT ni DELETE de observaciones, ni borrado lógico.
- No se puede eliminar un productor con lotes asociados.
- No se puede eliminar un lote con observaciones: así se preservan el historial y sus referencias.
- El cliente envía el `id` al crear un recurso; no se genera automáticamente. Debe ser un número entero positivo seguro (`Number.isSafeInteger`) y no repetirse en ese recurso. Los identificadores relacionados también deben ser enteros positivos seguros. No se modifican los IDs del recurso mediante PUT.
- Las hectáreas deben ser numéricas, finitas y mayores a cero. Nombre, ubicación, estado del cultivo y texto de observaciones deben ser textos no vacíos, según el recurso.
- PUT de lote requiere al menos uno de estos campos: `hectareas`, `tipoCultivoId`, `productorId` o `ubicacion`. Conserva los campos omitidos y rechaza valores inválidos, incluido `null`. PUT de productor requiere `nombre`.
- Las validaciones se realizan en models/controllers. Se utilizan express.json(), el logger y los middleware de ruta inexistente (404) y manejo global de errores. No hay middleware de validación de negocio por ahora.

## Endpoints y tabla de pruebas manuales

Base: `http://localhost:3100`. En POST y PUT seleccionar Body JSON y el header `Content-Type: application/json`. P1, P2, L1, L2 y O1 corresponden a los ejemplos de abajo. Ejecutarlos con IDs libres.

| Método | Endpoint | Parámetros | Body | Respuesta esperada | Respuesta ante error |
| --- | --- | --- | --- | --- | --- |
| GET | /productores | Ninguno | No | 200, arreglo de productores | 500, error interno |
| GET | /productores/:id | ID de ruta, ej. 4 | No | 200, productor | 400 ID inválido; 404 inexistente |
| POST | /productores | Ninguno | P1 | 201, mensaje y productor | 400 datos inválidos o ID duplicado |
| PUT | /productores/:id | ID de ruta | P2 | 200, mensaje y productor | 400 datos inválidos; 404 inexistente |
| DELETE | /productores/:id | ID de ruta | No | 200, mensaje | 400 si posee lotes; 404 inexistente |
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

Los IDs inválidos también devuelven 400 en PUT y DELETE. Cualquier operación que acceda a archivos puede devolver 500 ante un error interno.

### Manejo de errores

Las validaciones de negocio responden directamente desde los controllers con 400 o 404 y un mensaje específico. No pasan por un middleware de validación por ahora.

Después de las rutas, el middleware 404 responde JSON:

```json
{
  "mensaje": "Ruta no encontrada"
}
```

El middleware global utiliza `error.status || 500`. Registra `error.message` en la consola y responde con un mensaje genérico, sin exponer detalles internos:

- Un body JSON mal formado devuelve 400 con `{"mensaje":"Solicitud inválida"}`.
- Un error inesperado, como un archivo inexistente o JSON inválido en el almacenamiento, devuelve 500 con `{"mensaje":"Error interno del servidor"}`.
- Si el error incluye otro estado HTTP, se conserva ese estado: el mensaje es `Solicitud inválida` para estados menores a 500 y `Error interno del servidor` para estados desde 500.
- Para solicitudes cuya URL comienza con `/web/lotes`, el middleware global renderiza `error.pug` con el mismo estado y mensaje. Para la API responde JSON.

Los archivos no se reparan ni reemplazan automáticamente.

### Vistas Pug

`GET /` redirige a `/web/lotes`. El listado muestra ID, ubicación y hectáreas de cada lote, con enlaces a `/web/lotes/:id`. El detalle muestra el nombre del productor y del cultivo, la ubicación y las hectáreas. Las vistas reciben datos mediante `res.render()` y no contienen formularios de edición.

### Ejemplos de solicitudes

P1 — POST `/productores`:

```json
{
  "id": 4,
  "nombre": "Productor de demostración"
}
```

P2 — PUT `/productores/4`:

```json
{
  "nombre": "Productor actualizado"
}
```

L1 — POST `/lotes` (crear primero el productor 4):

```json
{
  "id": 4,
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
  "id": 7,
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
    "id": 4,
    "nombre": "Productor de demostración"
  }
}
```

POST `/lotes`, estado 201:

```json
{
  "mensaje": "Lote creado",
  "lote": {
    "id": 4,
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
    "id": 7,
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

GET por ID devuelve el objeto sin el envoltorio `mensaje`. GET de listado y las consultas devuelven arreglos; si no hay coincidencias devuelven `[]`. PUT responde con `mensaje` y el objeto actualizado. DELETE exitoso devuelve `{"mensaje":"Lote eliminado"}` o `{"mensaje":"Productor eliminado"}`.

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

## Tres consultas implementadas

1. GET `/lotes/1/observaciones`: devuelve todas las observaciones del lote 1. Primero comprueba que el lote exista.
2. GET `/lotes?alerta=Crítico`: devuelve cada lote que tenga al menos una observación histórica con esa alerta, sin repetir lotes. No representa necesariamente la alerta más reciente. También acepta Normal y Atención.
3. GET `/observaciones?tecnicoId=1`: devuelve las observaciones del técnico 1. Comprueba que el técnico exista.

Para los filtros usar la pestaña Params de Postman/ThunderClient; la herramienta codifica las tildes de la URL. Las consultas utilizan req.query y los detalles e historial utilizan req.params.

Con los datos incluidos, antes de agregar nuevas observaciones, el historial del lote 1 contiene las observaciones 1 y 4; el filtro por alerta `Crítico` devuelve el lote 3; y el filtro por técnico 1 devuelve las observaciones 1, 3 y 5. El lote 3 aparece en la consulta de alerta crítica aunque su observación posterior tenga nivel `Atención`, porque se consulta todo el historial.

## Integrantes y responsabilidades

- Integrante: [Grosman Ignacio] — Responsabilidad: [ Desarrollo y Gestión del repositorio en GitHub ]
- Integrante: [Fernández Sebastián] — Responsabilidad: [ Desarrollo ]
- Integrante: [Ferreira Urdaneta Glaucia Elena] — Responsabilidad: [ Desarrollo ]
- Integrante: [Maslucan Moreno Andrea Tamara] — Responsabilidad: [ Desarrollo ]
