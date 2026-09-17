class Lote {
    constructor(id, hectareas, tipoCultivoId, productorId, ubicacion) {
        this.id = id;
        this.hectareas = hectareas;
        this.tipoCultivoId = tipoCultivoId;
        this.productorId = productorId;
        this.ubicacion = ubicacion;
    }

    esValido() {
        return (
            Number.isSafeInteger(this.id) && this.id > 0 &&
            Number.isSafeInteger(this.tipoCultivoId) && this.tipoCultivoId > 0 &&
            Number.isSafeInteger(this.productorId) && this.productorId > 0 &&
            typeof this.ubicacion === "string" && this.ubicacion.trim() !== "" &&
            typeof this.hectareas === "number" && Number.isFinite(this.hectareas) && this.hectareas > 0
        );
    }
}

module.exports = Lote;
