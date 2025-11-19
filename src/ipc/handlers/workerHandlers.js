const pythonAPI = require('../../services/python/PythonAPI');

const workerHandlers = {
    async handlePing() {
        try {
            const result = await pythonAPI.auth.ping();
            return { status: 'SUCCESS', result };
        } catch (error) {
            console.error('[MAIN] Ping error:', error);
            return { status: 'ERROR', error: error.message };
        }
    },

    async handleWorkerStatus() {
        try {
            const isReady = pythonAPI.isReady();
            return { status: 'SUCCESS', isReady };
        } catch (error) {
            console.error('[MAIN] Worker status error:', error);
            return { status: 'ERROR', error: error.message };
        }
    }
};

module.exports = workerHandlers;