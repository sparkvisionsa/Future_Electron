const workerHandlers = require('./workerHandlers');

const authHandlers = require('./authHandlers');
const reportHandlers = require('./reportHandlers');
const healthHandlers = require('./healthHandlers');

module.exports = {
    authHandlers,
    workerHandlers,
    reportHandlers,
    healthHandlers
};