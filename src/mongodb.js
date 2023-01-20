const mongoose = require('mongoose')

require('dotenv').config()

let conn;

mongoose.connect(process.env.MONGO_URL)

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', () => {
    console.log('connected');
});

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
    },
    is_admin: {
        type: Boolean,
        default: false
    },
    plans: {
        type: [{
            date: { type: Date, default: Date.now },
            planID: { type: String },
            amount: { type: String }
        }]
    }
})

const IncomeSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    directIncome: {
        type: String,
        required: true
    },
    levelIncome: {
        type: String,
        required: true
    }
})

const Users = new mongoose.model("Users", UserSchema)
const IncomeModel = new mongoose.model("Income", IncomeSchema)

module.exports = { Users, db, IncomeModel }