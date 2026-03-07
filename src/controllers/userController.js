const User = require('../models/User');
const bcrypt = require('bcrypt');

// Función para registrar un nuevo usuario
const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password, contacto_emergencia, idioma } = req.body;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const nuevoUsuario = await User.create({
            nombre,
            email,
            password: hashedPassword,
            contacto_emergencia,
            idioma
        });

        const usuarioSeguro = nuevoUsuario.toJSON();
        delete usuarioSeguro.password;

        res.status(201).json({
            mensaje: 'Usuario creado exitosamente',
            usuario: usuarioSeguro
        });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ mensaje: 'Hubo un error al crear el usuario', error: error.message });
    }
};

// --- NUEVA FUNCIÓN: Inicio de Sesión ---
const loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Buscamos al usuario por su email
        const usuario = await User.findOne({ where: { email } });
        
        // Si no existe el correo, devolvemos error 404
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Correo no registrado' });
        }

        // 2. Comparamos la contraseña escrita con la encriptada en la base de datos
        const contraseñaValida = await bcrypt.compare(password, usuario.password);
        
        // Si no coincide, devolvemos error 401 (No autorizado)
        if (!contraseñaValida) {
            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
        }

        // 3. Si todo está correcto, le damos la bienvenida (ocultando su contraseña)
        const usuarioSeguro = usuario.toJSON();
        delete usuarioSeguro.password;

        res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: usuarioSeguro
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ mensaje: 'Hubo un error al iniciar sesión', error: error.message });
    }
};

// Asegúrate de exportar ambas funciones
module.exports = {
    registrarUsuario,
    loginUsuario
};