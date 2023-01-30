const { updateIncome } = require('./updateIncome')
const { Incomes } = require('../../mongodb')

async function directIncome(upline, directIncomePercent, amt) {
    // directincome % -> calculate the % -> update to the upline
    const oldIncome = await Incomes.findOne({ userID: upline });

    // Calculating for the final directincome for the upline
    let income = (parseFloat(amt) * parseFloat(directIncomePercent)) / 100

    // If the upline already has some income add it to it
    if ((oldIncome !== null) && (oldIncome.directIncome !== undefined))
        income = income + parseFloat(oldIncome.directIncome)

    // Down work is just to update 
    return await updateIncome(upline, { directIncome: income }).then(val => {
        if (val === true)
            return true
        return false
    })
}

module.exports = { directIncome }