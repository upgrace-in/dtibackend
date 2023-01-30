const { Users, Incomes, db } = require('../../mongodb')
const { updateIncome } = require('./updateIncome')

async function dailyProfit() {
    try {
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
            const oldIncome = await Incomes.findOne({ userID: users[i].userID });
            if ((oldIncome !== null) && (oldIncome.dailyProfit !== undefined))
                // Adding the old income to the new one
                finalIncome = parseFloat(finalIncome) + parseFloat(oldIncome.dailyProfit)
            await updateIncome(users[i].userID, { dailyProfit: finalIncome }).then(val => {
                if (val !== true) {
                    throw "Error in updating income at userID: " + users[i].userID
                }
            })
        }
        return { msg: true }
    } catch (e) {
        console.log(e);
        return { msg: false, response: e }
    }
}

module.exports = { dailyProfit }