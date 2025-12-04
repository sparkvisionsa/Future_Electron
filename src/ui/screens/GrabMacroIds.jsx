import React, { useState } from "react";
import {
    Download,
    CheckCircle,
    ArrowLeft,
    FileText,
    RefreshCw,
    List,
    Database,
    RotateCcw,
    Search // Added for check missing pages icon
} from "lucide-react";

import { checkMissingPages } from "../../api/report";

const GrabMacroIds = () => {
    // Step management
    const [currentStep, setCurrentStep] = useState('report-id-input');

    // Report ID state
    const [reportId, setReportId] = useState("");
    const [tabsNum, setTabsNum] = useState("1");

    // Error state
    const [error, setError] = useState("");
    const [missingPagesInfo, setMissingPagesInfo] = useState(null);

    // Grabbing state
    const [isGrabbingMacros, setIsGrabbingMacros] = useState(false);
    const [isRetryingMacros, setIsRetryingMacros] = useState(false);
    const [isCheckingMissingPages, setIsCheckingMissingPages] = useState(false);
    const [grabResult, setGrabResult] = useState(null);
    const [macroIds, setMacroIds] = useState([]);

    // Handle macro IDs grabbing using Electron IPC
    const handleGrabMacroIds = async () => {
        if (!reportId.trim()) {
            setError("Please enter a report ID");
            return;
        }

        const tabsNumValue = parseInt(tabsNum);
        if (isNaN(tabsNumValue) || tabsNumValue < 1) {
            setError("Please enter a valid number of tabs (minimum 1)");
            return;
        }

        setError("");
        setMissingPagesInfo(null);
        setIsGrabbingMacros(true);
        setCurrentStep('grabbing-in-progress');

        try {
            console.log(`Grabbing macro IDs for report: ${reportId} with tabs: ${tabsNumValue}`);

            // Use Electron IPC instead of API call
            const result = await window.electronAPI.grabMacroIds(reportId, tabsNumValue);
            console.log("Macro IDs grab result:", result);

            setGrabResult(result);

            if (result.status == "SUCCESS") {
                const ids = result?.macro_ids_with_pages || [];
                setMacroIds(Array.isArray(ids) ? ids : []);
                setCurrentStep('success');
            } else {
                setError(result.error || 'Failed to grab macro IDs');
                setCurrentStep('error');
            }
        } catch (err) {
            console.error("Error grabbing macro IDs:", err);
            setError(err.message || 'An unexpected error occurred while grabbing macro IDs');
            setCurrentStep('error');
        } finally {
            setIsGrabbingMacros(false);
        }
    };

    // Handle retry macro IDs grabbing using Electron IPC
    const handleRetryGrabMacroIds = async () => {
        if (!reportId.trim()) {
            setError("Please enter a report ID");
            return;
        }

        const tabsNumValue = parseInt(tabsNum);
        if (isNaN(tabsNumValue) || tabsNumValue < 1) {
            setError("Please enter a valid number of tabs (minimum 1)");
            return;
        }

        setError("");
        setMissingPagesInfo(null);
        setIsRetryingMacros(true);
        setCurrentStep('grabbing-in-progress');

        try {
            console.log(`Retrying grab macro IDs for report: ${reportId} with tabs: ${tabsNumValue}`);

            // Use Electron IPC retry endpoint
            const result = await window.electronAPI.retryMacroIds(reportId, tabsNumValue);
            console.log("Retry macro IDs result:", result);

            setGrabResult(result);

            if (result.status == "SUCCESS") {
                const ids = result?.macro_ids_with_pages || [];
                setMacroIds(Array.isArray(ids) ? ids : []);
                setCurrentStep('success');
            } else {
                setError(result.error || 'Failed to retry grabbing macro IDs');
                setCurrentStep('error');
            }
        } catch (err) {
            console.error("Error retrying macro IDs:", err);
            setError(err.message || 'An unexpected error occurred while retrying macro IDs');
            setCurrentStep('error');
        } finally {
            setIsRetryingMacros(false);
        }
    };

    // Handle check missing pages
    const handleCheckMissingPages = async () => {
        if (!reportId.trim()) {
            setError("Please enter a report ID");
            return;
        }

        setError("");
        setIsCheckingMissingPages(true);

        try {
            console.log(`Checking missing pages for report: ${reportId}`);

            // Call the API function
            const result = await checkMissingPages(reportId);
            console.log("Missing pages check result:", result);

            setMissingPagesInfo(result.data);

            // Show success message
            if (result.data.success) {
                if (result.data.hasMissing) {
                    setError(`Missing pages detected: ${result.data.missingPages.join(', ')}`);
                } else {
                    setError("No missing pages found! All pages are present.");
                }
            } else {
                setError("Failed to check missing pages");
            }
        } catch (err) {
            console.error("Error checking missing pages:", err);
            setError(err.message || 'An unexpected error occurred while checking missing pages');
        } finally {
            setIsCheckingMissingPages(false);
        }
    };

    // Reset process
    const resetProcess = () => {
        setCurrentStep('report-id-input');
        setReportId("");
        setTabsNum("1");
        setError("");
        setIsGrabbingMacros(false);
        setIsRetryingMacros(false);
        setIsCheckingMissingPages(false);
        setGrabResult(null);
        setMacroIds([]);
        setMissingPagesInfo(null);
    };

    // Handle back button
    const handleBack = () => {
        window.history.back();
    };

    // Handle navigation to other pages
    const handleViewReports = () => {
        // You can use window.location or other navigation method here
        console.log("Navigate to view reports");
    };

    const handleGoHome = () => {
        // You can use window.location or other navigation method here
        console.log("Navigate to home");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 mx-auto transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 Grab Macro IDs</h1>
                    <p className="text-gray-600">Extract macro IDs from an existing report</p>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    {/* Step 1: Report ID Input */}
                    {currentStep === 'report-id-input' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <List className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Enter Report Details</h2>
                                    <p className="text-gray-600">Provide the report ID and number of tabs to extract macro IDs from</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Report ID Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Report ID *
                                        </label>
                                        <input
                                            type="text"
                                            value={reportId}
                                            onChange={(e) => {
                                                setReportId(e.target.value);
                                                setError("");
                                                setMissingPagesInfo(null);
                                            }}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="Enter report ID"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            The ID of the report to extract macro IDs from
                                        </p>
                                    </div>

                                    {/* Tabs Number Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Number of Tabs *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={tabsNum}
                                            onChange={(e) => {
                                                setTabsNum(e.target.value);
                                                setError("");
                                                setMissingPagesInfo(null);
                                            }}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="Enter number of tabs"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Number of tabs in the report (minimum: 1)
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                    <button
                                        onClick={handleGrabMacroIds}
                                        disabled={!reportId.trim() || !tabsNum.trim() || isGrabbingMacros || isRetryingMacros || isCheckingMissingPages}
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        {isGrabbingMacros ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        {isGrabbingMacros ? "Grabbing..." : "Grab Macro IDs"}
                                    </button>

                                    <button
                                        onClick={handleRetryGrabMacroIds}
                                        disabled={!reportId.trim() || !tabsNum.trim() || isGrabbingMacros || isRetryingMacros || isCheckingMissingPages}
                                        className="px-8 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        {isRetryingMacros ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RotateCcw className="w-4 h-4" />
                                        )}
                                        {isRetryingMacros ? "Retrying..." : "Retry Grab"}
                                    </button>

                                    <button
                                        onClick={handleCheckMissingPages}
                                        disabled={!reportId.trim() || isGrabbingMacros || isRetryingMacros || isCheckingMissingPages}
                                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        {isCheckingMissingPages ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Search className="w-4 h-4" />
                                        )}
                                        {isCheckingMissingPages ? "Checking..." : "Check Missing Pages"}
                                    </button>
                                </div>

                                {/* Error and Missing Pages Info Display */}
                                {error && (
                                    <div className={`rounded-lg p-4 ${error.includes("No missing pages found") ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                        <div className="flex items-center gap-3">
                                            {error.includes("No missing pages found") ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <FileText className="w-5 h-5 text-red-500" />
                                            )}
                                            <span className={error.includes("No missing pages found") ? "text-green-700" : "text-red-700"}>{error}</span>
                                        </div>

                                        {/* Display missing pages details if available */}
                                        {missingPagesInfo?.hasMissing && missingPagesInfo.missingPages.length > 0 && (
                                            <div className="mt-3 pl-8">
                                                <p className="text-sm font-medium text-gray-700 mb-1">Missing Pages:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {missingPagesInfo.missingPages.map((page, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium"
                                                        >
                                                            Page {page}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Information Box */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-3">
                                        <Database className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium text-blue-800">What this does:</p>
                                            <p className="text-sm text-blue-600">
                                                Extracts all macro IDs from the specified report and displays them in a list format for easy copying or downloading.
                                                The number of tabs helps determine how many sections to process in the report.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Grabbing In Progress */}
                    {currentStep === 'grabbing-in-progress' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <RefreshCw className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Grabbing Macro IDs</h2>
                                    <p className="text-gray-600">Please wait while we extract macro IDs from the report...</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                                <h3 className="text-xl font-semibold text-blue-800 mb-2">Extracting Macro IDs</h3>
                                <p className="text-blue-600 mb-4">
                                    Please wait while we extract macro IDs from report <strong>{reportId}</strong> with <strong>{tabsNum}</strong> tab{tabsNum !== "1" ? 's' : ''}.
                                </p>
                                <p className="text-sm text-blue-500">
                                    Processing report data...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {currentStep === 'success' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Success!</h2>
                                    <p className="text-gray-600">Macro IDs have been extracted successfully</p>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-green-800 mb-2">Macro IDs Extracted Successfully!</h3>
                                    <p className="text-green-600">Found <strong>{macroIds.length}</strong> macro ID{macroIds.length !== 1 ? 's' : ''}</p>
                                </div>

                                {/* Macro IDs List */}
                                {macroIds.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                                            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-200 mb-2">
                                                <div className="col-span-1">#</div>
                                                <div className="col-span-8">Macro ID</div>
                                                <div className="col-span-3">Page</div>
                                            </div>
                                            <div className="space-y-1">
                                                {macroIds.map((macroData, index) => {
                                                    const [macroId, pageNumber] = macroData;
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="grid grid-cols-12 gap-2 items-center p-2 bg-white rounded border border-gray-200"
                                                        >
                                                            <div className="col-span-1 text-xs text-gray-500 text-center">
                                                                {index + 1}
                                                            </div>
                                                            <div className="col-span-8">
                                                                <code className="text-sm font-mono text-gray-800 break-all">
                                                                    {macroId}
                                                                </code>
                                                            </div>
                                                            <div className="col-span-3 text-sm text-gray-600 text-center">
                                                                Page {pageNumber}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                        <p className="text-yellow-700">
                                            No macro IDs found in report <strong>{reportId}</strong>
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                                    <button
                                        onClick={handleViewReports}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        View Reports
                                    </button>
                                    <button
                                        onClick={resetProcess}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        Grab More Macro IDs
                                    </button>
                                    <button
                                        onClick={handleGoHome}
                                        className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-semibold transition-colors"
                                    >
                                        Go Home
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {currentStep === 'error' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Error</h2>
                                    <p className="text-gray-600">There was an issue extracting macro IDs</p>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-red-800 mb-2">Failed to Extract Macro IDs</h3>
                                <p className="text-red-600 mb-4">{error}</p>

                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={() => setCurrentStep('report-id-input')}
                                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        Try Again
                                    </button>
                                    <button
                                        onClick={resetProcess}
                                        className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-semibold transition-colors"
                                    >
                                        Start Over
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GrabMacroIds;