const { Mails } = require('../mongodb')
const fs = require("fs");

async function fetchMail(req, res) {
    const inbox = await Mails.find({ to: req.query.userID })
    const sent = await Mails.find({ from: req.query.userID })
    res.send({ msg: true, response: { inbox, sent } })
}

async function saveMail(req, res) {

    console.log(req.body);

    const document = {
        from: req.body.userSession.userID,
        to: req.body.data.to,
        subject: req.body.data.subject,
        msg: req.body.data.msg,
        attachments: [],
    };

    await Mails.insertMany(document, (err) => {
        if (err) throw err;
        res.send({ msg: true })
    });
}

module.exports = { saveMail, fetchMail }