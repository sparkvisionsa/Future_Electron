const { ipcMain } = require('electron');
const { authHandlers, reportHandlers, workerHandlers, healthHandlers } = require('./handlers');

function registerIpcHandlers() {
    // Auth handlers
    ipcMain.handle('login', authHandlers.handleLogin);
    ipcMain.handle('submit-otp', authHandlers.handleSubmitOtp);
    ipcMain.handle('check-status', authHandlers.handleCheckStatus);

    // Report handlers
    ipcMain.handle('validate-report', reportHandlers.handleValidateReport);

    // Worker handlers
    ipcMain.handle('ping-worker', workerHandlers.handlePing);
    ipcMain.handle('worker-status', workerHandlers.handleWorkerStatus);

    //Health handlers
    ipcMain.handle('check-server-health', healthHandlers.handleHealth);

    console.log('[IPC] All handlers registered');
}

function unregisterIpcHandlers() {
    // Remove all IPC handlers to prevent memory leaks
    ipcMain.removeAllListeners('login');
    ipcMain.removeAllListeners('submit-otp');
    ipcMain.removeAllListeners('check-status');

    ipcMain.removeAllListeners('ping-worker');
    ipcMain.removeAllListeners('worker-status');

    ipcMain.removeAllListeners('validate-report');

    ipcMain.removeAllListeners('check-server-health');

    console.log('[IPC] All handlers unregistered');
}

module.exports = {
    registerIpcHandlers,
    unregisterIpcHandlers
};