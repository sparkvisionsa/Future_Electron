// EditReportModal.jsx - COMPLETE VERSION
import React, { useMemo, useState, useEffect } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    X,
} from "lucide-react";
import { updateUrgentReport } from "../../api/report";

const InputField = ({
    label,
    required = false,
    error,
    className = "",
    ...props
}) => (
    <div className={`mb-3 ${className}`}>
        <label className="block text-xs font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            {...props}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all ${error ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
        />
        {error && <p className="text-red-500 text-sm mt-1.5">{error}</p>}
    </div>
);

const SelectField = ({
    label,
    required = false,
    options,
    error,
    className = "",
    ...props
}) => (
    <div className={`mb-3 ${className}`}>
        <label className="block text-xs font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            {...props}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all ${error ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
        {error && <p className="text-red-500 text-sm mt-1.5">{error}</p>}
    </div>
);

const RadioGroup = ({ label, options, value, onChange }) => (
    <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-2">
            {label} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-4 gap-2 w-full">
            {options.map((option) => (
                <label
                    key={option.value}
                    className="flex items-center cursor-pointer group w-full"
                >
                    <input
                        type="radio"
                        value={option.value}
                        checked={value === option.value}
                        onChange={(e) => onChange(e.target.value)}
                        className="sr-only"
                    />
                    <div
                        className={`flex items-center justify-start gap-2 px-3 py-2 rounded border transition-all text-sm w-full ${value === option.value
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                    >
                        <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${value === option.value ? "border-blue-500" : "border-gray-400"
                                }`}
                        >
                            {value === option.value && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                        </div>
                        <span
                            className={`${value === option.value
                                    ? "text-blue-700 font-semibold"
                                    : "text-gray-700"
                                }`}
                        >
                            {option.label}
                        </span>
                    </div>
                </label>
            ))}
        </div>
    </div>
);

const Section = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 pb-2 border-b border-gray-200">
            {title}
        </h3>
        {children}
    </div>
);

const EditReportModal = ({ report, isOpen, onClose, onSave, refreshData }) => {
    const [formData, setFormData] = useState({
        report_id: "",
        title: "",
        purpose_id: "",
        value_premise_id: "",
        report_type: "",
        valued_at: "",
        submitted_at: "",
        inspection_date: "",
        assumptions: "",
        special_assumptions: "",
        value: "",
        valuation_currency: "",
        client_name: "",
        owner_name: "",
        telephone: "",
        email: "",
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null);

    // Initialize form with report data when modal opens
    useEffect(() => {
        if (isOpen && report) {
            console.log("Initializing form with report data:", report);

            // Format dates for input[type="date"]
            const formatDate = (dateString) => {
                if (!dateString) return "";
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return "";
                    return date.toISOString().split('T')[0];
                } catch (error) {
                    console.error("Error formatting date:", dateString, error);
                    return "";
                }
            };

            const newFormData = {
                report_id: report.report_id || report.reportId || "",
                title: report.title || "",
                purpose_id: report.purpose_id?.toString() || "",
                value_premise_id: report.value_premise_id?.toString() || "",
                report_type: report.report_type || "تقرير مفصل",
                valued_at: formatDate(report.valued_at),
                submitted_at: formatDate(report.submitted_at),
                inspection_date: formatDate(report.inspection_date),
                assumptions: report.assumptions?.toString() || "",
                special_assumptions: report.special_assumptions?.toString() || "",
                value: report.value?.toString() || report.final_value?.toString() || "",
                valuation_currency: report.valuation_currency?.toString() || "1",
                client_name: report.client_name || "",
                owner_name: report.owner_name || report.client_name || "",
                telephone: report.telephone || "",
                email: report.email || "",
            };

            console.log("Form data set to:", newFormData);
            setFormData(newFormData);
        }
    }, [isOpen, report]);

    const requiredFields = useMemo(
        () => [
            "title",
            "purpose_id",
            "value_premise_id",
            "report_type",
            "valued_at",
            "submitted_at",
            "inspection_date",
            "value",
            "valuation_currency",
            "client_name",
            "telephone",
            "email",
        ],
        []
    );

    const validate = () => {
        const newErrors = {};
        requiredFields.forEach((field) => {
            if (!formData[field] || formData[field].toString().trim() === "") {
                newErrors[field] = "Required";
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFieldChange = (field, value) => {
        console.log(`Field ${field} changed to:`, value);
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async () => {
        if (!validate()) {
            setStatus({ type: "error", message: "Please fill all required fields." });
            return;
        }

        try {
            setSubmitting(true);
            setStatus(null);

            // Prepare data for backend
            const updateData = {
                ...formData,
                // Convert numeric fields
                purpose_id: Number(formData.purpose_id),
                value_premise_id: Number(formData.value_premise_id),
                assumptions: Number(formData.assumptions) || 0,
                special_assumptions: Number(formData.special_assumptions) || 0,
                value: Number(formData.value),
                // Map valuation_currency to appropriate value
                valuation_currency: Number(formData.valuation_currency) || 1,
                // Set owner_name same as client_name if not provided
                owner_name: formData.owner_name || formData.client_name,
                // Update final_value to match value
                final_value: Number(formData.value),
            };

            console.log("Sending update data:", updateData);

            // Call API to update report
            const response = await updateUrgentReport(formData.report_id, updateData);

            if (response.success) {
                setStatus({
                    type: "success",
                    message: "Report updated successfully!",
                });

                // Call onSave callback if provided
                if (onSave) {
                    await onSave(updateData);
                }

                // Refresh parent data
                if (refreshData) {
                    await refreshData();
                }

                // Close modal after delay
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setStatus({
                    type: "error",
                    message: response.message || "Failed to update report.",
                });
            }
        } catch (err) {
            console.error("Error updating report:", err);
            setStatus({
                type: "error",
                message: err.message || "Failed to update report. Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Edit Report {report?.report_id}
                        </h2>
                        <p className="text-sm text-gray-600">
                            Asset: {report?.asset_name || "Unknown"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={submitting}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                    {status && (
                        <div
                            className={`mb-6 rounded-lg border px-4 py-3 flex items-start gap-3 ${status.type === "error"
                                    ? "border-red-200 bg-red-50 text-red-800"
                                    : status.type === "success"
                                        ? "border-green-200 bg-green-50 text-green-800"
                                        : "border-yellow-200 bg-yellow-50 text-yellow-800"
                                }`}
                        >
                            {status.type === "success" ? (
                                <CheckCircle2 className="w-5 h-5 mt-0.5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 mt-0.5" />
                            )}
                            <div className="text-sm">{status.message}</div>
                        </div>
                    )}

                    <Section title="Report Information">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                            <div className="md:col-span-3">
                                <InputField
                                    label="Report Title"
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => handleFieldChange("title", e.target.value)}
                                    error={errors.title}
                                    placeholder="Enter report title"
                                />
                            </div>

                            <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
                                <SelectField
                                    label="Valuation Purpose"
                                    required
                                    value={formData.purpose_id}
                                    onChange={(e) => handleFieldChange("purpose_id", e.target.value)}
                                    options={[
                                        { value: "", label: "Select" },
                                        { value: "1", label: "Selling" },
                                        { value: "2", label: "Buying" },
                                        { value: "5", label: "Rent Value" },
                                        { value: "6", label: "Insurance" },
                                        { value: "8", label: "Accounting Purposes" },
                                        { value: "9", label: "Financing" },
                                        { value: "10", label: "Disputes and Litigation" },
                                        { value: "12", label: "Tax Related Valuations" },
                                        { value: "14", label: "Other" },
                                    ]}
                                    error={errors.purpose_id}
                                />

                                <SelectField
                                    label="Value Premise"
                                    required
                                    value={formData.value_premise_id}
                                    onChange={(e) => handleFieldChange("value_premise_id", e.target.value)}
                                    options={[
                                        { value: "", label: "Select" },
                                        { value: "1", label: "Highest and Best Use" },
                                        { value: "2", label: "Current Use" },
                                        { value: "3", label: "Orderly Liquidation" },
                                        { value: "4", label: "Forced Sale" },
                                        { value: "5", label: "Other" },
                                    ]}
                                    error={errors.value_premise_id}
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <RadioGroup
                                label="Report Type"
                                value={formData.report_type}
                                onChange={(value) => handleFieldChange("report_type", value)}
                                options={[
                                    { value: "تقرير مفصل", label: "Detailed Report" },
                                    { value: "ملخص التقرير", label: "Report Summary" },
                                    {
                                        value: "مراجعة مع قيمة جديدة",
                                        label: "Review with New Value",
                                    },
                                    {
                                        value: "مراجعة بدون قيمة جديدة",
                                        label: "Review without New Value",
                                    },
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <InputField
                                label="Valued At"
                                required
                                type="date"
                                value={formData.valued_at}
                                onChange={(e) => handleFieldChange("valued_at", e.target.value)}
                                error={errors.valued_at}
                            />

                            <InputField
                                label="Submitted At"
                                required
                                type="date"
                                value={formData.submitted_at}
                                onChange={(e) => handleFieldChange("submitted_at", e.target.value)}
                                error={errors.submitted_at}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <InputField
                                label="Assumptions"
                                value={formData.assumptions}
                                onChange={(e) => handleFieldChange("assumptions", e.target.value)}
                                placeholder="Enter assumptions"
                            />

                            <InputField
                                label="Special Assumptions"
                                value={formData.special_assumptions}
                                onChange={(e) => handleFieldChange("special_assumptions", e.target.value)}
                                placeholder="Enter special assumptions"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <InputField
                                label="Value"
                                required
                                type="number"
                                value={formData.value}
                                onChange={(e) => handleFieldChange("value", e.target.value)}
                                error={errors.value}
                                placeholder="Enter value"
                                step="0.01"
                            />

                            <SelectField
                                label="Valuation Currency"
                                required
                                value={formData.valuation_currency}
                                onChange={(e) => handleFieldChange("valuation_currency", e.target.value)}
                                options={[
                                    { value: "", label: "Select" },
                                    { value: "1", label: "Saudi Riyal" },
                                    { value: "2", label: "US Dollars" },
                                    { value: "3", label: "UA Dirhams" },
                                    { value: "4", label: "Euro" },
                                    { value: "5", label: "Pound Sterling" },
                                    { value: "6", label: "Sudanese Pound" },
                                ]}
                                error={errors.valuation_currency}
                            />
                        </div>
                    </Section>

                    <Section title="Client Information">
                        <div className="mb-2">
                            <InputField
                                label="Client Name"
                                required
                                type="text"
                                value={formData.client_name}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    handleFieldChange("client_name", value);
                                    // Auto-update owner_name if it's empty or same as previous client name
                                    if (!formData.owner_name || formData.owner_name === formData.client_name) {
                                        handleFieldChange("owner_name", value);
                                    }
                                }}
                                error={errors.client_name}
                                placeholder="Enter client name"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <InputField
                                label="Owner Name"
                                type="text"
                                value={formData.owner_name}
                                onChange={(e) => handleFieldChange("owner_name", e.target.value)}
                                placeholder="Enter owner name"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <InputField
                                label="Telephone"
                                required
                                type="tel"
                                value={formData.telephone}
                                onChange={(e) => handleFieldChange("telephone", e.target.value)}
                                error={errors.telephone}
                                placeholder="e.g. +966500000000"
                            />

                            <InputField
                                label="Email"
                                required
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleFieldChange("email", e.target.value)}
                                error={errors.email}
                                placeholder="e.g. example@domain.com"
                            />
                        </div>
                    </Section>

                    {/* Debug section - remove in production */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <details className="text-xs">
                            <summary className="font-medium text-gray-700 cursor-pointer">
                                Debug Info
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                                {JSON.stringify(formData, null, 2)}
                            </pre>
                        </details>
                    </div>

                    {/* Modal Footer */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center gap-2 ${submitting
                                    ? "bg-blue-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                                }`}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditReportModal;