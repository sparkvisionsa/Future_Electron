import React, { useState } from "react";
import {
    FileSpreadsheet,
    Files,
    Loader2,
    Upload,
    CheckCircle2,
    AlertTriangle,
    FileIcon,
    RefreshCw,
    FolderOpen,
    Info,
    Send,
    Hash,
} from "lucide-react";
import { multiExcelUpload } from "../../api/report"; // Adjust the import path as needed

const MultiExcelUpload = () => {
    const [excelFiles, setExcelFiles] = useState([]);
    const [pdfFiles, setPdfFiles] = useState([]);
    const [tabsNum, setTabsNum] = useState(1);
    const [batchId, setBatchId] = useState("");
    const [uploadResult, setUploadResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [creatingReports, setCreatingReports] = useState(false);

    const handleExcelChange = (e) => {
        const files = Array.from(e.target.files || []);
        setExcelFiles(files);
        resetMessages();
    };

    const handlePdfChange = (e) => {
        const files = Array.from(e.target.files || []);
        setPdfFiles(files);
        resetMessages();
    };

    const handleTabsNumChange = (e) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value >= 1) {
            setTabsNum(value);
        }
        resetMessages();
    };

    const resetMessages = () => {
        setError("");
        setSuccess("");
    };

    const resetAll = () => {
        setExcelFiles([]);
        setPdfFiles([]);
        setTabsNum(1);
        setBatchId("");
        setUploadResult(null);
        resetMessages();
    };

    const handleUploadAndCreate = async () => {
        try {
            setLoading(true);
            resetMessages();

            // Validation
            if (excelFiles.length === 0) {
                throw new Error("Please select at least one Excel file");
            }
            if (pdfFiles.length === 0) {
                throw new Error("Please select at least one PDF file");
            }
            if (tabsNum < 1) {
                throw new Error("Number of tabs must be at least 1");
            }

            // Step 1: Upload files to backend
            setSuccess("Uploading files to server...");
            const data = await multiExcelUpload(excelFiles, pdfFiles);

            if (data.status !== "success") {
                throw new Error(data.error || "Upload failed");
            }

            const batchIdFromApi = data.batchId;
            const insertedCount = data.inserted || 0;

            setBatchId(batchIdFromApi);
            setUploadResult(data);
            setSuccess(`Files uploaded successfully. Batch ID: ${batchIdFromApi}. Inserted ${insertedCount} assets.`);

            // Step 2: Create reports via Electron
            setCreatingReports(true);
            setSuccess("Creating reports in Taqeem browser...");

            const electronResult = await window.electronAPI.createReportsByBatch(
                batchIdFromApi,
                tabsNum
            );

            if (electronResult?.status === "SUCCESS") {
                setSuccess(
                    `Reports created successfully! ${insertedCount} assets processed with ${tabsNum} tab(s).`
                );
            } else {
                throw new Error(electronResult?.error || "Failed to create reports in Taqeem");
            }

        } catch (err) {
            console.error("Upload failed", err);
            setError(err.message || "Failed to upload and create reports");
        } finally {
            setLoading(false);
            setCreatingReports(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        Multi-Excel Upload
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Upload multiple Excel files and PDFs, then create reports in Taqeem with specified number of tabs.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Excel Files Section */}
                <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-800">
                            Upload Excel Files
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Select multiple Excel files (.xlsx, .xls). Each file will be processed.
                    </p>
                    <label className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:bg-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <FolderOpen className="w-4 h-4" />
                            <span>
                                {excelFiles.length
                                    ? `${excelFiles.length} Excel file(s) selected`
                                    : "Choose Excel files"}
                            </span>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleExcelChange}
                        />
                        <span className="text-xs text-blue-600">Browse</span>
                    </label>

                    {excelFiles.length > 0 && (
                        <div className="mt-3 max-h-40 overflow-y-auto">
                            <ul className="text-xs text-gray-600 space-y-1">
                                {excelFiles.map((file, index) => (
                                    <li key={index} className="flex items-center gap-2 p-1 bg-gray-50 rounded">
                                        <FileIcon className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{file.name}</span>
                                        <span className="text-gray-400 text-xs">
                                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* PDF Files Section */}
                <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Files className="w-5 h-5 text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-800">
                            Upload PDF Files
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Select multiple PDF files. Will be matched with Excel data.
                    </p>
                    <label className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:bg-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <FolderOpen className="w-4 h-4" />
                            <span>
                                {pdfFiles.length
                                    ? `${pdfFiles.length} PDF file(s) selected`
                                    : "Choose PDF files"}
                            </span>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept=".pdf"
                            className="hidden"
                            onChange={handlePdfChange}
                        />
                        <span className="text-xs text-blue-600">Browse</span>
                    </label>

                    {pdfFiles.length > 0 && (
                        <div className="mt-3 max-h-40 overflow-y-auto">
                            <ul className="text-xs text-gray-600 space-y-1">
                                {pdfFiles.slice(0, 5).map((file, index) => (
                                    <li key={index} className="flex items-center gap-2 p-1 bg-gray-50 rounded">
                                        <FileIcon className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{file.name}</span>
                                        <span className="text-gray-400 text-xs">
                                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                    </li>
                                ))}
                                {pdfFiles.length > 5 && (
                                    <li className="text-xs text-gray-500 text-center">
                                        + {pdfFiles.length - 5} more files
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Tabs Number Section */}
                <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Hash className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-gray-800">
                            Number of Tabs
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Specify how many tabs to open in Taqeem browser for report creation.
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={tabsNum}
                            onChange={handleTabsNumChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter number of tabs"
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Recommended: 1-3 tabs for stable performance
                    </p>
                </div>
            </div>

            {/* Status Messages */}
            {(error || success) && (
                <div
                    className={`rounded-lg p-3 flex items-start gap-2 ${error
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : "bg-green-50 text-green-700 border border-green-100"
                        }`}
                >
                    {error ? (
                        <AlertTriangle className="w-4 h-4 mt-0.5" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 mt-0.5" />
                    )}
                    <div className="text-sm">{error || success}</div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleUploadAndCreate}
                    disabled={loading || creatingReports || excelFiles.length === 0 || pdfFiles.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                    {(loading || creatingReports) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                    {creatingReports ? "Creating Reports..." : loading ? "Uploading..." : "Upload & Create Reports"}
                </button>

                <button
                    type="button"
                    onClick={resetAll}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reset All
                </button>
            </div>

            {/* Batch Info Section */}
            {batchId && (
                <div className="bg-white border rounded-lg shadow-sm">
                    <div className="px-4 py-3 border-b flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        <div>
                            <p className="text-sm font-semibold text-gray-800">
                                Batch Information
                            </p>
                            <p className="text-xs text-gray-500">
                                Batch ID: <span className="font-mono">{batchId}</span>
                            </p>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-3 bg-gray-50 rounded">
                                <p className="text-gray-600">Excel Files</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {excelFiles.length}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                                <p className="text-gray-600">PDF Files</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {pdfFiles.length}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                                <p className="text-gray-600">Tabs to Open</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {tabsNum}
                                </p>
                            </div>
                        </div>

                        {uploadResult?.data?.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                                    Created Assets ({uploadResult.data.length})
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr className="text-left text-gray-600">
                                                <th className="px-4 py-2">#</th>
                                                <th className="px-4 py-2">Asset Name</th>
                                                <th className="px-4 py-2">Client Name</th>
                                                <th className="px-4 py-2">PDF Matched</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {uploadResult.data.slice(0, 10).map((item, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="px-4 py-2 text-gray-700">{idx + 1}</td>
                                                    <td className="px-4 py-2 text-gray-900 font-medium">
                                                        {item.asset_name}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-800">
                                                        {item.client_name}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {item.pdf_path ? (
                                                            <span className="inline-flex items-center gap-1 text-green-700">
                                                                <FileIcon className="w-4 h-4" />
                                                                Yes
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">No</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {uploadResult.data.length > 10 && (
                                                <tr className="border-t">
                                                    <td colSpan="4" className="px-4 py-2 text-center text-gray-500 text-sm">
                                                        ... and {uploadResult.data.length - 10} more assets
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-sm font-semibold text-blue-800 mb-1">
                            How this works:
                        </h4>
                        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Select multiple Excel files containing report data</li>
                            <li>Select multiple PDF files to be attached to reports</li>
                            <li>Specify how many browser tabs to use (for parallel processing)</li>
                            <li>Click "Upload & Create Reports" to:
                                <ul className="ml-4 mt-1 list-disc list-inside">
                                    <li>Upload files to backend for processing</li>
                                    <li>Create a batch with all assets</li>
                                    <li>Open specified number of Taqeem browser tabs</li>
                                    <li>Automatically create reports in each tab</li>
                                </ul>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MultiExcelUpload;