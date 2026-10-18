const ITERACIONES = 220000;

function passwordValida(password) {
    return typeof password === "string" && password.length >= 15 && password.length <= 128;
}

module.exports = { passwordValida, ITERACIONES };
