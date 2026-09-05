class Lote {
    constructor(id, hectareas, cultivo, productor, ubicacion){
        this.id=id;
        this.hectareas=hectareas;
        this.cultivo=cultivo;
        this.productor=productor;
        this.ubicacion=ubicacion;
    }

    esValido() {
        return (
            typeof this.cultivo === "string" && this.cultivo.trim() !== "" &&
            typeof this.productor === "string" && this.productor.trim() !== "" &&
            typeof this.ubicacion === "string" && this.ubicacion.trim() !== "" &&
            Number(this.hectareas) > 0
        );
    }

    calcularCostoMensual(tarifaPorHectarea) {
        return this.hectareas * tarifaPorHectarea;
    }

}
module.exports=Lote;