const express = require('express');
const router = express.Router();
// Importamos también la nueva función loginUsuario
const { registrarUsuario, loginUsuario } = require('../controllers/userController');

// Ruta para registro
router.post('/registro', registrarUsuario);

// --- NUEVA RUTA para login ---
router.post('/login', loginUsuario);

module.exports = router;