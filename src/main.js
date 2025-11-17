const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const pythonWorker = require('./services/PythonWorkerService');

let mainWindow;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png'), // optional
        show: false // Don't show until ready
    });

    // In development: load from React dev server
    // In production: load from built HTML file
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle window being closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

ipcMain.handle('login', async (event, credentials) => {
    try {
        console.log('[MAIN] Received login request:', credentials.email);

        const result = await pythonWorker.login(credentials.email, credentials.password);

        if (result.status === 'OTP_REQUIRED') {
            return { status: 'OTP_REQUIRED', message: 'Please enter OTP' };
        } else if (result.status === 'SUCCESS') {
            return { status: 'SUCCESS', message: 'Login successful' };
        } else {
            return { status: 'ERROR', error: result.error || 'Login failed' };
        }
    } catch (error) {
        console.error('[MAIN] Login error:', error);
        return { status: 'ERROR', error: error.message };
    }
});

// Handle OTP from React
ipcMain.handle('submit-otp', async (event, otp) => {
    try {
        console.log('[MAIN] Received OTP:', otp);

        const result = await pythonWorker.submitOtp(otp);

        if (result.status === 'SUCCESS') {
            return { status: 'SUCCESS', message: 'Authentication complete' };
        } else {
            return { status: 'ERROR', error: result.error || 'OTP verification failed' };
        }
    } catch (error) {
        console.error('[MAIN] OTP error:', error);
        return { status: 'ERROR', error: error.message };
    }
});

// Electron app event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
    });
});