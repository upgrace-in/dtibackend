const { Incomes, Users, db, Trades } = require('../../mongodb');
const { directIncome } = require('./directIncome');
const { levelIncome } = require('./levelIncome');
const { updateIncome } = require('./updateIncome');

async function addPlan(req, res) {
    try {
        const userID = req.body.userSession.userID
        // Fetching the user & plan details
        const check = await Users.findOne({ userID: userID })
        const plan = await db.collection('plans').findOne({ planID: req.body.planID });

        // criteria cheking if the plan min & max invest
        if ((parseFloat(plan.minInvest) < parseFloat(req.body.amount)) && (parseFloat(req.body.amount) < parseFloat(plan.maxInvest))) {

            const income = await Incomes.findOne({ userID: userID })

            if (parseFloat(income.wallet) > parseFloat(req.body.amount)) {

                // Updating the wallet
                let wallet = parseFloat(income.wallet) - parseFloat(req.body.amount)
                await updateIncome(userID, { wallet }).then(async (val) => {
                    if (val) {

                        // Updating the plan to the users database
                        await Users.updateOne({ userID: userID }, {
                            $set: {
                                plans: [...check.plans, {
                                    planID: req.body.planID,
                                    amount: req.body.amount
                                }]
                            }
                        }).then(async (val, err) => {
                            if (val) {
                                // add to logs
                                await Trades.insertMany(
                                    {   
                                        planID: req.body.planID,
                                        amount: req.body.amount,
                                        userID: userID
                                    }
                                ).then(async (val, err) => {
                                    if (val) {
                                        // Update direct & level income
                                        if (check.sponsorID !== "null")     
                                            await directIncome(check, plan, req.body.amount).then(val => {
                                                if (val !== true)
                                                    throw "Error while updating direct income at userID= " + val.userID
                                            })

                                        await levelIncome(check, plan.levelIncome, req.body.amount).then(val => {
                                            if (val.msg !== true)
                                                throw "Error while updating level income at userID= " + val.userID
                                        })
                                    } else
                                        throw "Error in creating Logs..."
                                })
                            } else
                                throw "Error in Plan Updation !!!"
                        })
                    } else
                        throw "Error in updating income !!!"
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
}

module.exports = { addPlan }