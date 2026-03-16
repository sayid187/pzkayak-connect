const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pzkayak_secret_key_cambiar_en_produccion';

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token)
        return res.status(401).json({ mensaje: 'Token requerido' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ mensaje: 'Token inválido o expirado' });
    }
};

module.exports = { verificarToken };
