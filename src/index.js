const express = require('express')
const app = express()
const { Users, db, IncomeModel } = require('./mongodb')
const cors = require('cors')
require('dotenv').config()
app.use(express.json())
app.use(cors())

const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session)

const MAX_AGE = 1000 * 60 * 60 * 24 // 1 day

// setting up connect-mongodb-session store
const mongoDBstore = new MongoDBStore({
    uri: process.env.MONGO_URL,
    collection: 'mySessions',
})

app.use(
    session({
        secret: 'a1s2d3f4g5h6',
        name: 'session-id',
        store: mongoDBstore,
        cookie: {
            maxAge: MAX_AGE,
            sameSite: false,
            secure: false, // to turn on just in production
        },
        resave: true,
        saveUninitialized: false,
    })
)

app.get('/isAuth', async (req, res) => {
    if (req.session.user) {
        return res.json(req.session.user)
    } else {
        return res.status(401).json('unauthorize')
    }
})

app.get('/plans', async (req, res) => {
    var collection = db.collection('plans');
    collection.find().toArray(function (err, plans) {
        if (!err)
            res.send({ msg: true, response: plans })
        else
            res.send({ msg: false })
    });
})

app.post("/register", async (req, res) => {
    try {
        const check = await Users.findOne({ userID: req.body.sponsorID })
        await Users.insertMany({ ...req.body, uID: parseFloat(check.uID) + 1 })
        res.json({ msg: true })
    } catch (e) {
        res.send({ msg: false, response: "Something went wrong !!!" })
    }
})

async function updateIncome(userID, dict) {
    const filter = { userID: userID };
    const updateDoc = {
        $set: dict
    }
    const options = { upsert: true }
    await IncomeModel.findOneAndUpdate(filter, updateDoc, options)
}

async function directIncome(upline, directIncomePercent, amt) {
    // directincome % -> calculate the % -> update to the upline
    const oldIncome = await IncomeModel.findOne({ userID: upline });

    // Calculating for the final directincome for the upline
    let income = (parseFloat(amt) * parseFloat(directIncomePercent)) / 100

    // If the upline already has some income add it to it
    if (oldIncome !== null)
        income = income + parseFloat(oldIncome.directIncome)

    // Down work is just to update 
    await updateIncome(upline, { directIncome: income })
}

async function levelIncome(user, levels, amt) {
    // Fetch the old income of the upline
    const oldIncome = await IncomeModel.findOne({ userID: user.sponsorID });

    let LevelPercent = levels.split(',')
    let currentUpline = user
    // Looping through the level percents
    for (var i = 0; i < LevelPercent.length; i++) {
        // Calculating income according to the levelpercents
        let income = (parseFloat(amt) * parseFloat(LevelPercent[i])) / 100

        if (oldIncome !== null)
            // Adding the old income to the new one
            income = parseFloat(income) + parseFloat(oldIncome.levelIncome)

        // Checking if the upline is null or not
        try {
            if (currentUpline.sponsorID !== "null")
                await updateIncome(currentUpline.sponsorID, { levelIncome: income })
        } catch (e) {
            break
        }

        // Updating the currentupline in each loop
        currentUpline = await Users.findOne({ userID: currentUpline.sponsorID })
    }
}

app.post("/addPlan", async (req, res) => {
    try {
        
        // Fetching the user & plan details
        const check = await Users.findOne({ userID: req.session.user.userID })
        const plan = await db.collection('plans').findOne({ planID: req.body.planID });

        // Updating the plan if the criteria matches
        const filter = { userID: req.session.user.userID };
        const updateDoc = {
            $set: {
                plans: [...check.plans, {
                    planID: req.body.planID,
                    amount: req.body.amount
                }]
            }
        }
        if ((parseFloat(plan.minInvest) < parseFloat(req.body.amount)) && (parseFloat(req.body.amount) < parseFloat(plan.maxInvest)))
            await Users.updateOne(filter, updateDoc)
        else
            throw new Error;

        // Update direct & level income
        if (check.sponsorID !== null)
            await directIncome(check.sponsorID, plan.directIncome, req.body.amount)
        await levelIncome(check, plan.levelIncome, req.body.amount)
        res.json({ msg: true })

    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: "Something went wrong !!!" })
    }
})

app.get("/checkID", async (req, res) => {
    await Users.findOne({ userID: req.query.id }).then(val => {
        if (val !== null)
            res.send({ msg: true })
        else
            res.send({ msg: false })
    });
})

app.post("/login", async (req, res) => {
    try {
        const check = await Users.findOne({ userID: req.body.userID })
        if (check.password == req.body.password) {
            const userSession = { userID: check.userID, is_admin: check.is_admin }
            req.session.user = userSession
            res.json({ msg: true, userSession })
        } else
            res.send({ msg: false, response: "Password doesn't matched !!!" })
    } catch (e) {
        res.send({ msg: false, response: "Invalid User !!!" })
    }
})

app.get("/logout", async (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/')
    })
});

app.listen(9000, () => {
    console.log("Connected !!!");
})