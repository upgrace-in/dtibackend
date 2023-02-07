const { Users, Sessions } = require('../mongodb')
const crypto = require('crypto')

const parseIp = (req) =>
    req.headers['x-forwarded-for']?.split(',').shift()
    || req.socket?.remoteAddress

async function login(req, res) {
    try {
        const check = await Users.findOne({ userID: req.body.userID })
        if (check.password === req.body.password) {
            const userSession = { userID: check.userID, name: check.name, ipAdd: parseIp(req), is_admin: check.is_admin, sessionID: crypto.randomBytes(6).toString('hex') }
            await Sessions.updateOne({ userID: req.body.userID }, { $set: userSession }, { upsert: true });
            res.json({ msg: true, userSession: userSession })
        } else
            res.send({ msg: false, response: "Password doesn't matched !!!" })
    } catch (e) {
        console.log(e);
        res.send({ msg: false, response: "Invalid User !!!" })
    }
}

async function logout(req, res) {
    req.session.destroy();
    res.send({ msg: true });
}

module.exports = { login, logout }