const { Users, Incomes } = require('../../mongodb')
const { updateIncome } = require('./updateIncome')

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
        const oldIncome = await Incomes.findOne({ userID: key });
        if ((oldIncome !== null) && (oldIncome.levelIncome !== undefined))
            // Adding the old income to the new one
            finalIncome[key] = parseFloat(finalIncome[key]) + parseFloat(oldIncome.levelIncome)
        await updateIncome(key, { levelIncome: finalIncome[key] }).then(val => {
            if (val !== true)
                return { msg: false, userID: key }
        })
    })
    return { msg: true }
}

module.exports = { levelIncome }