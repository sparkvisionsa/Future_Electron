import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import LoginForm from './screens/LoginForm';
import CheckBrowser from './screens/CheckBrowser';
import './index.css'; // Add this line



const App = () => {
    const [currentView, setCurrentView] = useState('login');

    const renderCurrentView = () => {
        switch (currentView) {
            case 'login':
                return <LoginForm />;
            case 'check-status':
                return <CheckBrowser />;
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