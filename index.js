const express = require('express')
const app = express()
const { Users, db, Incomes, Sessions } = require('./mongodb')
const cors = require('cors')
const crypto = require('crypto')
require('dotenv').config()
app.use(express.json())
app.use(cors())

const { updateIncome } = require('./src/user/updateIncome')

const { directIncome } = require('./src/user/directIncome')
const { levelIncome } = require('./src/user/levelIncome')
const { dailyProfit } = require('./src/user/dailyProfit')
const { dailyLevelIncome } = require('./src/user/dailyLevelIncome')

const { register } = require('./src/register')
const { addPlan } = require('./src/user/addPlan')

const { generateReports } = require('./src/generateReports')

// Admin
const { manageFund } = require('./src/admin/manageFund')

app.get('/isAuth', async (req, res) => {
    // return res.json({ msg: false })
    const userExists = await fetchuserdetails(req.query.id)
    if (userExists !== null) {
        return res.json({ msg: true })
    } else {
        return res.json({ msg: false })
    }
})

app.get('/', (req, res) => {
    res.send("Hari Bol")
});

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
    await register(req, res, Users)
})

app.get("/reports", async (req, res) => {
    // reportType, is_admin, userID
    if (req.query.is_admin === 'true')
        await generateReports(req, res, {})
    else
        await generateReports(req, res, { userID: req.query.userID })
})

async function fetchuserdetails(userID) {
    return await Users.findOne({ userID: userID }).then(val => {
        return val
    })
}

async function recurseToNull(currentuser, teamDict, level) {
    if (currentuser.connections === null) {
        return null
    } else {
        try {
            teamDict[level].push(currentuser)
        } catch (e) {
            teamDict[level] = []
            teamDict[level].push(currentuser)
        }
        let cons = currentuser.connections
        for (let i = 0; i < cons.length; i++) {
            const val = await fetchuserdetails(cons[i].userID)
            await recurseToNull(val, teamDict, level + 1)
        }
        return teamDict
    }
}

app.get("/myTeam", async (req, res) => {
    try {
        await fetchuserdetails(req.query.id).then(async val => {
            let teamDict = {}
            teamDict = await recurseToNull(val, teamDict, 0)
            res.send({ msg: true, response: teamDict })
        })
    } catch (e) {
        console.log(e);
        res.send({ msg: false })
    }
});

app.post("/addPlan", async (req, res) => {
    await checkSessionID(req, res).then(async val => {
        await addPlan(req, res)
    })
})

app.post("/fundManagment", async (req, res) => {
    await checkSessionID(req, res).then(async val => {
        await manageFund(req, res)
    })
})

app.get("/checkID", async (req, res) => {
    await Users.findOne({ userID: req.query.id }).then(val => {
        if (val !== null)
            res.send({ msg: true, response: val })
        else
            res.send({ msg: false, response: val })
    });
})

app.get("/income", async (req, res) => {
    try {
        if (req.query.is_admin === 'true') {
            filter = {}
        } else {
            filter = { userID: req.query.id }
        }
        await Users.find(filter).then(async users => {

            let finalDict = {
                uID: 0,
                team: 0,
                wallet: 0,
                package: 0,
                dailyProfit: 0,
                directIncome: 0,
                levelIncome: 0,
                dailyLevelIncome: 0,
                deposit: 0,
                withdrawal: 0
            }
            for (var i = 0; i < users.length; i++) {

                if (users[i].userID !== 'admin') {

                    // Iterating over all the plans a user has and getting the total invested amount by the user.
                    let package = 0
                    users[i].plans.map(plan => {
                        package = parseFloat(plan.amount) + package
                    })
                    finalDict.uID = parseInt(users[i].uID || 100)
                    finalDict.team = finalDict.team + parseInt(users[i].team || 0)
                    finalDict.package = finalDict.package + parseInt(package)

                    // Getting the income detail
                    await Incomes.findOne({ userID: users[i].userID }).then(val => {
                        Object.keys(finalDict).forEach(async key => {
                            if (val[key] !== undefined)
                                finalDict[key] = (parseFloat(finalDict[key]) + parseFloat(val[key])).toFixed(2)
                        })
                    });

                }
            }
            res.send({ msg: true, response: finalDict })
        })
    } catch (e) {
        console.log(e);
        res.send({ msg: false })
    }
})

app.get("/directUsers", async (req, res) => {
    try {
        // fetch the user's connections
        await Users.findOne({ userID: req.query.id }).then(async val => {
            // create a empty arr
            let directusers = []
            // iterate through the connections and fetch their details put into the above dict
            let cons = val.connections
            for (let i = 0; i < cons.length; i++) {
                const val = await fetchuserdetails(cons[i].userID)
                let investAMT = 0
                val.plans.map(plan => {
                    investAMT = parseFloat(plan.amount) + investAMT
                })
                directusers.push({ val, investAMT: investAMT })
            }
            // return the dict
            res.send({ msg: true, response: directusers })
        })
    } catch (e) {
        console.log(e);
        res.send({ msg: false })
    }
});

async function checkSessionID(req, res) {
    try {
        const collection = await Sessions.findOne({ sessionID: req.body.userSession.sessionID });
        if (collection === null)
            res.send({ msg: false })
        else
            return collection
    } catch (e) {
        console.log(e)
        res.send({ msg: false })
    }
}

app.post("/login", async (req, res) => {
    try {
        const check = await Users.findOne({ userID: req.body.userID })
        if (check.password === req.body.password) {
            const userSession = { userID: check.userID, is_admin: check.is_admin, sessionID: crypto.randomBytes(6).toString('hex') }
            await Sessions.updateOne({ userID: req.body.userID }, { $set: userSession }, { upsert: true });
            res.json({ msg: true, userSession: userSession })
        } else
            res.send({ msg: false, response: "Password doesn't matched !!!" })
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: "Invalid User !!!" })
    }
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send({ msg: true });
});

setTimeout(async () => {
    //     await dailyLevelIncome().then(val => {
    //         console.log(val);
    //     })
    //     await dailyProfit().then(val => {
    //         console.log(val);
    //     })
    // await generateReports(true, true, true)
}, 2000)

app.listen(process.env.PORT, () => {
    console.log("Connected !!!");
})