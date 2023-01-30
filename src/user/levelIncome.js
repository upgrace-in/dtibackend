const { Users, Incomes, LevelLogs } = require('../../mongodb')
const { updateIncome } = require('./updateIncome')

async function levelIncome(user, levels, amt) {
    try {
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
                    finalIncome[currentUpline.sponsorID] = [income, i + 1]
            } catch (e) {
                break
            }

            // Updating the currentupline in each loop
            currentUpline = await Users.findOne({ userID: currentUpline.sponsorID })
        }

        Object.keys(finalIncome).forEach(async userID => {
            // Fetch the user's old dailylevelincome
            const oldIncome = await Incomes.findOne({ userID: userID });
            let currentincome = finalIncome[userID][0]

            if ((oldIncome !== null) && (oldIncome.levelIncome !== undefined))
                // Adding the old income to the new one
                finalIncome[userID][0] = parseFloat(currentincome) + parseFloat(oldIncome.levelIncome)

            await updateIncome(userID, { levelIncome: finalIncome[userID][0] }).then(async (val) => {
                if (val)
                    // adding to the logs
                    await LevelLogs.insertMany(
                        {
                            userID: userID,
                            from: user.userID,
                            amount: currentincome,
                            level: finalIncome[userID][1]
                        }
                    ).then(async (val, err) => {
                        if (val === false)
                            throw userID
                    })
                else
                    throw userID
            });
        })
        return { msg: true }
    } catch (e) {
        console.log(e);
        return { msg: false, userID: e }
    }
}

module.exports = { levelIncome }