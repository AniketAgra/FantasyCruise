const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;


const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },   //unique -- helps when database contains a large number of users.This will just create an index for the email,which speeds up the quering process
    password: { type: String, required: true, minlength: 6 },
    image: { type: String, required: true },
    places: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Place'}]   //  --> [ ] , since there can be multiple places for a single user
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);