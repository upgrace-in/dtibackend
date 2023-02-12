const { Mails } = require('../mongodb')
const fs = require("fs");
const ObjectID = require('mongodb').ObjectId;

async function fetchMail(req, res) {
    const inbox = await Mails.find({ to: req.query.userID })
    const sent = await Mails.find({ from: req.query.userID })
    res.send({ msg: true, response: { inbox, sent } })
}

async function saveMail(req, res) {

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


async function deleteMails(req, res) {
    // contains all the mails need to be deleted
    const data = req.body.data
    data.forEach(async element => {
        await Mails.deleteOne({ "_id": ObjectID(element) }).catch((err) => {
            console.log(err);
        })
    });
    res.send({ msg: true })
}


module.exports = { saveMail, fetchMail, deleteMails }