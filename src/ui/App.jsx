import React from 'react';
import { createRoot } from 'react-dom/client';
import LoginForm from './LoginForm';
import './styles.css';

const App = () => {
    return (
        <div className="app">
            <div className="app-container">
                <header className="app-header">
                    <h1>🔐 Automation App</h1>
                    <p>Secure login for your automation process</p>
                </header>
                <LoginForm />
            </div>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

export default App;