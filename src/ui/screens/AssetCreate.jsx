import React, { useState } from "react";
import {
    Search,
    CheckCircle,
    ArrowLeft,
    FileText,
    RefreshCw,
    Plus,
    Hash,
    Play,
    Database,
    FileCheck
} from "lucide-react";

// Import your API functions
import { reportExistenceCheck } from "../../api/report"; // Adjust the import path as needed

const AssetCreate = () => {
    // Form state
    const [reportId, setReportId] = useState("");
    const [tabsInput, setTabsInput] = useState("");
    const [assetCount, setAssetCount] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [creationResult, setCreationResult] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Report validation state
    const [isCheckingReport, setIsCheckingReport] = useState(false);
    const [isCheckingDB, setIsCheckingDB] = useState(false);
    const [reportExists, setReportExists] = useState(null);
    const [dbCheckResult, setDbCheckResult] = useState(null);

    // Separate error states for each button
    const [taqeemError, setTaqeemError] = useState("");
    const [dbError, setDbError] = useState("");

    // Check if form is valid
    const isFormValid = reportId.trim() && tabsInput.trim() && assetCount.trim();
    const canCreateAssets = isFormValid && (reportExists === true || dbCheckResult?.success === true);

    // Handle report validation in Taqeem - matching ValidateReport component
    const handleCheckReportInTaqeem = async () => {
        if (!reportId.trim()) {
            setTaqeemError("Please enter a report ID");
            return;
        }

        setIsCheckingReport(true);
        setTaqeemError("");
        setReportExists(null);
        setDbCheckResult(null); // Clear DB result when checking Taqeem

        try {
            const result = await window.electronAPI.validateReport(reportId);
            console.log("Full API response:", result);

            // Handle the IPC response exactly like ValidateReport component
            if (result.status === "SUCCESS") {
                setReportExists(true);
                setTaqeemError("");
            } else {
                setReportExists(false);
                setTaqeemError(result.message || "Report validation failed. Please check the ID and try again.");
            }
        } catch (err) {
            console.error("Error checking report:", err);
            setReportExists(false);
            setTaqeemError(err.message || "Error validating report. Please try again.");
        } finally {
            setIsCheckingReport(false);
        }
    };

    // NEW: Handle report existence check in Database - Direct API call
    const handleCheckReportInDB = async () => {
        if (!reportId.trim()) {
            setDbError("Please enter a report ID");
            return;
        }

        setIsCheckingDB(true);
        setDbError("");
        setDbCheckResult(null);
        setReportExists(null); // Clear Taqeem result when checking DB

        try {
            console.log(`Checking report existence in DB: ${reportId}`);

            // Direct API call to your backend
            const result = await reportExistenceCheck(reportId);
            console.log("DB check result:", result);

            setDbCheckResult(result.data);

            if (result.data.success) {
                setDbError("");
            } else {
                setDbError(result.data.message || "Report not found in database. Please check the ID and try again.");
            }
        } catch (err) {
            console.error("Error checking report in DB:", err);
            setDbError(err.message || "Error checking report in database. Please try again.");
        } finally {
            setIsCheckingDB(false);
        }
    };

    // Handle asset creation - Updated to use direct API call if needed
    const handleCreateAssets = async () => {
        if (!isFormValid) {
            setError("Please complete all fields first");
            return;
        }

        const count = parseInt(assetCount);
        if (isNaN(count) || count <= 0) {
            setError("Asset count must be a positive number");
            return;
        }

        const tabsNum = parseInt(tabsInput) || 3;

        setError("");
        setIsLoading(true);

        try {
            console.log(`Creating assets for report: ${reportId}, count: ${count}, tabs: ${tabsNum}`);

            // Use the createMacros function from Electron API (or update to direct API call if needed)
            const result = await window.electronAPI.createMacros(reportId, count, tabsNum);
            console.log("Asset creation result:", result);

            setCreationResult(result);

            if (result.status === 'SUCCESS') {
                setIsSuccess(true);
            } else {
                setError(result.error || 'Failed to create assets');
            }
        } catch (err) {
            console.error("Error creating assets:", err);
            setError(err.message || 'An unexpected error occurred during asset creation');
        } finally {
            setIsLoading(false);
        }
    };

    // Reset process
    const resetProcess = () => {
        setReportId("");
        setTabsInput("");
        setAssetCount("");
        setError("");
        setIsLoading(false);
        setCreationResult(null);
        setIsSuccess(false);
        setReportExists(null);
        setIsCheckingReport(false);
        setIsCheckingDB(false);
        setDbCheckResult(null);
        setTaqeemError("");
        setDbError("");
    };

    // Handle back button
    const handleBack = () => {
        resetProcess();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 mx-auto transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">🛠️ Asset Creation</h1>
                    <p className="text-gray-600">Create new assets for an existing report</p>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    {isSuccess ? (
                        /* Success State */
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-green-800 mb-2">Success!</h2>
                                <p className="text-green-600 mb-4">Your assets have been created successfully</p>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                                <h3 className="text-xl font-semibold text-green-800 mb-4 text-center">Assets Created Successfully!</h3>
                                <p className="text-green-600 mb-2 text-center">Report ID: <strong>{reportId}</strong></p>

                                <div className="bg-white rounded-lg p-4 max-w-md mx-auto mb-4">
                                    <h4 className="font-medium text-gray-800 mb-3 text-center">Creation Details:</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Tabs:</span>
                                            <span className="font-medium">{tabsInput}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Asset Count:</span>
                                            <span className="font-medium">{assetCount}</span>
                                        </div>
                                        {creationResult?.data?.status && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <span className="font-medium text-green-600">{creationResult.data.status}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p className="text-green-600 mb-6 text-center">The assets have been successfully created and added to your report.</p>

                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={resetProcess}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        View Reports
                                    </button>
                                    <button
                                        onClick={resetProcess}
                                        className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-semibold transition-colors"
                                    >
                                        Create New Assets
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Main Form */
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Plus className="w-6 h-6 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Assets</h2>
                                <p className="text-gray-600">Enter the report details to create new assets</p>
                            </div>

                            <div className="space-y-6">
                                {/* Report ID Input with Check Buttons */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Search className="w-4 h-4 inline mr-1" />
                                        Report ID *
                                    </label>
                                    <div className="flex gap-3 mb-3">
                                        <input
                                            type="text"
                                            value={reportId}
                                            onChange={(e) => {
                                                setReportId(e.target.value);
                                                setReportExists(null); // Reset validation when ID changes
                                                setDbCheckResult(null);
                                                setError("");
                                                setTaqeemError("");
                                                setDbError("");
                                            }}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            placeholder="Enter existing report ID"
                                        />
                                    </div>

                                    {/* Check Report Buttons */}
                                    <div className="flex gap-3 mb-2">
                                        <div className="flex-1 flex flex-col">
                                            <button
                                                onClick={handleCheckReportInTaqeem}
                                                disabled={isCheckingDB}
                                                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                                            >
                                                {isCheckingReport ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Search className="w-4 h-4" />
                                                )}
                                                {isCheckingReport ? "Checking..." : "Check Report in Taqeem"}
                                            </button>
                                            {/* Taqeem Error Message */}
                                            {taqeemError && (
                                                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-red-500" />
                                                        <span className="text-red-700 text-sm">{taqeemError}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <button
                                                onClick={handleCheckReportInDB}
                                                disabled={isCheckingReport}
                                                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                                            >
                                                {isCheckingDB ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Database className="w-4 h-4" />
                                                )}
                                                {isCheckingDB ? "Checking..." : "Check Report in DB"}
                                            </button>
                                            {/* DB Error Message */}
                                            {dbError && (
                                                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                                    <div className="flex items-center gap-2">
                                                        <Database className="w-4 h-4 text-red-500" />
                                                        <span className="text-red-700 text-sm">{dbError}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 mt-1">
                                        Enter the report ID and verify it exists before creating assets
                                    </p>

                                    {/* Report Validation Status - Taqeem */}
                                    {reportExists === true && (
                                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                                <div>
                                                    <p className="font-medium text-green-800">Report Validated in Taqeem</p>
                                                    <p className="text-sm text-green-600">
                                                        Report ID <strong>{reportId}</strong> exists in Taqeem system.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {reportExists === false && !taqeemError && (
                                        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <FileCheck className="w-5 h-5 text-yellow-500" />
                                                <div>
                                                    <p className="font-medium text-yellow-800">Report Not Found in Taqeem</p>
                                                    <p className="text-sm text-yellow-600">
                                                        Please check the report ID and try again.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Report Validation Status - Database */}
                                    {dbCheckResult?.success === true && (
                                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <Database className="w-5 h-5 text-green-500" />
                                                <div>
                                                    <p className="font-medium text-green-800">Report Found in Database</p>
                                                    <p className="text-sm text-green-600">
                                                        Report ID <strong>{reportId}</strong> exists in the database.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {dbCheckResult?.success === false && !dbError && (
                                        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <Database className="w-5 h-5 text-yellow-500" />
                                                <div>
                                                    <p className="font-medium text-yellow-800">Report Not Found in Database</p>
                                                    <p className="text-sm text-yellow-600">
                                                        Please check the report ID and try again.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tabs Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Plus className="w-4 h-4 inline mr-1" />
                                        Number of Tabs *
                                    </label>
                                    <input
                                        type="number"
                                        value={tabsInput}
                                        onChange={(e) => {
                                            setTabsInput(e.target.value);
                                            setError("");
                                        }}
                                        min="1"
                                        max="10"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                        placeholder="Enter number of tabs (default: 3)"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Specify the number of tabs to create (usually 3)
                                    </p>
                                </div>

                                {/* Asset Count */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Hash className="w-4 h-4 inline mr-1" />
                                        Asset Count *
                                    </label>
                                    <input
                                        type="number"
                                        value={assetCount}
                                        onChange={(e) => {
                                            setAssetCount(e.target.value);
                                            setError("");
                                        }}
                                        min="1"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                        placeholder="Enter number of assets"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Enter the total number of assets to create
                                    </p>
                                </div>

                                {/* Configuration Preview */}
                                {(tabsInput || assetCount || reportId) && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-800 mb-2">Configuration Preview:</h4>
                                        <div className="space-y-2 text-sm">
                                            {reportId && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Report ID:</span>
                                                    <span className="font-medium">{reportId}</span>
                                                    {(reportExists === true || dbCheckResult?.success === true) && (
                                                        <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                                                    )}
                                                    {(reportExists === false || dbCheckResult?.success === false) && (
                                                        <FileCheck className="w-4 h-4 text-yellow-500 ml-2" />
                                                    )}
                                                </div>
                                            )}
                                            {tabsInput && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Tabs:</span>
                                                    <span className="font-medium">{tabsInput}</span>
                                                </div>
                                            )}
                                            {assetCount && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Asset Count:</span>
                                                    <span className="font-medium">{assetCount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* General Error Display (for asset creation) */}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-red-500" />
                                            <span className="text-red-700">{error}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        onClick={handleBack}
                                        className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCreateAssets}
                                        disabled={isLoading}
                                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {isLoading ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                        {isLoading ? "Creating Assets..." : "Create Assets"}
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

export default AssetCreate;