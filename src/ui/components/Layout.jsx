import React from 'react';
import Sidebar from './Sidebar';

// In src/components/Layout.js
const Layout = ({ children, currentView, onViewChange }) => {
    return (
        <div className="flex h-screen bg-gray-50"> {/* Simple background */}
            {/* Sidebar */}
            <Sidebar currentView={currentView} onViewChange={onViewChange} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {getViewTitle(currentView)}
                        </h1>
                    </div>
                </header>

                {/* Page Content - Remove any conflicting backgrounds */}
                <main className="flex-1 overflow-auto p-6 bg-transparent">
                    {children}
                </main>
            </div>
        </div>
    );
};

// Helper function to get view titles
const getViewTitle = (view) => {
    const titles = {
        login: 'Authentication',
        dashboard: 'Dashboard',
        automation: 'Automation Control',
        settings: 'Settings'
    };
    return titles[view] || 'AutoBot';
};

export default Layout;