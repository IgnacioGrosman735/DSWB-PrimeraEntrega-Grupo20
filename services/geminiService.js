const { readFileSync } = require("node:fs");
const path = require("node:path");
const { GoogleGenAI } = require("@google/genai");

const instrucciones = readFileSync(
    path.join(__dirname, "..", "prompts", "asistenteAgroTec.txt"),
    "utf8"
);
const tiempoEsperaMs = 15_000;

async function consultarGemini(pregunta, contexto) {
    if (typeof pregunta !== "string" || !pregunta.trim()) {
        throw new TypeError("La pregunta debe contener texto");
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL?.trim();
    if (!apiKey || !model) {
        throw new Error("Configurá GEMINI_API_KEY y GEMINI_MODEL para consultar Gemini");
    }

    const cliente = new GoogleGenAI({ apiKey });
    const abortSignal = AbortSignal.timeout(tiempoEsperaMs);
    let respuesta;
    try {
        respuesta = await cliente.models.generateContent({
            model,
            contents: pregunta.trim(),
            config: {
                systemInstruction: contexto
                    ? `${instrucciones}\nContexto autorizado de la aplicación:\n${JSON.stringify(contexto)}`
                    : instrucciones,
                abortSignal
            }
        });
    } catch (error) {
        if (abortSignal.aborted) {
            throw Object.assign(new Error("Gemini superó el tiempo de espera"), {
                code: "GEMINI_TIMEOUT"
            });
        }
        throw error;
    }

    const texto = respuesta.text?.trim();
    if (!texto) {
        throw new Error("Gemini no devolvió una respuesta de texto");
    }
    return texto;
}

module.exports = { consultarGemini };
