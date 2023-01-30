const { Incomes } = require('../../mongodb');

async function updateIncome(userID, dict) {
    const filter = { userID: userID };
    const updateDoc = {
        $set: dict
    }
    const options = { upsert: true }
    return await Incomes.updateOne(filter, updateDoc, options).then((val, err) => {
        if (val)
            return true
        return false
    })
}
module.exports = { updateIncome }