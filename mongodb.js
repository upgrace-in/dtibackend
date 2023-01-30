const mongoose = require('mongoose')

require('dotenv').config()

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
    doj: {
        type: Date,
        default: Date.now
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
    team: {
        type: String,
        default: 1
    },
    plans: {
        type: [{
            date: { type: Date, default: Date.now },
            planID: { type: String },
            amount: { type: String }
        }]
    },
    connections: {
        type: [{
            userID: { type: String }
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
        default: "0"
    },
    levelIncome: {
        type: String,
        default: "0"
    },
    dailyProfit: {
        type: String,
        default: "0"
    },
    dailyLevelIncome: {
        type: String,
        default: "0"
    },
    wallet: {
        type: String,
        default: "0"
    },
    topupwallet: {
        type: String,
        default: "0"
    }
})


const Logschema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    investedAMT: {
        type: String
    },
    doj: {
        type: Date,
        default: Date.now
    }
})


const sessionSchema = new mongoose.Schema({
    sessionID: {
        type: String,
        required: true
    },
    userID: {
        type: String,
        required: true
    },
    is_admin: {
        type: Boolean,
        default: false
    }
});

const uIDSchema = new mongoose.Schema({
    uID: {
        type: String,
        required: true,
        default: "100"
    },
    lastuID: {
        type: String,
        required: true,
        default: "100"
    }
});

const Sessions = new mongoose.model("Sessions", sessionSchema)
const Users = new mongoose.model("Users", UserSchema)
const Incomes = new mongoose.model("Income", IncomeSchema)
const Logs = new mongoose.model("Logs", Logschema)
const LastuID = new mongoose.model("uID", uIDSchema)

module.exports = { Users, LastuID, db, Incomes, Logs, Sessions }