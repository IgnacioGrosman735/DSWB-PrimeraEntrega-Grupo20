const formulario = document.querySelector("#formulario-asistente");
const botonConsultar = formulario.querySelector('button[type="submit"]');
const estadoAsistente = document.querySelector("#estado-asistente");
const errorAsistente = document.querySelector("#error-asistente");
const respuestaAsistente = document.querySelector("#respuesta-asistente");

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (botonConsultar.disabled) return;

    const datos = new URLSearchParams(new FormData(formulario));
    botonConsultar.disabled = true;
    estadoAsistente.textContent = "Consultando…";
    errorAsistente.textContent = "";
    respuestaAsistente.textContent = "";

    try {
        const resultado = await fetch(formulario.action, {
            method: "POST",
            credentials: "same-origin",
            body: datos
        });
        if (resultado.redirected || resultado.status === 401) {
            errorAsistente.textContent = "Volvé a iniciar sesión para consultar a Agrobot.";
            return;
        }

        // El controlador también renderiza esta vista para los envíos sin JavaScript.
        const pagina = new DOMParser().parseFromString(await resultado.text(), "text/html");
        const selector = resultado.ok ? "#respuesta-asistente" : "#error-asistente";
        const texto = pagina.querySelector(selector)?.textContent;
        if (!texto?.trim()) {
            throw new Error("Respuesta inesperada del servidor");
        }

        const destino = resultado.ok ? respuestaAsistente : errorAsistente;
        destino.textContent = texto;
    } catch {
        errorAsistente.textContent = "No se pudo obtener la respuesta. Intentá de nuevo en unos instantes.";
    } finally {
        estadoAsistente.textContent = "";
        botonConsultar.disabled = false;
    }
});
