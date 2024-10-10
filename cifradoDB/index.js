// Importación de módulos necesarios
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Inicialización de la aplicación Express
const app = express();

// Configuración del middleware
app.use(bodyParser.urlencoded({ extended: true })); // Procesar datos del formulario
app.use(express.static('public')); // Servir archivos estáticos

// Configuración de la base de datos y cifrado
const algoritmo = 'aes-256-cbc';
const clave = crypto.createHash('sha256').update(process.env.CLAVE_SECRETA).digest(); // Clave de 32 bytes
const iv = crypto.randomBytes(16); // Vector de inicialización aleatorio

// Funciones de cifrado y descifrado
function cifrar(texto) {
    const cifrador = crypto.createCipheriv(algoritmo, clave, iv);
    let cifrado = cifrador.update(texto, 'utf8', 'hex');
    cifrado += cifrador.final('hex');
    return iv.toString('hex') + ':' + cifrado;
}

function descifrar(textoCifrado) {
    const partes = textoCifrado.split(':');
    const ivBuffer = Buffer.from(partes[0], 'hex');
    const cifrado = partes[1];
    const descifrador = crypto.createDecipheriv(algoritmo, clave, ivBuffer);
    let descifrado = descifrador.update(cifrado, 'hex', 'utf8');
    descifrado += descifrador.final('utf8');
    return descifrado;
}

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/ejemploCifrado')
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error de conexión:', err));

// Definición del esquema de usuario
const usuarioSchema = new mongoose.Schema({
    nombre: String,
    correo: String,
    contrasena: String, // Campo cifrado
});

// Middleware para cifrar la contraseña antes de guardar
usuarioSchema.pre('save', function(next) {
    if (this.isModified('contrasena')) {
        this.contrasena = cifrar(this.contrasena);
    }
    next();
});

// Método para descifrar la contraseña
usuarioSchema.methods.getContrasena = function() {
    return descifrar(this.contrasena);
};

const Usuario = mongoose.model('Usuario', usuarioSchema); // Modelo de usuario

// Rutas de la aplicación
// Ruta para el formulario
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

// Ruta para manejar el envío del formulario
app.post('/agregar-usuario', async (req, res) => {
    const { nombre, correo, contrasena } = req.body;

    // Crear un nuevo usuario y guardarlo en la base de datos
    const nuevoUsuario = new Usuario({ nombre, correo, contrasena });
    await nuevoUsuario.save();

    // Buscar el usuario y mostrar la contraseña descifrada
    const usuario = await Usuario.findOne({ correo });

    // Ruta al archivo result.html
    const filePath = path.join(__dirname, 'views', 'result.html');

    // Leer el archivo result.html
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error al leer el archivo HTML.');
        }

        // Reemplazar los marcadores de posición con los datos del usuario
        const resultHTML = data
            .replace('${usuario.nombre}', usuario.nombre)
            .replace('${usuario.correo}', usuario.correo)
            .replace('${usuario.getContrasena()}', usuario.contrasena)
        // Enviar el HTML modificado como respuesta
        res.send(resultHTML);
    });
});

// Iniciar el servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
