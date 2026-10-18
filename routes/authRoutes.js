const express = require("express");
const { mostrarLogin, iniciarSesion } = require("../controllers/authController");
const { validarLogin } = require("../middleware/auth");
const router = express.Router();

router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/login", mostrarLogin);
router.post("/auth/login", validarLogin, iniciarSesion);
router.get("/auth/olvide-password", (_req, res) => res.render("olvide-password"));

module.exports = router;
