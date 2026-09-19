class Tecnico {
    constructor(id, nombre) {
        this.id = id;
        this.nombre = nombre;
    }

    esValido() {
        return Number.isSafeInteger(this.id) && this.id > 0 &&
            typeof this.nombre === "string" && this.nombre.trim() !== "";
    }
}

module.exports = Tecnico;
