const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario, verificarSesion } = require('../controllers/userController');
const { verificarToken } = require('../middleware/authMiddleware');

router.post('/registro', registrarUsuario);
router.post('/login', loginUsuario);

// Ruta protegida — el frontend la usa al recargar para validar el token guardado
router.get('/verificar', verificarToken, verificarSesion);

module.exports = router;