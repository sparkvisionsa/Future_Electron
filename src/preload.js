const { contextBridge, ipcRenderer } = require('electron');

function safeInvoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    versions: process.versions,

    // Auth
    login: (credentials) => safeInvoke('login', credentials),
    submitOtp: (otp) => safeInvoke('submit-otp', otp),
    checkStatus: () => safeInvoke('check-status'),

    // Reports
    validateReport: (reportId) => safeInvoke('validate-report', reportId),

    // Health
    checkHealth: () => safeInvoke('check-server-health')
});
