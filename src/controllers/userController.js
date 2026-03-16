const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'pzkayak_secret_key_cambiar_en_produccion';
const JWT_EXPIRES = '7d'; // Token válido 7 días — el frontend maneja el timeout de inactividad

// ── REGISTRO ──────────────────────────────────────────────────────────────────
const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password, contacto_emergencia, idioma } = req.body;

        if (!nombre || !email || !password)
            return res.status(400).json({ mensaje: 'Nombre, correo y contraseña son obligatorios' });

        const existe = await User.findOne({ where: { email } });
        if (existe)
            return res.status(409).json({ mensaje: 'Este correo ya está registrado' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const nuevoUsuario = await User.create({
            nombre, email,
            password: hashedPassword,
            contacto_emergencia,
            idioma: idioma || 'es'
        });

        const usuarioSeguro = nuevoUsuario.toJSON();
        delete usuarioSeguro.password;

        // Generar token al registrarse — entra directo a la app
        const token = jwt.sign(
            { id: usuarioSeguro.id, email: usuarioSeguro.email, nombre: usuarioSeguro.nombre },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        res.status(201).json({
            mensaje: 'Usuario creado exitosamente',
            token,
            usuario: usuarioSeguro
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ mensaje: 'Error al crear el usuario', error: error.message });
    }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios' });

        const usuario = await User.findOne({ where: { email } });
        if (!usuario)
            return res.status(404).json({ mensaje: 'Correo no registrado' });

        const contraseñaValida = await bcrypt.compare(password, usuario.password);
        if (!contraseñaValida)
            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });

        const usuarioSeguro = usuario.toJSON();
        delete usuarioSeguro.password;

        const token = jwt.sign(
            { id: usuarioSeguro.id, email: usuarioSeguro.email, nombre: usuarioSeguro.nombre },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: usuarioSeguro
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ mensaje: 'Error al iniciar sesión', error: error.message });
    }
};

// ── VERIFICAR TOKEN (ruta protegida de prueba) ────────────────────────────────
const verificarSesion = async (req, res) => {
    // req.usuario viene del middleware verificarToken
    res.status(200).json({ valido: true, usuario: req.usuario });
};

module.exports = { registrarUsuario, loginUsuario, verificarSesion };