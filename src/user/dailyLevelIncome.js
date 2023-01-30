const { Users, Incomes, db, DailyLevelLogs } = require('../../mongodb')
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

                // k+1 is the level
                finalIncome[currentUpline.sponsorID] = [income, k + 1]

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
    try {
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

            if (Object.keys(finalIncome).length > 0) {
                // Update to the DB
                Object.keys(finalIncome).forEach(async userID => {
                    let fromuserID = users[i].userID
                    // Fetch the user's old dailylevelincome
                    const oldIncome = await Incomes.findOne({ userID: userID });
                    let currentincome = finalIncome[userID][0]

                    if ((oldIncome !== null) && (oldIncome.dailyLevelIncome !== undefined))
                        // Adding the old income to the new one
                        finalIncome[userID][0] = parseFloat(currentincome) + parseFloat(oldIncome.dailyLevelIncome)

                    await updateIncome(userID, { dailyLevelIncome: finalIncome[userID][0] }).then(async (val) => {
                        if (val) {
                            // adding to the logs
                            await DailyLevelLogs.insertMany(
                                {
                                    userID: userID,
                                    from: fromuserID,
                                    amount: currentincome,
                                    level: finalIncome[userID][1]
                                }
                            ).then(async (val, err) => {
                                if (val === false)
                                    throw userID
                            })
                        } else {
                            throw userID
                        }
                    });
                })
            }
        }
        return { msg: true }
    } catch (e) {
        console.log(e);
        return { msg: false, userID: e }
    }
}

module.exports = { dailyLevelIncome }