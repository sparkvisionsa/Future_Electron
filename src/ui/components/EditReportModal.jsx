import React, { useMemo, useState, useEffect } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    X,
} from "lucide-react";
import { updateUrgentReport } from "../../api/report";

/* =======================
   Reusable UI Components
======================= */

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
            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-400 bg-red-50" : "border-gray-300"
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
            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-400 bg-red-50" : "border-gray-300"
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
                <label key={option.value} className="cursor-pointer">
                    <input
                        type="radio"
                        value={option.value}
                        checked={value === option.value}
                        onChange={(e) => onChange(e.target.value)}
                        className="sr-only"
                    />
                    <div
                        className={`px-3 py-2 rounded border text-sm text-center ${value === option.value
                                ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                                : "border-gray-300"
                            }`}
                    >
                        {option.label}
                    </div>
                </label>
            ))}
        </div>
    </div>
);

const Section = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 pb-2 border-b">
            {title}
        </h3>
        {children}
    </div>
);

/* =======================
   Main Component
======================= */

const EditReportModal = ({ report, isOpen, onClose, refreshData }) => {
    const [formData, setFormData] = useState({
        id: "",
        report_id: "",
        title: "",
        purpose_id: "",
        value_premise_id: "",
        report_type: "",
        valued_at: "",
        submitted_at: "",
        inspection_date: "",
        value: "",
        client_name: "",
        telephone: "",
        email: "",

        // Asset fields
        asset_name: "",
        asset_usage: "",
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null);

    /* =======================
       Initialize Form
    ======================= */

    useEffect(() => {
        if (!isOpen || !report) return;

        const formatDate = (d) =>
            d ? new Date(d).toISOString().split("T")[0] : "";

        setFormData({
            id: report.id || "",
            report_id: report.report_id || "",
            title: report.title || "",
            purpose_id: report.purpose_id?.toString() || "",
            value_premise_id: report.value_premise_id?.toString() || "",
            report_type: report.report_type || "تقرير مفصل",
            valued_at: formatDate(report.valued_at),
            submitted_at: formatDate(report.submitted_at),
            inspection_date: formatDate(report.inspection_date),
            value:
                report.value?.toString() ||
                report.final_value?.toString() ||
                "",
            client_name: report.client_name || "",
            telephone: report.telephone || "",
            email: report.email || "",

            // Asset fields
            asset_name: report.asset_name || "",
            asset_usage: report.asset_usage || "",
        });
    }, [isOpen, report]);

    /* =======================
       Validation
    ======================= */

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
            "client_name",
            "telephone",
            "email",
        ],
        []
    );

    const validate = () => {
        const errs = {};
        requiredFields.forEach((f) => {
            if (!formData[f]?.toString().trim()) errs[f] = "Required";
        });
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    /* =======================
       Submit
    ======================= */

    const handleSubmit = async () => {
        if (!validate()) {
            setStatus({ type: "error", message: "Please fill all required fields." });
            return;
        }

        try {
            setSubmitting(true);
            setStatus(null);

            const { id, report_id, ...f } = formData;

            const updateData = {
                // Report fields
                title: f.title,
                client_name: f.client_name,
                purpose_id: Number(f.purpose_id),
                value_premise_id: Number(f.value_premise_id),
                report_type: f.report_type,
                valued_at: f.valued_at,
                submitted_at: f.submitted_at,
                inspection_date: f.inspection_date,
                final_value: Number(f.value),
                telephone: f.telephone,
                email: f.email,

                // Asset fields
                asset_name: f.asset_name,
                asset_usage: f.asset_usage,
            };

            const response = await updateUrgentReport(id, updateData);

            if (response.status === "success") {
                setStatus({
                    type: "success",
                    message: response.message || "Report updated successfully",
                });

                await refreshData?.();
                setTimeout(onClose, 1200);
            } else {
                setStatus({
                    type: "error",
                    message: response.error || "Update failed",
                });
            }
        } catch (err) {
            setStatus({
                type: "error",
                message: err.error || "Something went wrong",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    /* =======================
       Render
    ======================= */

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between">
                    <div>
                        <h2 className="text-xl font-bold">
                            Edit Report {report?.report_id}
                        </h2>
                        <p className="text-sm text-gray-600">
                            Asset: {report?.asset_name || "Unknown"}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={submitting}>
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {status && (
                        <div
                            className={`mb-6 rounded-lg border px-4 py-3 flex gap-3 ${status.type === "success"
                                    ? "border-green-200 bg-green-50 text-green-800"
                                    : "border-red-200 bg-red-50 text-red-800"
                                }`}
                        >
                            {status.type === "success" ? (
                                <CheckCircle2 className="w-5 h-5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5" />
                            )}
                            <div className="text-sm">{status.message}</div>
                        </div>
                    )}

                    {/* -------- Report Information -------- */}
                    <Section title="Report Information">
                        <InputField label="Report Title" required value={formData.title}
                            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                            error={errors.title}
                        />

                        <SelectField label="Valuation Purpose" required value={formData.purpose_id}
                            onChange={(e) => setFormData((p) => ({ ...p, purpose_id: e.target.value }))}
                            error={errors.purpose_id}
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
                        />

                        <SelectField label="Value Premise" required value={formData.value_premise_id}
                            onChange={(e) => setFormData((p) => ({ ...p, value_premise_id: e.target.value }))}
                            error={errors.value_premise_id}
                            options={[
                                { value: "", label: "Select" },
                                { value: "1", label: "Highest and Best Use" },
                                { value: "2", label: "Current Use" },
                                { value: "3", label: "Orderly Liquidation" },
                                { value: "4", label: "Forced Sale" },
                                { value: "5", label: "Other" },
                            ]}
                        />

                        <RadioGroup label="Report Type" value={formData.report_type}
                            onChange={(v) => setFormData((p) => ({ ...p, report_type: v }))}
                            options={[
                                { value: "تقرير مفصل", label: "Detailed Report" },
                                { value: "ملخص التقرير", label: "Report Summary" },
                                { value: "مراجعة مع قيمة جديدة", label: "Review with New Value" },
                                { value: "مراجعة بدون قيمة جديدة", label: "Review without New Value" },
                            ]}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <InputField label="Valued At" required type="date" value={formData.valued_at}
                                onChange={(e) => setFormData((p) => ({ ...p, valued_at: e.target.value }))}
                                error={errors.valued_at}
                            />
                            <InputField label="Submitted At" required type="date" value={formData.submitted_at}
                                onChange={(e) => setFormData((p) => ({ ...p, submitted_at: e.target.value }))}
                                error={errors.submitted_at}
                            />
                        </div>

                        <InputField label="Inspection Date" required type="date"
                            value={formData.inspection_date}
                            onChange={(e) => setFormData((p) => ({ ...p, inspection_date: e.target.value }))}
                            error={errors.inspection_date}
                        />

                        <InputField label="Value" required type="number"
                            value={formData.value}
                            onChange={(e) => setFormData((p) => ({ ...p, value: e.target.value }))}
                            error={errors.value}
                        />
                    </Section>

                    {/* -------- Client Information -------- */}
                    <Section title="Client Information">
                        <InputField label="Client Name" required value={formData.client_name}
                            onChange={(e) => setFormData((p) => ({ ...p, client_name: e.target.value }))}
                            error={errors.client_name}
                        />
                        <InputField label="Telephone" required value={formData.telephone}
                            onChange={(e) => setFormData((p) => ({ ...p, telephone: e.target.value }))}
                            error={errors.telephone}
                        />
                        <InputField label="Email" required type="email" value={formData.email}
                            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                            error={errors.email}
                        />
                    </Section>

                    {/* -------- Asset Data -------- */}
                    <Section title="Asset Data">
                        <InputField
                            label="Asset Name"
                            value={formData.asset_name}
                            onChange={(e) =>
                                setFormData((p) => ({ ...p, asset_name: e.target.value }))
                            }
                        />
                        <InputField
                            label="Asset Usage"
                            value={formData.asset_usage}
                            onChange={(e) =>
                                setFormData((p) => ({ ...p, asset_usage: e.target.value }))
                            }
                        />
                    </Section>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={onClose} disabled={submitting}
                            className="px-4 py-2 bg-gray-100 rounded">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded flex gap-2 items-center">
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving…
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
