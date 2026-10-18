// Pug dibuja el formulario. Fetch envía JSON a los controladores existentes.
const mensaje = document.getElementById("mensaje");
async function enviar(url, metodo, datos) {
    const respuesta = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: datos === undefined ? undefined : JSON.stringify(datos)
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo realizar la operación");
}
const formulario = document.getElementById("formulario-abm");
const correoAcceso = formulario?.querySelector('#usuario');
const claveAcceso = formulario?.querySelector('#password');
if (correoAcceso && claveAcceso && formulario.dataset.metodo === "PUT") {
    const validarAcceso = () => {
        const campos = [correoAcceso, claveAcceso, formulario.querySelector('#cuentaId')];
        const crearCuenta = campos.some(campo => campo.value !== "");
        campos.forEach(campo => { campo.required = crearCuenta; });
    };
    correoAcceso.addEventListener("input", validarAcceso);
    claveAcceso.addEventListener("input", validarAcceso);
    formulario.querySelector('#cuentaId').addEventListener("input", validarAcceso);
}
document.querySelectorAll("[data-no-espacios]").forEach(campo => {
    campo.addEventListener("input", () => {
        campo.setCustomValidity(campo.value.trim() ? "" : "Escribí una observación, no solo espacios.");
    });
});
document.querySelectorAll("[data-asignar]").forEach(boton => {
    boton.addEventListener("click", async () => {
        const persona = boton.dataset.persona === "" ? null : Number(boton.dataset.persona);
        if (persona === null && !window.confirm("¿Quitar esta asignación? El lote se conservará.")) return;
        boton.disabled = true;
        try {
            const datos = boton.dataset.campo ? { [boton.dataset.campo]: persona } : undefined;
            await enviar(boton.dataset.asignar, boton.dataset.metodo || "PUT", datos);
            window.location.reload();
        } catch (error) {
            mensaje.textContent = error.message;
            boton.disabled = false;
        }
    });
});
if (formulario) formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    mensaje.textContent = "Guardando…";
    try {
        const datos = Object.fromEntries(new FormData(formulario));
        for (const campo of ["cuentaId"]) {
            if (datos[campo] === "") delete datos[campo];
        }
        for (const campo of ["_id", "cuentaId", "loteId", "hectareas", "productorId", "tipoCultivoId", "tecnicoId", "usuarioId"]) {
            if (campo in datos) datos[campo] = datos[campo] === "" && ["productorId", "tecnicoId", "usuarioId"].includes(campo) ? null : Number(datos[campo]);
        }
        await enviar(formulario.dataset.api, formulario.dataset.metodo, datos);
        window.location.assign(formulario.dataset.destino);
    } catch (error) {
        mensaje.textContent = error.message;
        boton.disabled = false;
    }
});
document.querySelectorAll("[data-eliminar]").forEach(boton => {
    boton.addEventListener("click", async () => {
        if (!window.confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return;
        boton.disabled = true;
        try {
            await enviar(boton.dataset.eliminar, "DELETE");
            window.location.reload();
        } catch (error) {
            mensaje.textContent = error.message;
            boton.disabled = false;
        }
    });
});
