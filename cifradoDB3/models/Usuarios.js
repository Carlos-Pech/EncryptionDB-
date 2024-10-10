// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    creditCard: {
        type: String,
        required: true,
    },
});

const Usuarios = mongoose.model('Usuarios', UserSchema);
module.exports = Usuarios;
