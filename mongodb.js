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
        type: Number,
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
    gender: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    usdtAdd: {
        type: String
    },
    tronAdd: {
        type: String
    },
    plans: {
        type: [{
            date: { type: Number, default: Date.now },
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

const TradeSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
    }
}, { strict: false })

const LevelSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
    }
}, { strict: false })

const DailyLevelSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
    }
}, { strict: false })

const DailySchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
    }
}, { strict: false })

const DirectSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
    }
}, { strict: false })

const DepositSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
    }
}, { strict: false })

const WithdrawSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
    }
}, { strict: false })

// Fund transer & deduct logs will be in it
const AdminFundSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
    }
}, { strict: false })

const sessionSchema = new mongoose.Schema({
    sessionID: {
        type: String,
        required: true
    },
    userID: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    ipAdd: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: Date.now
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

const mailSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    msg: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        required: true,
        default: Date.now
    },
    attachments: {
        type: [{
            attachID: { type: String }
        }]
    }
})

const Sessions = new mongoose.model("Sessions", sessionSchema)
const Users = new mongoose.model("Users", UserSchema)
const Incomes = new mongoose.model("Income", IncomeSchema)
const LastuID = new mongoose.model("uID", uIDSchema)

// Reports
const Trades = new mongoose.model("Trades", TradeSchema)
const DailyprofitLogs = new mongoose.model("DailyprofitLogs", DailySchema)
const DirectincomeLogs = new mongoose.model("DirectincomeLogs", DirectSchema)
const DailyLevelLogs = new mongoose.model("DailyLevelLogs", DailyLevelSchema)
const LevelLogs = new mongoose.model("LevelLogs", LevelSchema)

const DepositLogs = new mongoose.model("DepositLogs", DepositSchema)
const WithdrawLogs = new mongoose.model("WithdrawLogs", WithdrawSchema)

const AdminFundLogs = new mongoose.model("AdminFundLogs", AdminFundSchema)
const Mails = new mongoose.model("Mails", mailSchema)


module.exports = {
    Users,
    LastuID,
    db,
    Incomes,

    Trades,
    DailyprofitLogs,
    DirectincomeLogs,
    DailyLevelLogs,
    LevelLogs,
    DepositLogs,
    WithdrawLogs,

    AdminFundLogs,

    Mails,

    Sessions
}