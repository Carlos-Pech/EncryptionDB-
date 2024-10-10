// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const User = require('./models/Usuarios');
const path = require('path');

const app = express();
const PORT = 3000;

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/ejemploCifrado2')
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('No se pudo conectar a MongoDB', err));

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Sirve archivos estáticos

// Función para cifrar datos
function encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted.toString('hex'),
        key: key.toString('hex'), // Guarda la clave para descifrar en producción
    };
}

// Ruta para crear un usuario
app.post('/api/users', async (req, res) => {
    const { name, creditCard } = req.body;

    // Cifrar la tarjeta de crédito
    const encryptedData = encrypt(creditCard);

    const user = new User({
        name,
        creditCard: JSON.stringify(encryptedData), // Guarda el objeto cifrado como JSON
    });

    try {
        await user.save();
        res.status(201).json({ message: 'Usuario creado exitosamente', user });
    } catch (error) {
        res.status(400).json({ error: 'Error al crear usuario', details: error });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
