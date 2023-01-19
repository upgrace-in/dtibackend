const mongoose = require('mongoose')

require('dotenv').config()

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("Connected !!!");
    })
    .catch(() => {
        console.log("Failed to connect !!!");
    })

const UserSchema = new mongoose.Schema({
    uID: {
        type: Number,
        required: true
    },
    sponsorID: {
        type: String,
        minlength: 5,
        required: true
    },
    userID: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }
})

const Users = new mongoose.model("Users", UserSchema)

module.exports = { Users }