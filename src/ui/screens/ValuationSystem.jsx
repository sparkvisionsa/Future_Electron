import React, { useState } from 'react';
import { FolderPlus, FileSpreadsheet, RefreshCw, CheckCircle2, AlertTriangle, Loader2, Info, Save, FolderOpen, ListTree, FileText, Calculator, Images, BadgeCheck } from 'lucide-react';

const ValuationSystem = () => {
    const [basePath, setBasePath] = useState('');
    const [folderName, setFolderName] = useState('');
    const [dataFileName, setDataFileName] = useState('');
    const [dataFilePath, setDataFilePath] = useState('');
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [loadingCalc, setLoadingCalc] = useState(false);
    const [loadingDocx, setLoadingDocx] = useState(false);
    const [loadingValueCalcs, setLoadingValueCalcs] = useState(false);
    const [loadingPreviewImages, setLoadingPreviewImages] = useState(false);
    const [loadingRegCerts, setLoadingRegCerts] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const chooseBaseFolder = async () => {
        if (!window?.electronAPI?.selectFolder) {
            setError('Folder picker is not available in this build.');
            return;
        }
        try {
            const chosen = await window.electronAPI.selectFolder();
            const path = chosen?.folderPath || chosen?.filePaths?.[0];
            if (path) {
                setBasePath(path);
            }
        } catch (err) {
            setError(err?.message || 'Failed to select folder.');
        }
    };

    const chooseDataFile = async () => {
        if (!window?.electronAPI?.showOpenDialog) {
            setError('File picker is not available.');
            return;
        }
        try {
            const res = await window.electronAPI.showOpenDialog();
            const path = res?.filePaths?.[0];
            if (path) {
                setDataFilePath(path);
                const parts = path.split(/[/\\]/);
                setDataFileName(parts[parts.length - 1] || 'Data.xlsx');
                setResult(null);
                setError('');
            }
        } catch (err) {
            setError(err?.message || 'تعذر اختيار الملف.');
        }
    };

    const resetForm = () => {
        setBasePath('');
        setFolderName('');
        setDataFileName('');
        setDataFilePath('');
        setResult(null);
        setError('');
    };

    const handleCreateFolders = async () => {
        setError('');
        setResult(null);
        if (!basePath || !folderName || !dataFilePath) {
            setError('حدد مسار المجلد، اسم المجلد، وملف Data.xlsx أولاً.');
            return;
        }
        if (!window?.electronAPI?.createValuationFolders) {
            setError('الميزة غير متوفرة في هذا الإصدار.');
            return;
        }
        setLoadingFolders(true);
        try {
            const payload = { basePath, folderName, dataExcelPath: dataFilePath };
            const res = await window.electronAPI.createValuationFolders(payload);
            if (res?.ok) {
                setResult(res);
            } else {
                setError(res?.error || 'تعذر إنشاء المجلدات.');
            }
        } catch (err) {
            setError(err?.message || 'تعذر إنشاء المجلدات.');
        } finally {
            setLoadingFolders(false);
        }
    };

    const handleUpdateCalc = async () => {
        setError('');
        setResult(null);
        if (!basePath || !folderName || !dataFilePath) {
            setError('حدد مسار المجلد، اسم المجلد، وملف Data.xlsx أولاً.');
            return;
        }
        if (!window?.electronAPI?.updateValuationCalc) {
            setError('الميزة غير متوفرة في هذا الإصدار.');
            return;
        }
        setLoadingCalc(true);
        try {
            const payload = { basePath, folderName, dataExcelPath: dataFilePath };
            const res = await window.electronAPI.updateValuationCalc(payload);
            if (res?.ok) {
                setResult(res);
            } else {
                setError(res?.error || 'تعذر تحديث calc.xlsx.');
            }
        } catch (err) {
            setError(err?.message || 'تعذر تحديث calc.xlsx.');
        } finally {
            setLoadingCalc(false);
        }
    };

    const handleCreateDocx = async () => {
        setError('');
        setResult(null);
        if (!basePath || !folderName) {
            setError('حدد مسار المجلد واسم المجلد أولاً.');
            return;
        }
        if (!window?.electronAPI?.createValuationDocx) {
            setError('الميزة غير متوفرة في هذا الإصدار.');
            return;
        }
        setLoadingDocx(true);
        try {
            const payload = { basePath, folderName };
            const res = await window.electronAPI.createValuationDocx(payload);
            if (res?.ok) {
                setResult(res);
            } else {
                setError(res?.error || 'تعذر إنشاء ملفات DOCX.');
            }
        } catch (err) {
            setError(err?.message || 'تعذر إنشاء ملفات DOCX.');
        } finally {
            setLoadingDocx(false);
        }
    };

    const handleValueCalcs = async () => {
        setError('');
        setResult(null);
        if (!basePath || !folderName) {
            setError('حدد مسار المجلد واسم المجلد أولاً.');
            return;
        }
        if (!window?.electronAPI?.generateValuationValueCalcs) {
            setError('الميزة غير متوفرة في هذا الإصدار.');
            return;
        }
        setLoadingValueCalcs(true);
        try {
            const payload = { basePath, folderName };
            const res = await window.electronAPI.generateValuationValueCalcs(payload);
            if (res?.ok) {
                setResult(res);
            } else {
                setError(res?.error || 'تعذر إنشاء صور الحساب داخل الملفات.');
            }
        } catch (err) {
            setError(err?.message || 'تعذر إنشاء صور الحساب داخل الملفات.');
        } finally {
            setLoadingValueCalcs(false);
        }
    };

    const handleAppendPreviewImages = async () => {
        setError('');
        setResult(null);
        if (!basePath || !folderName) {
            setError('حدد مسار المجلد واسم المجلد أولاً.');
            return;
        }
        if (!window?.electronAPI?.appendValuationPreviewImages) {
            setError('الميزة غير متوفرة في هذا الإصدار.');
            return;
        }
        setLoadingPreviewImages(true);
        try {
            const payload = { basePath, folderName };
            const res = await window.electronAPI.appendValuationPreviewImages(payload);
            if (res?.ok) {
                setResult(res);
            } else {
                setError(res?.error || 'تعذر إرفاق الصور داخل الملفات.');
            }
        } catch (err) {
            setError(err?.message || 'تعذر إرفاق الصور داخل الملفات.');
        } finally {
            setLoadingPreviewImages(false);
        }
    };

    const handleAppendRegistrationCertificates = async () => {
        setError('');
        setResult(null);
        if (!basePath || !folderName) {
            setError('حدد مسار المجلد واسم المجلد أولاً.');
            return;
        }
        if (!window?.electronAPI?.appendValuationRegistrationCertificates) {
            setError('الميزة غير متوفرة في هذا الإصدار.');
            return;
        }
        setLoadingRegCerts(true);
        try {
            const payload = { basePath, folderName };
            const res = await window.electronAPI.appendValuationRegistrationCertificates(payload);
            if (res?.ok) {
                setResult(res);
            } else {
                setError(res?.error || 'تعذر إرفاق شهادات التسجيل داخل الملفات.');
            }
        } catch (err) {
            setError(err?.message || 'تعذر إرفاق شهادات التسجيل داخل الملفات.');
        } finally {
            setLoadingRegCerts(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <ListTree className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="space-y-1">
                    <p className="text-lg font-bold text-gray-900">نظام التقييم</p>
                    <p className="text-sm text-gray-600">
                        إنشاء هيكل المجلدات، قراءة ملف Data.xlsx، إنشاء مجلدات المواقع واللوحات، وتثبيت calc.xlsx تلقائياً.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                        <FolderPlus className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-900">تحديد مسار المجلد الأساسي</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700">مسار المجلد</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={basePath}
                                onChange={(e) => setBasePath(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="مثال: /home/user/Documents"
                            />
                            <button
                                type="button"
                                onClick={chooseBaseFolder}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
                            >
                                <FolderOpen className="w-4 h-4" />
                                اختر
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700">اسم المجلد الجديد</label>
                        <input
                            type="text"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="اسم مجلد التقييم"
                        />
                    </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-gray-900">رفع ملف Data.xlsx</h3>
                    </div>
                    <p className="text-xs text-gray-600">
                        سيتم قراءة العمود G لإنشاء مجلدات المواقع، والعمود B لإنشاء مجلدات اللوحات داخل كل موقع.
                    </p>
                    <button
                        type="button"
                        onClick={chooseDataFile}
                        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition text-sm text-gray-800"
                    >
                        <span className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            {dataFileName || 'اختر ملف Data.xlsx'}
                        </span>
                        <span className="text-xs text-blue-600 font-semibold">استعراض</span>
                    </button>
                    {dataFilePath ? (
                        <p className="text-xs text-gray-500 break-all">المسار: {dataFilePath}</p>
                    ) : (
                        <p className="text-xs text-red-600">لم يتم اختيار ملف Data.xlsx</p>
                    )}
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        سيتم تثبيت calc.xlsx تلقائياً في المجلد 3.
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={handleCreateFolders}
                    disabled={loadingFolders}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                    {loadingFolders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    إنشاء المجلدات
                </button>
                <button
                    type="button"
                    onClick={handleUpdateCalc}
                    disabled={loadingCalc}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                    {loadingCalc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    تحديث calc.xlsx
                </button>
                <button
                    type="button"
                    onClick={handleCreateDocx}
                    disabled={loadingDocx}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                    {loadingDocx ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    إنشاء ملفات DOCX
                </button>
                <button
                    type="button"
                    onClick={handleValueCalcs}
                    disabled={loadingValueCalcs}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loadingValueCalcs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                    حساب القيمة (DOCX)
                </button>
                <button
                    type="button"
                    onClick={handleAppendPreviewImages}
                    disabled={loadingPreviewImages}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fuchsia-600 text-white text-sm font-semibold hover:bg-fuchsia-700 disabled:opacity-50"
                >
                    {loadingPreviewImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Images className="w-4 h-4" />}
                    إرفاق صور المعاينة (DOCX)
                </button>
                <button
                    type="button"
                    onClick={handleAppendRegistrationCertificates}
                    disabled={loadingRegCerts}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
                >
                    {loadingRegCerts ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                    إرفاق شهادات التسجيل (DOCX)
                </button>
                <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-gray-800 text-sm font-semibold hover:bg-slate-200"
                >
                    <RefreshCw className="w-4 h-4" />
                    إعادة ضبط
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            {result?.ok && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold">
                            {result.calcPath ? 'تم تحديث calc.xlsx بنجاح' : 'تم إنشاء المجلدات بنجاح'}
                        </span>
                    </div>
                    <div className="text-sm text-emerald-900 space-y-1">
                        <p>المسار الرئيسي: <span className="font-mono break-all">{result.root}</span></p>
                        {result.created && (
                            <>
                                <p>المجلدات الرئيسية: {result.created?.mainFolders?.length || 0}</p>
                                <p>مجلدات المواقع: {result.created?.locations || 0}</p>
                                <p>مجلدات اللوحات: {result.created?.plates || 0}</p>
                            </>
                        )}
                        {result.calcPath && (
                            <p>تم تثبيت calc.xlsx في: <span className="font-mono break-all">{result.calcPath}</span></p>
                        )}
                        {typeof result.docsCreated === 'number' && (
                            <p>تم إنشاء ملفات DOCX: {result.docsCreated}</p>
                        )}
                        {typeof result.processed === 'number' && (
                            <p>تم إدراج صور الحساب في: {result.processed} ملف (تخطي: {result.skipped || 0})</p>
                        )}
                        {typeof result.previewProcessed === 'number' && (
                            <p>تم إدراج صور المعاينة في: {result.previewProcessed} ملف (تخطي: {result.previewSkipped || 0})</p>
                        )}
                        {typeof result.certProcessed === 'number' && (
                            <p>تم إدراج شهادات التسجيل في: {result.certProcessed} ملف (تخطي: {result.certSkipped || 0})</p>
                        )}
                        {result.imagesDir && (
                            <p>تم حفظ صور الحسابات في: <span className="font-mono break-all">{result.imagesDir}</span></p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ValuationSystem;
