const httpClient = require("./httpClient")

const uploadAssetDataToDatabase = async (reportId, reportData) => {
    const url = `/report/createReport`;
    return await httpClient.post(url, { reportId, reportData });
};

const reportExistenceCheck = async (reportId) => {
    const url = `/report/reportExistenceCheck/${reportId}`;
    return await httpClient.get(url);
}

const addCommonFields = async (reportId, inspectionDate, region, city, ownerName) => {
    const url = '/report/addCommonFields';
    return await httpClient.put(url, { reportId, inspectionDate, region, city, ownerName });
}

const checkMissingPages = async (reportId) => {
    const url = `/report/checkMissingPages/${reportId}`;
    return await httpClient.get(url);
}

module.exports = {
    uploadAssetDataToDatabase,
    reportExistenceCheck,
    addCommonFields,
    checkMissingPages
};