const { Users, Incomes } = require('../../mongodb')

async function homeIncome(req, res) {
    try {
        if (req.query.is_admin === 'true') {
            filter = {}
        } else {
            filter = { userID: req.query.id }
        }
        await Users.find(filter).then(async users => {

            let finalDict = {
                uID: 0,
                team: 0,
                wallet: 0,
                package: 0,
                dailyProfit: 0,
                directIncome: 0,
                levelIncome: 0,
                dailyLevelIncome: 0,
                deposit: 0,
                withdrawal: 0
            }
            for (var i = 0; i < users.length; i++) {

                if (users[i].userID !== 'admin') {

                    // Iterating over all the plans a user has and getting the total invested amount by the user.
                    let package = 0
                    users[i].plans.map(plan => {
                        package = parseFloat(plan.amount) + package
                    })
                    finalDict.uID = parseInt(users[i].uID || 100)
                    finalDict.team = finalDict.team + parseInt(users[i].team || 0)
                    finalDict.package = finalDict.package + parseInt(package)

                    // Getting the income detail
                    await Incomes.findOne({ userID: users[i].userID }).then(val => {
                        Object.keys(finalDict).forEach(async key => {
                            if (val[key] !== undefined)
                                finalDict[key] = (parseFloat(finalDict[key]) + parseFloat(val[key])).toFixed(2)
                        })
                    });

                }
            }
            res.send({ msg: true, response: finalDict })
        })
    } catch (e) {
        console.log(e);
        res.send({ msg: false })
    }
}

module.exports = { homeIncome }