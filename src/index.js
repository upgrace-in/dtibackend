const express = require('express')
const app = express()
const { Users } = require('./mongodb')
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

app.post("/register", async (req, res) => {
    try {
        const check = await Users.findOne({ userID: req.body.sponsorID })
        await Users.insertMany({ ...req.body, uID: parseInt(check.uID) + 1 })
        res.json({ msg: true })
    } catch (e) {
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