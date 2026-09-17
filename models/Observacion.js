class Observacion {
    constructor(id, loteId, tecnicoId, fecha, tipoCultivoId, estadoCultivo, observaciones, nivelAlerta) {
        this.id = id;
        this.loteId = loteId;
        this.tecnicoId = tecnicoId;
        this.fecha = fecha;
        this.tipoCultivoId = tipoCultivoId;
        this.estadoCultivo = estadoCultivo;
        this.observaciones = observaciones;
        this.nivelAlerta = nivelAlerta;
    }

    static alertaValida(nivel) {
        return ["Normal", "Atención", "Crítico"].includes(nivel);
    }

    esValida() {
        if (typeof this.fecha !== "string") {
            return false;
        }

        const fecha = new Date(this.fecha);

        return (
            Number.isSafeInteger(this.id) && this.id > 0 &&
            Number.isSafeInteger(this.loteId) && this.loteId > 0 &&
            Number.isSafeInteger(this.tecnicoId) && this.tecnicoId > 0 &&
            Number.isSafeInteger(this.tipoCultivoId) && this.tipoCultivoId > 0 &&
            /^\d{4}-\d{2}-\d{2}$/.test(this.fecha) &&
            !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === this.fecha &&
            typeof this.estadoCultivo === "string" && this.estadoCultivo.trim() !== "" &&
            typeof this.observaciones === "string" && this.observaciones.trim() !== "" &&
            Observacion.alertaValida(this.nivelAlerta)
        );
    }
}

module.exports = Observacion;
