const { LastuID, Incomes } = require('../mongodb')

async function getLastuID() {
    // Fetch the lastUID 
    return await LastuID.findOne({ uID: "100" }).then(async val => {
        return val
    })
}

async function createIncomes(userID) {
    return await Incomes.insertMany(
        {
            userID: userID,
        }
    ).then((val, err) => {
        if (val)
            return true
        return false
    })
}

async function updateLastuID() {
    return await LastuID.findOne({ uID: "100" }).then(async val => {
        return await LastuID.updateOne(
            {
                uID: "100"
            }, {
            $set: {
                lastuID: parseInt(val.lastuID) + 1
            }
        }).then((val, err) => {
            if (val)
                return true
            return false
        })
    })
}

async function fetchuserdetails(userID, Model) {
    return await Model.findOne({ userID: userID }).then(val => {
        return val
    })
}

async function updateSponsorsTeamData(userDict, Model) {
    await Model.updateOne(
        {
            userID: userDict.userID
        }, {
        $set: {
            team: parseInt(...userDict.team) + 1
        }
    })
}


async function recurseUpdateTeam(userDict, Model) {
    if (userDict.sponsorID === 'null') {
        return null
    } else {
        // Taking the sponsorID of the userDICt and update the team field
        const val = await fetchuserdetails(userDict.sponsorID, Model)
        await updateSponsorsTeamData(val, Model)
        // Same goes for the others till reached to null
        await recurseUpdateTeam(val, Model)
        return true
    }
}

async function updateSponsor(req, Model) {
    const check = await Model.findOne({ userID: req.body.sponsorID })
    return await Model.updateOne(
        {
            userID: req.body.sponsorID
        }, {
        $set: {
            connections: [...check.connections, {
                userID: req.body.userID
            }]
        }
    }).then((val, err) => {
        if (val)
            return true
        return false
    })
}

async function register(req, res, Model) {
    try {
        let userID = req.body.userID
        // The UserID should not exists
        const userExists = await Model.findOne({ userID: userID })
        if (userExists === null) {
            const uID = await getLastuID()
            // Registereing the user
            await Model.insertMany(
                {
                    ...req.body,
                    uID: parseFloat(uID.lastuID) + 1,
                }
            ).then(async (val, err) => {
                if (val) {
                    // Creating 0 income field
                    await createIncomes(userID).then(async val => {
                        if (val)
                            // Updating last uID
                            await updateLastuID().then(async val => {
                                if (val)
                                    // Update the user to the sponsor's collection
                                    await updateSponsor(req, Model).then(async val => {
                                        if (val)
                                            // Update the team number in the sponsors
                                            await recurseUpdateTeam(req.body, Model).then(val => {
                                                if (val)
                                                    res.json({ msg: true })
                                                else
                                                    throw new Error
                                            })
                                        else
                                            throw new Error
                                    })
                                else
                                    throw new Error

                            })
                        else
                            throw new Error
                    })
                } else {
                    throw new Error
                }
            })
        } else
            throw new Error
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: "Something went wrong !!!" })
    }
}

module.exports = { register }