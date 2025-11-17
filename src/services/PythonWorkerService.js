const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class PythonWorkerService {
    constructor() {
        this.worker = null;
        this.stdoutBuffer = '';
        this.pendingCommands = new Map();
        this.commandId = 0;
        this.isWorkerReady = false;
    }

    getPythonExecutable() {
        const projectRoot = path.join(__dirname, '../..');

        if (process.platform === 'win32') {
            // Windows virtual environment path
            const venvPath = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
            if (fs.existsSync(venvPath)) {
                return venvPath;
            }
            // Fallback to system Python
            return 'python';
        } else {
            // Linux/Mac virtual environment path
            const venvPath = path.join(projectRoot, '.venv', 'bin', 'python');
            if (fs.existsSync(venvPath)) {
                return venvPath;
            }
            // Fallback to system Python
            return 'python3';
        }
    }

    startWorker() {
        if (this.worker && !this.worker.killed) {
            console.log('[PY] Worker already running');
            return this.worker;
        }

        const pythonExecutable = this.getPythonExecutable();
        const scriptPath = path.join(__dirname, '../scripts/worker.py');

        console.log(`[PY] Starting worker: ${pythonExecutable} ${scriptPath}`);
        console.log(`[PY] Python executable exists: ${fs.existsSync(pythonExecutable)}`);
        console.log(`[PY] Script exists: ${fs.existsSync(scriptPath)}`);

        this.worker = spawn(pythonExecutable, [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(scriptPath) // Set working directory to script location
        });

        this.stdoutBuffer = '';
        this.isWorkerReady = false;

        this.worker.stdout.on('data', (data) => {
            this.stdoutBuffer += data.toString();
            const lines = this.stdoutBuffer.split(/\r?\n/);
            this.stdoutBuffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                this.handleWorkerOutput(line);
            }
        });

        this.worker.stderr.on('data', (data) => {
            console.log(`[PY STDERR] ${data.toString().trim()}`);
        });

        this.worker.on('spawn', () => {
            console.log('[PY] Worker process spawned');
            this.isWorkerReady = true;
        });

        this.worker.on('close', (code, signal) => {
            console.log(`[PY] Worker exited (code=${code}, signal=${signal})`);
            this.isWorkerReady = false;
            this.worker = null;

            // Reject all pending commands
            this.pendingCommands.forEach((handler) => {
                handler.reject(new Error(`Worker exited with code ${code}`));
            });
            this.pendingCommands.clear();
        });

        this.worker.on('error', (error) => {
            console.error('[PY] Worker error:', error);
            this.isWorkerReady = false;
        });

        return this.worker;
    }

    handleWorkerOutput(line) {
        try {
            const response = JSON.parse(line);
            console.log('[PY] Response:', response);

            // Handle command responses
            if (response.commandId !== undefined) {
                const handler = this.pendingCommands.get(response.commandId);
                if (handler) {
                    if (response.status === 'SUCCESS' ||
                        response.status === 'OTP_REQUIRED' ||
                        response.status === 'LOGIN_SUCCESS' ||
                        response.status === 'NOT_FOUND') {
                        handler.resolve(response);
                    } else {
                        handler.reject(new Error(response.error || 'Command failed'));
                    }
                    this.pendingCommands.delete(response.commandId);
                }
            }

        } catch (error) {
            console.error('[PY] Failed to parse worker output:', line, error);
        }
    }

    async sendCommand(command) {
        if (!this.worker || !this.isWorkerReady) {
            this.startWorker();
            // Wait for worker to be ready
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const commandId = this.commandId++;
        const commandWithId = { ...command, commandId };

        return new Promise((resolve, reject) => {
            this.pendingCommands.set(commandId, { resolve, reject });

            try {
                this.worker.stdin.write(JSON.stringify(commandWithId) + '\n');
                console.log(`[PY] Sent command: ${command.action} (id: ${commandId})`);
            } catch (error) {
                this.pendingCommands.delete(commandId);
                reject(new Error(`Failed to send command to worker: ${error.message}`));
            }
        });
    }

    async login(email, password) {
        return this.sendCommand({
            action: 'login',
            email,
            password
        });
    }

    async submitOtp(otp) {
        return this.sendCommand({
            action: 'otp',
            otp
        });
    }

    async ping() {
        return this.sendCommand({
            action: 'ping'
        });
    }

    async closeWorker() {
        if (!this.worker) return;

        try {
            await this.sendCommand({ action: 'close' });
        } catch (error) {
            console.log('[PY] Close command failed, forcing shutdown:', error.message);
        } finally {
            if (this.worker) {
                this.worker.kill('SIGTERM');
                this.worker = null;
                this.isWorkerReady = false;
            }
        }
    }

    isReady() {
        return this.isWorkerReady && this.worker && !this.worker.killed;
    }
}

const pythonWorker = new PythonWorkerService();
module.exports = pythonWorker;