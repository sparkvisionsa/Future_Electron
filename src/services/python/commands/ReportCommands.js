class ReportCommands {
    constructor(workerService) {
        if (!workerService) {
            throw new Error('WorkerService is required');
        }
        this.worker = workerService;
    }

    async _sendCommand(command) {
        return await this.worker.sendCommand(command);
    }

    async validateReport(reportId) {
        return this._sendCommand({
            action: 'validate-report',
            reportId
        });
    }

    async createMacros(reportId, macroCount, tabsNum, batchSize) {
        return this._sendCommand({
            action: 'create-macros',
            reportId,
            macroCount,
            tabsNum,
            batchSize
        });
    }

    async grabMacroIds(reportId, tabsNum) {
        return this._sendCommand({
            action: 'grab-macro-ids',
            reportId,
            tabsNum
        });
    }
}

module.exports = ReportCommands;