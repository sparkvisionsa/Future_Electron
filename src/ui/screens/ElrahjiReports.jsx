import React, { useState, useEffect } from "react";
import {
    Loader2,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Clock,
    Users,
    FileText,
    Filter,
    Search,
    ArrowLeft,
    Download,
    BarChart3,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { getAllUrgentReports } from "../../api/report";

const ElrahjiReports = () => {
    const [loading, setLoading] = useState(false);
    const [batches, setBatches] = useState([]);
    const [error, setError] = useState("");
    const [retryingBatchId, setRetryingBatchId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [exporting, setExporting] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchUrgentReports = async () => {
        setLoading(true);
        setError("");
        try {
            // Simulated API call - replace with actual API
            const response = await new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        message: 'Urgent reports fetched successfully',
                        data: [
                            {
                                _id: '1',
                                batch_id: 'BATCH-2024-001',
                                report_id: 'RPT-001',
                                asset_name: 'Building A',
                                client_name: 'Client Alpha',
                                status: 'completed',
                                created_at: '2024-12-14T10:30:00Z',
                                updated_at: '2024-12-14T15:45:00Z'
                            },
                            {
                                _id: '2',
                                batch_id: 'BATCH-2024-001',
                                report_id: 'RPT-002',
                                asset_name: 'Building B',
                                client_name: 'Client Alpha',
                                status: 'pending',
                                created_at: '2024-12-14T10:35:00Z',
                                updated_at: '2024-12-14T10:35:00Z'
                            },
                            {
                                _id: '3',
                                batch_id: 'BATCH-2024-002',
                                report_id: 'RPT-003',
                                asset_name: 'Office Complex C',
                                client_name: 'Client Beta',
                                status: 'completed',
                                created_at: '2024-12-13T09:00:00Z',
                                updated_at: '2024-12-13T14:20:00Z'
                            },
                            {
                                _id: '4',
                                batch_id: 'BATCH-2024-003',
                                report_id: 'RPT-004',
                                asset_name: 'Warehouse D',
                                client_name: 'Client Gamma',
                                status: 'pending',
                                created_at: '2024-12-12T11:15:00Z',
                                updated_at: '2024-12-12T11:15:00Z'
                            }
                        ]
                    });
                }, 1000);
            });

            let reports = [];

            if (Array.isArray(response)) {
                reports = response;
            } else if (response && typeof response === 'object') {
                if (Array.isArray(response.data)) {
                    reports = response.data;
                } else if (Array.isArray(response.reports)) {
                    reports = response.reports;
                } else if (response.data && typeof response.data === 'object') {
                    reports = Object.values(response.data);
                } else {
                    reports = [response];
                }
            } else {
                console.error("Unexpected API response format:", response);
                setError("Unexpected data format received from server");
                return;
            }

            if (!Array.isArray(reports)) {
                console.error("Reports is not an array:", reports);
                setError("Reports data is not in expected format");
                setBatches([]);
                return;
            }

            const grouped = reports.reduce((acc, report) => {
                if (!report || typeof report !== 'object') {
                    console.warn("Skipping invalid report:", report);
                    return acc;
                }

                const batchId = report.batch_id || report.batchId || 'ungrouped';
                if (!acc[batchId]) {
                    acc[batchId] = {
                        batch_id: batchId,
                        reports: [],
                        created_at: report.created_at || report.createdAt || new Date().toISOString(),
                        updated_at: report.updated_at || report.updatedAt || new Date().toISOString(),
                        total_reports: 0,
                        report_ids: []
                    };
                }

                acc[batchId].reports.push(report);
                acc[batchId].total_reports++;

                const reportId = report.report_id || report.reportId || report._id || report.id;
                if (reportId && !acc[batchId].report_ids.includes(reportId)) {
                    acc[batchId].report_ids.push(reportId);
                }

                if (report.created_at && (!acc[batchId].created_at || new Date(report.created_at) < new Date(acc[batchId].created_at))) {
                    acc[batchId].created_at = report.created_at;
                }
                if (report.updated_at && (!acc[batchId].updated_at || new Date(report.updated_at) > new Date(acc[batchId].updated_at))) {
                    acc[batchId].updated_at = report.updated_at;
                }

                return acc;
            }, {});

            // Sort by most recent (newest first)
            const batchesArray = Object.values(grouped).sort((a, b) =>
                new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
            );

            setBatches(batchesArray);
            setCurrentPage(1); // Reset to first page on new data
        } catch (err) {
            console.error("Failed to fetch urgent reports:", err);
            setError(err.message || "Failed to load urgent reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUrgentReports();
    }, []);

    const handleRetryBatch = async (batchId) => {
        setRetryingBatchId(batchId);
        try {
            console.log(`Retrying batch: ${batchId}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetchUrgentReports();
        } catch (err) {
            console.error("Retry failed:", err);
        } finally {
            setRetryingBatchId(null);
        }
    };

    const handleExportData = async () => {
        setExporting(true);
        try {
            const headers = ['Batch ID', 'Report ID', 'Asset Name', 'Client Name', 'Status', 'Created At', 'Updated At'];
            const csvRows = [];

            batches.forEach(batch => {
                batch.reports.forEach(report => {
                    csvRows.push([
                        batch.batch_id,
                        report.report_id || report.reportId || report._id || report.id || 'N/A',
                        report.asset_name || report.assetName || 'N/A',
                        report.client_name || report.clientName || 'N/A',
                        report.status || 'pending',
                        new Date(report.created_at || report.createdAt || Date.now()).toISOString(),
                        new Date(report.updated_at || report.updatedAt || report.created_at || report.createdAt || Date.now()).toISOString()
                    ]);
                });
            });

            const csvContent = [
                headers.join(','),
                ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `urgent-reports-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            setError('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    // Filter batches based on search
    const filteredBatches = batches.filter(batch => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            batch.batch_id.toLowerCase().includes(searchLower) ||
            batch.report_ids.some(id => id.toLowerCase().includes(searchLower))
        );
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBatches = filteredBatches.slice(startIndex, endIndex);

    // Calculate statistics
    const totalReports = batches.reduce((sum, batch) => sum + batch.total_reports, 0);
    const totalReportIds = batches.reduce((sum, batch) => sum + batch.report_ids.length, 0);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Elrajhi Urgent Reports</h1>
                            <p className="text-gray-600 mt-2">
                                View all urgent report batches with their report IDs
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleExportData}
                                disabled={exporting || batches.length === 0}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                                {exporting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Export CSV
                            </button>

                            <button
                                onClick={fetchUrgentReports}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Batches</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{batches.length}</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{totalReports}</p>
                            </div>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <BarChart3 className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Unique Report IDs</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{totalReportIds}</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Items Per Page */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search batch IDs or report IDs..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">Show:</label>
                            <select
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-sm text-gray-600">per page</span>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 rounded-xl p-4 bg-red-50 text-red-700 border border-red-100 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">{error}</div>
                        <button
                            onClick={fetchUrgentReports}
                            className="ml-auto text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && batches.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                        <p className="text-gray-600 text-lg">Loading urgent reports...</p>
                        <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredBatches.length === 0 && batches.length === 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-3">No urgent reports found</h3>
                        <p className="text-gray-600 max-w-md mx-auto mb-8">
                            There are no urgent reports in the system yet.
                        </p>
                        <button
                            onClick={fetchUrgentReports}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    </div>
                )}

                {/* No Results State */}
                {!loading && filteredBatches.length === 0 && batches.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No matching reports found</h3>
                        <p className="text-gray-600 mb-4">Try adjusting your search criteria.</p>
                        <button
                            onClick={() => setSearchTerm('')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200"
                        >
                            Clear search
                        </button>
                    </div>
                )}

                {/* Batches List */}
                {!loading && paginatedBatches.length > 0 && (
                    <>
                        {/* Pagination Info */}
                        <div className="mb-4 text-sm text-gray-600">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredBatches.length)} of {filteredBatches.length} batches
                        </div>

                        <div className="space-y-6">
                            {paginatedBatches.map((batch) => (
                                <div
                                    key={batch.batch_id}
                                    className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
                                >
                                    <div className="px-6 py-4 bg-gray-50 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="flex items-start lg:items-center gap-3">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold bg-blue-100 text-blue-800 border-blue-200">
                                                <FileText className="w-4 h-4" />
                                                Batch ID
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900">{batch.batch_id}</h3>
                                                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-1">
                                                    <span>Created: {formatDate(batch.created_at)}</span>
                                                    {batch.updated_at !== batch.created_at && (
                                                        <span>Updated: {formatDate(batch.updated_at)}</span>
                                                    )}
                                                    <span>Reports: {batch.total_reports}</span>
                                                    <span>Unique IDs: {batch.report_ids.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRetryBatch(batch.batch_id)}
                                            disabled={retryingBatchId === batch.batch_id}
                                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                                        >
                                            {retryingBatchId === batch.batch_id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-4 h-4" />
                                            )}
                                            Retry
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Report IDs in this batch:</h4>
                                        {batch.report_ids.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {batch.report_ids.map((reportId, index) => (
                                                    <div
                                                        key={index}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-800 text-xs font-mono rounded-md border border-gray-200 hover:bg-gray-200 transition-colors"
                                                    >
                                                        <span className="text-xs text-gray-500 mr-1">#{index + 1}</span>
                                                        {reportId}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm italic">No report IDs found</p>
                                        )}

                                        {batch.reports.length > 0 && (
                                            <div className="mt-6">
                                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Report Details:</h5>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-sm">
                                                        <thead className="bg-gray-50">
                                                            <tr className="text-left text-gray-600">
                                                                <th className="px-3 py-2">#</th>
                                                                <th className="px-3 py-2">Report ID</th>
                                                                <th className="px-3 py-2">Asset Name</th>
                                                                <th className="px-3 py-2">Client Name</th>
                                                                <th className="px-3 py-2">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {batch.reports.map((report, index) => (
                                                                <tr key={index} className="border-t hover:bg-gray-50">
                                                                    <td className="px-3 py-2 text-gray-700">{index + 1}</td>
                                                                    <td className="px-3 py-2 font-mono text-xs">
                                                                        {report.report_id || report.reportId || report._id || report.id || 'N/A'}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        {report.asset_name || report.assetName || 'N/A'}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        {report.client_name || report.clientName || 'N/A'}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${report.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                            {report.status || 'pending'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>

                                    <div className="flex gap-1">
                                        {[...Array(totalPages)].map((_, idx) => {
                                            const pageNum = idx + 1;
                                            // Show first, last, current, and adjacent pages
                                            if (
                                                pageNum === 1 ||
                                                pageNum === totalPages ||
                                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`px-3 py-2 rounded-md text-sm font-medium ${currentPage === pageNum
                                                            ? 'bg-blue-600 text-white'
                                                            : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            } else if (
                                                pageNum === currentPage - 2 ||
                                                pageNum === currentPage + 2
                                            ) {
                                                return <span key={pageNum} className="px-2 py-2 text-gray-500">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ElrahjiReports;