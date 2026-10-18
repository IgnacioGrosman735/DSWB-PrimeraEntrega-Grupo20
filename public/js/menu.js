const panel = document.getElementById("menu-perfil");
const claveMenu = "agrotec.menuPresentacion";
try {
    const datos = panel.dataset.perfil;
    if (datos) sessionStorage.setItem(claveMenu, datos);
    const perfil = JSON.parse(datos || sessionStorage.getItem(claveMenu) || "null");
    if (
        perfil &&
        typeof perfil.nombre === "string" &&
        Array.isArray(perfil.roles) &&
        perfil.roles.every((rol) => typeof rol === "string")
    ) {
        document.getElementById("bienvenida").textContent = "Bienvenido, " + perfil.nombre;
        document.getElementById("roles-menu").textContent =
            "Roles: " + (perfil.roles.join(", ") || "Sin rol asignado");
        const admin = perfil.roles.includes("Admin");
        document.getElementById("opciones-admin").hidden = !admin;
        const aviso = document.getElementById("aviso-perfil");
        const ingeniero =
            perfil.roles.includes("Ingeniero") &&
            Number.isSafeInteger(perfil.tecnicoId) &&
            perfil.tecnicoId > 0;
        document.getElementById("opciones-ingeniero").hidden = !ingeniero;
        if (ingeniero)
            document.getElementById("mis-lotes").href =
                "/web/ingenieros/" + perfil.tecnicoId + "/lotes";
        aviso.hidden = admin || ingeniero;
        aviso.textContent = perfil.roles.includes("Ingeniero")
            ? "El administrador debe vincular tu cuenta a una ficha técnica para cargar observaciones."
            : "El perfil de clientes se incorporará en una próxima etapa.";
    }
} catch {
    console.warn("No se pudo recuperar la presentación del menú:", error);
}

document.getElementById("volver-login").addEventListener("click", () => {
    try {
        sessionStorage.removeItem(claveMenu);
    } catch (error) {
        console.warn("No se pudo borrar la presentación del menú:", error);
    }
});
