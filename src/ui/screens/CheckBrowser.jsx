import React, { useState } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Plus, BarChart3 } from "lucide-react";

const CheckBrowser = () => {
    const [isChecking, setIsChecking] = useState(false);
    const [isCreatingWindow, setIsCreatingWindow] = useState(false);
    const [isMonitoringStats, setIsMonitoringStats] = useState(false);
    const [browserStatus, setBrowserStatus] = useState({
        isOpen: null,
        message: "Check browser status"
    });
    const [windowCreationResult, setWindowCreationResult] = useState(null);
    const [statistics, setStatistics] = useState(null);

    // Mock API functions that will call Electron's exposed API
    const checkBrowserStatus = async () => {
        return await window.electronAPI.checkStatus();
    };

    const createNewWindow = async () => {
        // This will be implemented when you add the create-window IPC handler
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: "New browser window created successfully"
                });
            }, 1000);
        });
    };

    const getBrowserStatistics = async () => {
        // This will be implemented when you add the get-statistics IPC handler
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        browser: {
                            total_memory_mb: 245.76,
                            total_cpu_percent: 12.5,
                            child_processes: 8
                        },
                        total_tabs: 3,
                        tabs: [
                            {
                                tab_id: "1",
                                tab_index: 0,
                                url: "https://example.com",
                                title: "Example Domain",
                                metrics: {
                                    memory_mb: 45.2,
                                    allocated_mb: 64.0
                                },
                                status: "success"
                            },
                            {
                                tab_id: "2",
                                tab_index: 1,
                                url: "https://google.com",
                                title: "Google",
                                metrics: {
                                    memory_mb: 67.8,
                                    allocated_mb: 85.0
                                },
                                status: "success"
                            },
                            {
                                tab_id: "3",
                                tab_index: 2,
                                url: "https://github.com",
                                title: "GitHub",
                                metrics: {
                                    memory_mb: 52.1,
                                    allocated_mb: 70.0
                                },
                                status: "success"
                            }
                        ]
                    },
                    message: "Statistics retrieved successfully"
                });
            }, 1000);
        });
    };

    const handleCheckBrowser = async () => {
        setIsChecking(true);
        setWindowCreationResult(null);
        setStatistics(null);
        setBrowserStatus({
            isOpen: null,
            message: "Checking browser status..."
        });

        const result = await checkBrowserStatus();
        console.log("Browser status result:", result);

        setBrowserStatus({
            isOpen: result.browserOpen,
            message: result.message,
            error: result.error
        });

        setIsChecking(false);
    };

    const handleCreateNewWindow = async () => {
        setIsCreatingWindow(true);
        setWindowCreationResult(null);

        try {
            const result = await createNewWindow();
            console.log("New window creation result:", result);

            setWindowCreationResult({
                success: true,
                message: result.message || "New browser window created successfully",
            });
        } catch (err) {
            setWindowCreationResult({
                success: false,
                message: "Failed to create new browser window",
                error: err.message || "Unknown error occurred"
            });
        } finally {
            setIsCreatingWindow(false);
        }
    };

    const handleMonitorStatistics = async () => {
        setIsMonitoringStats(true);
        setStatistics(null);

        try {
            const result = await getBrowserStatistics();
            console.log("Browser statistics result:", result);

            setStatistics({
                success: true,
                data: result.data,
                message: result.message || "Statistics retrieved successfully"
            });
        } catch (err) {
            setStatistics({
                success: false,
                data: null,
                message: "Failed to fetch browser statistics",
                error: err.message || "Unknown error occurred"
            });
        } finally {
            setIsMonitoringStats(false);
        }
    };

    const getStatusIcon = () => {
        if (browserStatus.isOpen === true) {
            if (browserStatus.status === 'NOT_LOGGED_IN') {
                return <AlertCircle className="w-8 h-8 text-orange-500" />;
            }
            return <CheckCircle className="w-8 h-8 text-green-600" />;
        } else if (browserStatus.isOpen === false) {
            return browserStatus.error ? (
                <AlertCircle className="w-8 h-8 text-orange-500" />
            ) : (
                <XCircle className="w-8 h-8 text-red-600" />
            );
        }
        return <RefreshCw className="w-8 h-8 text-gray-400" />;
    };

    const getStatusColor = () => {
        if (browserStatus.isOpen === true) {
            if (browserStatus.status === 'NOT_LOGGED_IN') {
                return "text-orange-500";
            }
            return "text-green-600";
        }
        if (browserStatus.isOpen === false) {
            return browserStatus.error ? "text-orange-500" : "text-red-600";
        }
        return "text-gray-400";
    };

    const getStatusText = () => {
        if (browserStatus.isOpen === true) {
            if (browserStatus.status === 'NOT_LOGGED_IN') {
                return "Browser Open - Not Logged In";
            }
            return "Browser is Open & Logged In";
        }
        if (browserStatus.isOpen === false) {
            return browserStatus.error ? "Browser Issue" : "Browser is Closed";
        }
        return "Check Browser Status";
    };

    const formatMemory = (mb) => {
        return `${mb.toFixed(2)} MB`;
    };

    const formatCPU = (percent) => {
        return `${percent.toFixed(1)}%`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">🌐 Check Browser</h1>
                    <p className="text-gray-600">Check browser status and monitor resource usage</p>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="text-center">
                        {/* Status Icon */}
                        <div className="mb-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                {getStatusIcon()}
                            </div>
                        </div>

                        {/* Status Text */}
                        <h2 className={`text-2xl font-bold mb-2 ${getStatusColor()}`}>
                            {getStatusText()}
                        </h2>

                        {/* Status Message */}
                        <p className="text-gray-600 mb-4">
                            {browserStatus.message}
                        </p>

                        {/* Error Display */}
                        {browserStatus.error && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                <div className="flex items-center gap-2 justify-center">
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                    <span className="text-orange-700 text-sm">{browserStatus.error}</span>
                                </div>
                            </div>
                        )}

                        {/* Window Creation Result */}
                        {windowCreationResult && (
                            <div className={`border rounded-lg p-3 mb-4 ${windowCreationResult.success
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                                }`}>
                                <div className="flex items-center gap-2 justify-center">
                                    {windowCreationResult.success ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className={
                                        windowCreationResult.success
                                            ? "text-green-700 text-sm"
                                            : "text-red-700 text-sm"
                                    }>
                                        {windowCreationResult.message}
                                    </span>
                                </div>
                                {windowCreationResult.error && (
                                    <p className="text-red-600 text-xs mt-1">
                                        {windowCreationResult.error}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Detailed Status Info */}
                        {browserStatus.isOpen !== null && (
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <div className="text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Browser:</span>
                                        <span className={
                                            browserStatus.isOpen
                                                ? (browserStatus.status === 'NOT_LOGGED_IN' ? "text-orange-600 font-medium" : "text-green-600 font-medium")
                                                : "text-red-600 font-medium"
                                        }>
                                            {browserStatus.isOpen ? "Open" : "Closed"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span>Authentication:</span>
                                        <span className={
                                            browserStatus.status === 'SUCCESS'
                                                ? "text-green-600 font-medium"
                                                : browserStatus.status === 'NOT_LOGGED_IN'
                                                    ? "text-orange-600 font-medium"
                                                    : "text-red-600 font-medium"
                                        }>
                                            {browserStatus.status === 'SUCCESS'
                                                ? "Logged In"
                                                : browserStatus.status === 'NOT_LOGGED_IN'
                                                    ? "Not Logged In"
                                                    : "Not Authenticated"
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            {/* Check Button */}
                            <button
                                onClick={handleCheckBrowser}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                                {isChecking ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                {isChecking ? "Checking..." : "Check Status"}
                            </button>

                            {/* Create New Window Button */}
                            <button
                                onClick={handleCreateNewWindow}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                                {isCreatingWindow ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                                {isCreatingWindow ? "Creating..." : "New Window"}
                            </button>

                            {/* Monitor Statistics Button */}
                            <button
                                onClick={handleMonitorStatistics}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                                {isMonitoringStats ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <BarChart3 className="w-4 h-4" />
                                )}
                                {isMonitoringStats ? "Loading..." : "Monitor Stats"}
                            </button>
                        </div>

                        {/* Additional Info */}
                        <p className="text-xs text-gray-500">
                            All buttons are always available. You can try any action at any time.
                        </p>
                    </div>
                </div>

                {/* Statistics Display */}
                {statistics && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Browser Statistics
                            </h3>

                            {statistics.success ? (
                                <>
                                    {/* Browser Process Metrics */}
                                    <div className="mb-6">
                                        <h4 className="text-lg font-semibold text-gray-700 mb-3">Browser Process</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-blue-50 rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {formatMemory(statistics.data.browser.total_memory_mb)}
                                                </div>
                                                <div className="text-sm text-blue-800">Total Memory</div>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {formatCPU(statistics.data.browser.total_cpu_percent)}
                                                </div>
                                                <div className="text-sm text-green-800">CPU Usage</div>
                                            </div>
                                            <div className="bg-purple-50 rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {statistics.data.browser.child_processes}
                                                </div>
                                                <div className="text-sm text-purple-800">Child Processes</div>
                                            </div>
                                            <div className="bg-orange-50 rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold text-orange-600">
                                                    {statistics.data.total_tabs}
                                                </div>
                                                <div className="text-sm text-orange-800">Open Tabs</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabs Table */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-700 mb-3">Open Tabs</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse border border-gray-200">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="border border-gray-200 px-4 py-2 text-left">Tab</th>
                                                        <th className="border border-gray-200 px-4 py-2 text-left">URL</th>
                                                        <th className="border border-gray-200 px-4 py-2 text-center">Memory Used</th>
                                                        <th className="border border-gray-200 px-4 py-2 text-center">Memory Allocated</th>
                                                        <th className="border border-gray-200 px-4 py-2 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {statistics.data.tabs.map((tab, index) => (
                                                        <tr key={tab.tab_id} className="hover:bg-gray-50">
                                                            <td className="border border-gray-200 px-4 py-2 font-medium">
                                                                Tab {tab.tab_index + 1}
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-2">
                                                                <div className="max-w-xs truncate" title={tab.url}>
                                                                    {tab.url}
                                                                </div>
                                                                <div className="text-sm text-gray-500">{tab.title}</div>
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-2 text-center">
                                                                <span className="font-mono text-blue-600">
                                                                    {formatMemory(tab.metrics.memory_mb)}
                                                                </span>
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-2 text-center">
                                                                <span className="font-mono text-green-600">
                                                                    {formatMemory(tab.metrics.allocated_mb)}
                                                                </span>
                                                            </td>
                                                            <td className="border border-gray-200 px-4 py-2 text-center">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tab.status === 'success'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {tab.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                    <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                                    <p className="text-red-700">{statistics.message}</p>
                                    {statistics.error && (
                                        <p className="text-red-600 text-sm mt-1">{statistics.error}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckBrowser;