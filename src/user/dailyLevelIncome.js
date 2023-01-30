const { Users, Incomes, db } = require('../../mongodb')
const { updateIncome } = require('./updateIncome')

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
            const oldIncome = await Incomes.findOne({ userID: key });
            if ((oldIncome !== null) && (oldIncome.dailyLevelIncome !== undefined))
                // Adding the old income to the new one
                finalIncome[key] = parseFloat(finalIncome[key]) + parseFloat(oldIncome.dailyLevelIncome)
            await updateIncome(key, { dailyLevelIncome: finalIncome[key] }).then(val => {
                if (val !== true)
                    return { msg: false, userID: key }
            })
        })
        return { msg: true }
    }
}

module.exports = { dailyLevelIncome }