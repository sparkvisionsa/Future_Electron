import React, { createContext, useContext, useMemo, useState } from "react";
const usePersistentState = require("../hooks/usePersistentState");

const ElrajhiUploadContext = createContext(null);

export const useElrajhiUpload = () => {
    const ctx = useContext(ElrajhiUploadContext);
    if (!ctx) {
        throw new Error("useElrajhiUpload must be used within ElrajhiUploadProvider");
    }
    return ctx;
};

export const ElrajhiUploadProvider = ({ children }) => {
    const [activeTab, setActiveTab] = usePersistentState("elrajhi:activeTab", "no-validation");
    const [excelFile, setExcelFile] = useState(null);
    const [pdfFiles, setPdfFiles] = useState([]);
    const [validationFolderFiles, setValidationFolderFiles] = useState([]);
    const [validationExcelFile, setValidationExcelFile] = useState(null);
    const [validationPdfFiles, setValidationPdfFiles] = useState([]);

    const resetAllFiles = () => {
        setExcelFile(null);
        setPdfFiles([]);
        setValidationFolderFiles([]);
        setValidationExcelFile(null);
        setValidationPdfFiles([]);
    };

    const value = useMemo(() => ({
        activeTab,
        setActiveTab,
        excelFile,
        setExcelFile,
        pdfFiles,
        setPdfFiles,
        validationFolderFiles,
        setValidationFolderFiles,
        validationExcelFile,
        setValidationExcelFile,
        validationPdfFiles,
        setValidationPdfFiles,
        resetAllFiles,
    }), [activeTab, pdfFiles, validationFolderFiles, validationExcelFile, validationPdfFiles, excelFile]);

    return (
        <ElrajhiUploadContext.Provider value={value}>
            {children}
        </ElrajhiUploadContext.Provider>
    );
};

export default ElrajhiUploadContext;
