const { updateIncome } = require('./updateIncome')
const { Incomes, DirectincomeLogs } = require('../../mongodb')

async function directIncome(userDict, planDict, amt) {
    // directincome % -> calculate the % -> update to the upline
    const oldIncome = await Incomes.findOne({ userID: userDict.sponsorID });

    // Calculating for the final directincome for the upline
    let income = (parseFloat(amt) * parseFloat(planDict.directIncome)) / 100
    let currentincome = income

    // If the upline already has some income add it to it
    if ((oldIncome !== null) && (oldIncome.directIncome !== undefined))
        income = income + parseFloat(oldIncome.directIncome)

    // Down work is just to update 
    return await updateIncome(userDict.sponsorID, { directIncome: income }).then(async (val) => {
        if (val)
            // adding to the logs
            return await DirectincomeLogs.insertMany(
                {
                    from: userDict.userID,
                    amount: currentincome,
                    userID: userDict.sponsorID
                }
            ).then(async (val, err) => {
                if (val)
                    return true
                return false
            })
        return false
    });
}

module.exports = { directIncome }