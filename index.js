const express = require('express')
const app = express()
const { Users, db, IncomeModel, Sessions } = require('./mongodb')
const cors = require('cors')
const crypto = require('crypto')
require('dotenv').config()
app.use(express.json())
app.use(cors())

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

async function updateSponsorsTeamData(user) {
    await Users.updateOne(
        {
            userID: user.userID
        }, {
        $set: {
            team: parseInt(...user.team) + 1
        }
    })
}

async function recurseUpdateTeam(userDict) {
    if (userDict.sponsorID === 'null') {
        return null
    } else {
        // Taking the sponsorID of the userDICt and update the team field
        const val = await fetchuserdetails(userDict.sponsorID)
        await updateSponsorsTeamData(val)
        // Same goes for the others till reached to null
        return await recurseUpdateTeam(val)
    }
}


app.post("/register", async (req, res) => {
    try {
        // The UserID should not exists
        const userExists = await Users.findOne({ userID: req.body.userID })
        if (userExists === null) {
            // Registereing the user
            await Users.insertMany(
                {
                    ...req.body,
                    uID: parseFloat(req.body.uID) + 1,
                }
            )

            // Update the user to the sponsor's collection
            const check = await Users.findOne({ userID: req.body.sponsorID })
            await Users.updateOne(
                {
                    userID: req.body.sponsorID
                }, {
                $set: {
                    connections: [...check.connections, {
                        userID: req.body.userID
                    }]
                }
            })

            // Update the team number in the sponsors
            await recurseUpdateTeam(req.body)

            res.json({ msg: true })
        } else
            res.send({ msg: false, response: "Something went wrong !!!" })
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: "Something went wrong !!!" })
    }
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
    if ((oldIncome !== null) && (oldIncome.directIncome !== undefined))
        income = income + parseFloat(oldIncome.directIncome)

    // Down work is just to update 
    await updateIncome(upline, { directIncome: income })
}

async function dailyProfit() {
    // Loop through all the users
    const users = await Users.find()
    for (var i = 0; i < users.length; i++) {

        let finalIncome = 0
        let plans = users[i].plans

        // Loop through all the plans a user has (put the amt invested in a variable)
        for (var j = 0; j < plans.length; j++) {

            // Fetch the plan details (dailyProfitPercent)
            const plan = await db.collection('plans').findOne({ planID: parseInt(plans[j].planID) })
            let dailyProfitPercent = parseFloat(plan.dailyProfit)

            // Invested amt per plan
            let investAmt = parseFloat(plans[j].amount)

            // Fetch Calculate the income (Add the income to the finalIncome)
            finalIncome = finalIncome + (parseFloat(investAmt) * parseFloat(dailyProfitPercent)) / 100
        }
        // Update to the DB
        // Fetch the user's old dailylevelincome
        const oldIncome = await IncomeModel.findOne({ userID: users[i].userID });
        if ((oldIncome !== null) && (oldIncome.dailyProfit !== undefined))
            // Adding the old income to the new one
            finalIncome = parseFloat(finalIncome) + parseFloat(oldIncome.dailyProfit)
        await updateIncome(users[i].userID, { dailyProfit: finalIncome })
    }
}

async function updateFinalIncome(planDict, user, finalIncome) {
    // Invested amt per plan
    let investAmt = parseFloat(planDict.amount)
    let currentUpline = user

    // Fetch the plan details (dailyLevelIncomePercents + LevelIncome)
    const plan = await db.collection('plans').findOne({ planID: parseInt(planDict.planID) })
    let LevelPercent = plan.levelIncome.split(',')
    let DailylevelPercent = plan.dailyLevelIncome.split(',')

    // Loop through the levelincome
    for (var k = 0; k < LevelPercent.length; k++) {

        // Checking if the upline is null or not
        try {
            if (currentUpline.sponsorID !== "null") {

                // Calculate the income (acc to dailyLevelIncomePercents of levelincome of AMT)
                let income = ((parseFloat(investAmt) * parseFloat(LevelPercent[k])) / 100) * parseFloat(DailylevelPercent[k]) / 100

                finalIncome[currentUpline.sponsorID] = income

            }
        } catch (e) {
            break
        }

        // Updating the currentupline in each loop
        currentUpline = await Users.findOne({ userID: currentUpline.sponsorID })
    }

    return finalIncome
}

async function dailyLevelIncome() {
    // Loop through all the users
    const users = await Users.find()
    for (var i = 0; i < users.length; i++) {

        let finalIncome = {}
        let plans = users[i].plans
        let currentUpline = users[i]

        // checking if the upline is not null
        if (currentUpline.sponsorID !== "null") {
            // Loop through all the plans a user has (put the amt invested in a variable)
            for (var j = 0; j < plans.length; j++) {

                finalIncome = await updateFinalIncome(plans[j], currentUpline, finalIncome)

            }
        }
        // Update to the DB
        Object.keys(finalIncome).forEach(async key => {
            // Fetch the user's old dailylevelincome
            const oldIncome = await IncomeModel.findOne({ userID: key });
            if ((oldIncome !== null) && (oldIncome.dailyLevelIncome !== undefined))
                // Adding the old income to the new one
                finalIncome[key] = parseFloat(finalIncome[key]) + parseFloat(oldIncome.dailyLevelIncome)
            await updateIncome(key, { dailyLevelIncome: finalIncome[key] })
        })
    }
}

async function levelIncome(user, levels, amt) {

    let finalIncome = {}
    let LevelPercent = levels.split(',')
    let currentUpline = user

    // Looping through the level percents
    for (var i = 0; i < LevelPercent.length; i++) {
        // Calculating income according to the levelpercents
        let income = (parseFloat(amt) * parseFloat(LevelPercent[i])) / 100

        // Checking if the upline is null or not
        try {
            if (currentUpline.sponsorID !== "null")
                finalIncome[currentUpline.sponsorID] = income
        } catch (e) {
            break
        }

        // Updating the currentupline in each loop
        currentUpline = await Users.findOne({ userID: currentUpline.sponsorID })
    }

    Object.keys(finalIncome).forEach(async key => {
        // Fetch the user's old dailylevelincome
        const oldIncome = await IncomeModel.findOne({ userID: key });
        if ((oldIncome !== null) && (oldIncome.levelIncome !== undefined))
            // Adding the old income to the new one
            finalIncome[key] = parseFloat(finalIncome[key]) + parseFloat(oldIncome.levelIncome)
        await updateIncome(key, { levelIncome: finalIncome[key] })
    })

}

app.post("/addPlan", async (req, res) => {
    try {
        const userID = req.body.userID
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
            const income = await IncomeModel.findOne({ userID: userID })
            if (parseFloat(income.wallet) > parseFloat(req.body.amount)) {
                // Updating the wallet
                let wallet = parseFloat(income.wallet) - parseFloat(req.body.amount)
                await IncomeModel.findOne({ userID: userID }, { wallet: wallet })
                await Users.updateOne(filter, updateDoc)
            } else
                throw new Error
        } else
            throw new Error;

        // Update direct & level income
        if (check.sponsorID !== "null")
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
            await IncomeModel.findOne({ userID: req.query.id }).then(val => {
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
    const collection = await Sessions.findOne({ sessionID: req.body.sessionID });
    if (collection === null)
        res.send({ msg: false })
    else
        return true
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
        const check = await IncomeModel.findOne({ userID: req.body.userID });

        let amt = req.body.amount
        let fundType = req.body.walletType
        let finaldic = {}

        if (req.body.type === 'transferFund') {
            // Setting the default amt incase the user is new
            finaldic[fundType] = amt
            // Checking if teh user's income db is theri if not directly update hte new data
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
                if ((fundType === 'topupwallet') && (check.topupwallet !== undefined) && (parseFloat(check.topupwallet) > parseFloat(amt))) {
                    amt = parseFloat(check.topupwallet) - parseFloat(amt)
                    finaldic['topupwallet'] = amt
                } else if ((check.wallet !== undefined) && (parseFloat(check.wallet) > parseFloat(amt))) {
                    amt = parseFloat(check.wallet) - parseFloat(amt)
                    finaldic['wallet'] = amt
                }
        }

        await IncomeModel.updateOne(
            { userID: check.userID },
            finaldic,
            { upsert: true });

        res.json({ msg: true })
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: "Unknown error occured !!!" })
    }
})

// setTimeout(async () => {
//     const user = await Users.findOne({ userID: 'member8' })
//     await recurseUpdateTeam(user)
// }, 3000)

app.listen(process.env.PORT, () => {
    console.log("Connected !!!");
})