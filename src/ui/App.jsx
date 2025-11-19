import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import LoginForm from './screens/LoginForm';
import './index.css'; // Add this line

// Placeholder components for other views
const Dashboard = () => (
    <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
        <p className="text-gray-600">Your automation dashboard will appear here.</p>
    </div>
);

const Automation = () => (
    <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Automation Control</h2>
        <p className="text-gray-600">Automation controls will appear here.</p>
    </div>
);

const Settings = () => (
    <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        <p className="text-gray-600">Application settings will appear here.</p>
    </div>
);

const App = () => {
    const [currentView, setCurrentView] = useState('login');

    const renderCurrentView = () => {
        switch (currentView) {
            case 'login':
                return <LoginForm />;
            case 'dashboard':
                return <Dashboard />;
            case 'automation':
                return <Automation />;
            case 'settings':
                return <Settings />;
            default:
                return <LoginForm />;
        }
    };

    return (
        <Layout currentView={currentView} onViewChange={setCurrentView}>
            {renderCurrentView()}
        </Layout>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

export default App;