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

// app.use('/', express.static(__dirname + '/server/build'))

app.get('/plans', async (req, res) => {
    var collection = db.collection('plans');
    collection.find().toArray(function (err, plans) {
        if (!err)
            res.send({ msg: true, response: plans })
        else
            res.send({ msg: false })
    });
})




const { register } = require('./src/register')

app.post("/register", async (req, res) => {
    await register(req, res, Users)
})

async function fetchuserdetails(userID) {
    return await Users.findOne({ userID: userID }).then(val => {
        return val
    })
}

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
    try {
        await checkSessionID(req, res);
        const userID = req.body.userSession.userID
        // Fetching the user & plan details
        const check = await Users.findOne({ userID: userID })
        const plan = await db.collection('plans').findOne({ planID: req.body.planID });

        // Updating the plan if the criteria matches
        const filter = { userID: userID };
        const updateDoc = {
            $set: {
                plans: [...check.plans, {
                    planID: req.body.planID,
                    amount: req.body.amount
                }]
            }
        }

        // criteria cheking if the plan min & max invest
        if ((parseFloat(plan.minInvest) < parseFloat(req.body.amount)) && (parseFloat(req.body.amount) < parseFloat(plan.maxInvest))) {

            const income = await Incomes.findOne({ userID: userID })

            if (parseFloat(income.wallet) > parseFloat(req.body.amount)) {

                // Updating the wallet
                let wallet = parseFloat(income.wallet) - parseFloat(req.body.amount)
                await updateIncome(userID, { wallet: wallet }).then(async (val) => {
                    if (val) {

                        // Updating the plan to the users database
                        await Users.updateOne(filter, updateDoc)

                        // Update direct & level income
                        if (check.sponsorID !== "null")
                            await directIncome(check.sponsorID, plan.directIncome, req.body.amount).then(val => {
                                if (val !== true)
                                    throw "Error while updating durect income at userID= " + val.userID
                            })

                        await levelIncome(check, plan.levelIncome, req.body.amount).then(val => {
                            if (val.msg !== true)
                                throw "Error while updating level income at userID= " + val.userID
                        })

                    } else
                        throw "Error in updating income..."
                })
            } else
                throw "Insufficient Balance !!!"
        } else
            throw "Amount should be within min. & max. investment of the plan !!!";
        res.json({ msg: true })

    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: e })
    }
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
    // Create an empty dict
    let finalDict = {}
    // Fetch details like IDNO Team Package(InvestAMT)
    try {
        await Users.findOne({ userID: req.query.id }).then(async val => {
            // Iterating over all the plans a user has and getting the total invested amount by the user.
            let investAMT = 0
            val.plans.map(plan => {
                investAMT = parseFloat(plan.amount) + investAMT
            })
            finalDict['uID'] = val.uID
            finalDict['team'] = val.team
            finalDict['investAMT'] = investAMT

            // Getting the income detail
            await Incomes.findOne({ userID: req.query.id }).then(val => {
                if (val !== null) {
                    finalDict['incomes'] = val
                } else {
                    finalDict['incomes'] = 0
                }
                res.send({ msg: true, response: finalDict })
            });
        })
    } catch (e) {
        console.log(e);
        res.send({ msg: false })
    }
})

async function checkSessionID(req, res) {
    try {
        const collection = await Sessions.findOne({ sessionID: req.body.userSession.sessionID });
        if (collection === null)
            res.send({ msg: false })
        else
            return true
    } catch (e) {
        // console.log(e);
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

app.post("/fundManagment", async (req, res) => {
    try {
        await checkSessionID(req, res)
        // fetch the user
        const check = await Incomes.findOne({ userID: req.body.userID });

        let amt = req.body.amount
        let fundType = req.body.walletType
        let finaldic = {}

        // checking the type of fund it is
        if (req.body.type === 'transferFund') {
            // Setting the default amt incase the user is new
            finaldic[fundType] = amt
            // Checking if the user's income db is their if not directly update the new data
            if (check !== null) {
                if ((fundType === 'topupwallet') && (check.topupwallet !== undefined)) {
                    amt = parseFloat(check.topupwallet) + parseFloat(amt)
                    finaldic['topupwallet'] = amt
                } else if (check.wallet !== undefined) {
                    amt = parseFloat(check.wallet) + parseFloat(amt)
                    // finaldic = { wallet: amt }
                    finaldic['wallet'] = amt
                }
            }
        } else {
            // Deduct Fund
            finaldic[fundType] = 0
            if (check !== null)
                // condiiton to check if the old data is available
                if ((fundType === 'topupwallet') && (check.topupwallet !== undefined) && (parseFloat(check.topupwallet) > parseFloat(amt))) {
                    amt = parseFloat(check.topupwallet) - parseFloat(amt)
                    finaldic['topupwallet'] = amt
                } else if ((check.wallet !== undefined) && (parseFloat(check.wallet) > parseFloat(amt))) {
                    amt = parseFloat(check.wallet) - parseFloat(amt)
                    finaldic['wallet'] = amt
                }
        }

        await Incomes.updateOne(
            { userID: check.userID },
            finaldic,
            { upsert: true });

        res.json({ msg: true })
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: "Unknown error occured !!!" })
    }
})

setTimeout(async () => {
    await dailyLevelIncome().then(val => {
        console.log(val);
    })
    await dailyProfit().then(val => {
        console.log(val);
    })
}, 2000)

app.listen(process.env.PORT, () => {
    console.log("Connected !!!");
})