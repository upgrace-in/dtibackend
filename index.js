const express = require('express')
const app = express()
const { Users, db, Incomes, Sessions } = require('./mongodb')
const cors = require('cors')

app.set('trust proxy', true)

require('dotenv').config()
app.use(express.json())
app.use(cors())

var bodyParser = require('body-parser');
// var multer = require('multer');
// var forms = multer({ dest: 'upload/'});
app.use(bodyParser.json());
// app.use(forms.array());
app.use(bodyParser.urlencoded({ extended: true }));

const { dailyProfit } = require('./src/user/dailyProfit')
const { dailyLevelIncome } = require('./src/user/dailyLevelIncome')

const { register } = require('./src/register')
const { addPlan } = require('./src/user/addPlan')
const { generateReports } = require('./src/generateReports')
const { login, logout } = require('./src/user')

// Admin
const { manageFund } = require('./src/admin/manageFund')
const { homeIncome } = require('./src/user/homeIncome')

const { saveMail, fetchMail } = require('./src/mail')

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

app.get('/loginDetails', async (req, res) => {
    try {
        const sessions = await Sessions.find({})
        res.send({ msg: true, response: sessions })
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: e })
    }
});

app.post('/saveMail', async (req, res) => {
    await checkSessionID(req, res, req.body.userSession.sessionID).then(async val => {
        await saveMail(req, res).catch(e => {
            console.log(e);
            res.send({ msg: false, response: e })
        })
    })
});

app.get('/fetchMail', async (req, res) => {
    await checkSessionID(req, res, req.query.sessionID).then(async val => {
        await fetchMail(req, res).catch(e => {
            console.log(e);
            res.send({ msg: false, response: e })
        })
    })
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

app.post("/allUsers", async (req, res) => {
    try {
        await checkSessionID(req, res, req.body.userSession.sessionID).then(async val => {
            let usersArr = []

            await Users.find({}).then(async users => {

                for (var i = 0; i < users.length; i++) {

                    let finalDict = {}

                    if (users[i].userID !== 'admin') {

                        let package = 0
                        users[i].plans.map(plan => {
                            package = parseFloat(plan.amount) + package
                        })
                        finalDict.package = parseInt(package)
                        finalDict['user'] = users[i]

                        // Getting the income detail
                        await Incomes.findOne({ userID: users[i].userID }).then(val => {
                            finalDict['wallet'] = val.wallet
                            finalDict['topupwallet'] = val.topupwallet
                        });

                        usersArr.push(finalDict)

                    }
                }

            })

            res.send({ msg: true, response: usersArr })

        });
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: e })
    }
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

app.get('/profileData', async (req, res) => {
    try {
        const user = await fetchuserdetails(req.query.id)
        res.send({ msg: true, response: user })
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: e })
    }
})

app.post('/updateProfile', async (req, res) => {
    try {
        await checkSessionID(req, res, req.body.userSession.sessionID).then(async val => {
            const data = req.body
            await Users.updateOne(
                { userID: data.userSession.userID },
                {
                    $set:
                    {
                        name: data.name,
                        gender: data.gender,
                        email: data.email,
                        mobileNumber: data.mobileNumber,
                        city: data.city,
                        state: data.state,
                        usdtAdd: data.usdtAdd,
                        tronAdd: data.tronAdd
                    }
                }).then((val, err) => {
                    if (val)
                        res.send({ msg: true })
                    else
                        throw "Unable to Update Profile !!!"
                }).catch((error) => {
                    throw "Unable to Update Profile !!!"
                });
        }).catch((error) => {
            throw "Unable to Get User !!!"
        });
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: e })
    }
})

app.post('/updatePassword', async (req, res) => {
    try {
        // fetch the user
        const val = await fetchuserdetails(req.body.userID)

        // match the password
        if (val.password === req.body.oldpassword)
            // change passwrod
            await Users.updateOne(
                { userID: req.body.userID },
                {
                    $set:
                    {
                        password: req.body.newpassword
                    }
                }).then((val, err) => {
                    if (val)
                        res.send({ msg: true })
                    else
                        throw "Unable to Update Password !!!"
                })
        else
            throw "Invalid Old Password !!!"
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: e })
    }
})

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
    await checkSessionID(req, res, req.body.userSession.sessionID).then(async val => {
        await addPlan(req, res)
    })
})

app.post("/fundManagment", async (req, res) => {
    await checkSessionID(req, res, req.body.userSession.sessionID).then(async val => {
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
    await homeIncome(req, res)
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

async function checkSessionID(req, res, sessionID) {
    try {
        const collection = await Sessions.findOne({ sessionID: sessionID });
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
    await login(req, res)
})

app.get('/logout', async (req, res) => {
    await logout(req, res)
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