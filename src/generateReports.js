const {
    Trades,
    DailyprofitLogs,
    DirectincomeLogs,
    DailyLevelLogs,
    LevelLogs,
    AdminFundLogs
} = require('../mongodb')

async function generateReports(req, res, filter) {
    try {
        let response;
        switch (req.query.reportType) {
            case 'trade':
                response = await Trades.find(filter)
                break;
            case 'dailyprofit':
                response = await DailyprofitLogs.find(filter)
                break;
            case 'directincome':
                response = await DirectincomeLogs.find(filter)
                break;
            case 'levelincome':
                response = await LevelLogs.find(filter)
                break;
            case 'dailylevelincome':
                response = await DailyLevelLogs.find(filter)
                break;
            case 'fundTransfer':
                response = await AdminFundLogs.find({ type: 'transferFund' })
                break;
            case 'fundDeduct':
                response = await AdminFundLogs.find({ type: 'deductFund' })
                break;
        }
        res.send({ msg: true, response: response })
    } catch (e) {
        res.send({ msg: false })
    }
}

module.exports = { generateReports }