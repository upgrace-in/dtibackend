const { Mails } = require('../mongodb')
const fs = require("fs");

async function fetchMail(req, res) {
    const mails = await Mails.find({ to: req.query.userID })
    res.send({ msg: true, response: mails })
}

async function saveMail(req, res) {

    console.log(req.body);

    const document = {
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