const { Incomes, AdminFundLogs } = require('../../mongodb');

async function manageFund(req, res) {
    try {

        // fetch the user
        const check = await Incomes.findOne({ userID: req.body.userID });

        let amt = req.body.amount
        let fundType = req.body.walletType
        let finaldic = {}

        // checking the type of fund it is
        if (req.body.type === 'transferFund') {
            // Setting the default amt incase the user is new
            finaldic[fundType] = amt
            // Checking if the user's income db is their if not directly update the new data
            if (check !== null) {
                if ((fundType === 'topupwallet') && (check.topupwallet !== undefined)) {
                    amt = parseFloat(check.topupwallet) + parseFloat(amt)
                    finaldic['topupwallet'] = amt
                } else if (check.wallet !== undefined) {
                    amt = parseFloat(check.wallet) + parseFloat(amt)
                    // finaldic = { wallet: amt }
                    finaldic['wallet'] = amt
                }
            }
        } else {
            // Deduct Fund
            finaldic[fundType] = 0
            if (check !== null)
                // condiiton to check if the old data is available
                if ((fundType === 'topupwallet') && (check.topupwallet !== undefined) && (parseFloat(check.topupwallet) > parseFloat(amt))) {
                    amt = parseFloat(check.topupwallet) - parseFloat(amt)
                    finaldic['topupwallet'] = amt
                } else if ((check.wallet !== undefined) && (parseFloat(check.wallet) > parseFloat(amt))) {
                    amt = parseFloat(check.wallet) - parseFloat(amt)
                    finaldic['wallet'] = amt
                }
        }

        // Add Logs
        await AdminFundLogs.insertMany(
            {
                userID: req.body.userID,
                amount: req.body.amount,
                remark: req.body.remark,
                type: req.body.type
            }
        ).then(async (val, err) => {
            if (err)
                throw "Unable to create Logs"
        });

        await Incomes.updateOne(
            { userID: check.userID },
            finaldic,
            { upsert: true });

        res.json({ msg: true })

    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: "Unknown error occured !!!" })
    }
}

module.exports = { manageFund }