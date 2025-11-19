const PythonWorkerService = require('./PythonWorkerService');
const AuthCommands = require('./commands/AuthCommands');

class PythonAPI {
    constructor() {
        this.workerService = new PythonWorkerService();
        this.auth = new AuthCommands(this.workerService);
    }

    async startWorker() {
        return await this.workerService.startWorker();
    }

    async closeWorker() {
        return await this.workerService.closeWorker();
    }

    isReady() {
        return this.workerService.isReady();
    }

    // Direct command access if needed
    async sendCommand(command) {
        return await this.workerService.sendCommand(command);
    }
}

// Create and export singleton instance
const pythonAPI = new PythonAPI();
module.exports = pythonAPI;