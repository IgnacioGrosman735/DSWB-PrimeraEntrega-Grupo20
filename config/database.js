const mongoose = require("mongoose");

mongoose.connection.on("error", () => console.error("Error de conexión con MongoDB"));

const conectarDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/agrotec");
};

module.exports = conectarDB;
