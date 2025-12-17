const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const PizZip = require('pizzip');

const MAIN_FOLDERS = [
    '1.ملفات العميل',
    '2.صور المعاينة',
    '3.اعداد مسودة التقرير و حسابات القيمة',
    '4.التقرير بالتوقيع',
    '5.ملفات التسليم النهائية'
];

const LOCATION_FOLDER_INDEX = 1; // second folder
const CALC_SOURCE_PATH = path.resolve(__dirname, '../../../excelfile_calc/calc.xlsx');
const REPORT_TEMPLATE_PATH = path.resolve(__dirname, '../../../excelfile_calc/report.docx');
const CALC_TARGET_NAME = 'calc.xlsx';
const VALUE_IMAGE_FOLDER = 'valu calculations';
const DOCX_MARKER_TEXT = 'مرفق 1: الوصف الجزئي وحسابات القيمة';
const DOCX_PREVIEW_MARKER_TEXT = 'مرفق 2: الصور الفوتوغرافية';
const PREVIEW_IMAGES_TABLE_CAPTION = 'TAQEEM_PREVIEW_IMAGES';

const sanitizeName = (name) => {
    if (!name && name !== 0) return '';
    const raw = typeof name === 'object' && name.text ? name.text : String(name);
    return raw.trim().replace(/[<>:"/\\|?*]/g, '-');
};

async function ensureDir(dirPath) {
    await fs.promises.mkdir(dirPath, { recursive: true });
}

async function copyCalcFile(targetDir) {
    const sourceExists = fs.existsSync(CALC_SOURCE_PATH);
    if (!sourceExists) {
        throw new Error(`calc.xlsx not found at ${CALC_SOURCE_PATH}`);
    }
    const targetPath = path.join(targetDir, CALC_TARGET_NAME);
    await fs.promises.copyFile(CALC_SOURCE_PATH, targetPath);
    return targetPath;
}

async function readLocationsAndPlates(dataExcelPath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(dataExcelPath);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Data sheet is empty.');

    const locations = [];
    const locationIndex = new Map(); // location name -> index in locations array

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // assume header
        const locationRaw = sanitizeName(row.getCell('G').value);
        const plateRaw = sanitizeName(row.getCell('B').value);
        const plateNumberRaw = sanitizeName(row.getCell('A').value);
        if (!locationRaw) return;

        if (!locationIndex.has(locationRaw)) {
            locationIndex.set(locationRaw, locations.length);
            locations.push({ name: locationRaw, plates: [] });
        }

        if (plateRaw) {
            const loc = locations[locationIndex.get(locationRaw)];
            const exists = loc.plates.find((p) => p.name === plateRaw && p.number === plateNumberRaw);
            if (!exists) loc.plates.push({ name: plateRaw, number: plateNumberRaw });
        }
    });

    return locations;
}

function getSheetBounds(sheet) {
    let maxRow = 0;
    let maxCol = 0;
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (!row.hasValues) return;
        maxRow = Math.max(maxRow, rowNumber);
        row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
            maxCol = Math.max(maxCol, colNumber);
        });
    });
    return { maxRow, maxCol };
}

function computeCellValue(sheet, address, workbook, cache = new Map(), stack = new Set()) {
    if (!sheet || !address) return '';
    const key = `${sheet.name}::${address}`;
    if (cache.has(key)) return cache.get(key);
    if (stack.has(key)) return ''; // cycle guard
    stack.add(key);

    const cell = sheet.getCell(address);
    const raw = cell?.value;

    const finish = (val) => {
        cache.set(key, val);
        stack.delete(key);
        return val;
    };

    if (raw === null || typeof raw === 'undefined') return finish('');
    if (raw === 0 || raw === false) return finish(raw);
    if (typeof raw === 'string' || typeof raw === 'number') return finish(raw);
    if (raw instanceof Date) return finish(raw.toLocaleDateString('en-GB'));

    if (typeof raw === 'object') {
        if (typeof raw.result !== 'undefined' && raw.result !== null) return finish(raw.result);

        const formulaStr = raw.formula || raw.sharedFormula;
        if (formulaStr) {
            const exprRaw = formulaStr.startsWith('=') ? formulaStr.slice(1) : formulaStr;

            const parseRef = (rawRef) => {
                if (!rawRef) return null;
                const refRegex = /^'?([^'!]+)'?!\$?([A-Z]+)\$?([0-9]+)$/u;
                const noSheetRegex = /^\$?([A-Z]+)\$?([0-9]+)$/u;
                const m1 = rawRef.match(refRegex);
                if (m1) return { sheetName: m1[1], col: m1[2], row: m1[3] };
                const m2 = rawRef.match(noSheetRegex);
                if (m2) return { sheetName: null, col: m2[1], row: m2[2] };
                return null;
            };

            const simpleSheetRef = parseRef(exprRaw);
            if (simpleSheetRef) {
                const targetSheet = simpleSheetRef.sheetName ? (workbook?.getWorksheet(simpleSheetRef.sheetName) || sheet) : sheet;
                const addr = `${simpleSheetRef.col}${simpleSheetRef.row}`;
                return finish(computeCellValue(targetSheet, addr, workbook, cache, stack));
            }

            if (/[^0-9A-Za-z_!+*\/\-\(\)\.\s]/.test(exprRaw)) {
                return finish('');
            }

            let expr = exprRaw;
            expr = expr.replace(/'([^']+)'!\$?([A-Z]+)\$?([0-9]+)/gu, (_m, sheetName, col, row) => {
                const refSheet = workbook?.getWorksheet(sheetName) || sheet;
                const addr = `${col}${row}`;
                const val = computeCellValue(refSheet, addr, workbook, cache, stack);
                const num = Number(val);
                return Number.isFinite(num) ? num : 0;
            });
            expr = expr.replace(/([A-Za-z0-9 _.-]+)!\$?([A-Z]+)\$?([0-9]+)/g, (_m, sheetName, col, row) => {
                const refSheet = workbook?.getWorksheet(sheetName) || sheet;
                const addr = `${col}${row}`;
                const val = computeCellValue(refSheet, addr, workbook, cache, stack);
                const num = Number(val);
                return Number.isFinite(num) ? num : 0;
            });
            expr = expr.replace(/\$?([A-Z]+)\$?([0-9]+)/g, (_m, col, row) => {
                const addr = `${col}${row}`;
                const val = computeCellValue(sheet, addr, workbook, cache, stack);
                const num = Number(val);
                return Number.isFinite(num) ? num : 0;
            });

            try {
                // eslint-disable-next-line no-new-func
                const result = Function(`"use strict"; return (${expr});`)();
                return finish(result);
            } catch (_) {
                return finish('');
            }
        }

        if (Array.isArray(raw.richText)) return finish(raw.richText.map((r) => r.text).join(''));
        if (raw.text) return finish(raw.text);
    }

    return finish('');
}

function getCellDisplay(cell, workbook, currentSheet) {
    if (!cell) return '';
    try {
        const t = cell.text;
        if (typeof t === 'number') return applyCustomFormat(String(t), cell.address, workbook);
        if (typeof t === 'string' && t.trim().length) return applyCustomFormat(t.trim(), cell.address, workbook);
    } catch (_) {
        // exceljs may throw on merged cells; ignore and fallback to value
    }

    const v = cell.value;
    if (v === 0 || v === false) return applyCustomFormat(String(v), cell.address, workbook);
    if (v === null || typeof v === 'undefined') return applyCustomFormat('', cell.address, workbook);
    if (typeof v === 'string' || typeof v === 'number') return applyCustomFormat(String(v), cell.address, workbook);
    if (v instanceof Date) return applyCustomFormat(v.toLocaleDateString('en-GB'), cell.address, workbook);
    if (typeof v === 'object') {
        if (v.formula || v.sharedFormula) {
            const formulaStr = (v.formula || v.sharedFormula || '').toString();
            const directDataRef = formulaStr.match(/^[=]?\s*data!\$?([A-Z]+)\$?([0-9]+)/i);
            if (directDataRef) {
                const col = directDataRef[1];
                const row = directDataRef[2];
                const dataSheet = workbook?.getWorksheet('data') || workbook?.getWorksheet('Data') || workbook?.worksheets.find((ws) => ws.name.toLowerCase() === 'data');
                const refCell = dataSheet?.getCell(`${col}${row}`);
                if (refCell) {
                    try {
                        const refText = refCell.text;
                        if (typeof refText !== 'undefined' && refText !== null) return applyCustomFormat(String(refText), cell.address, workbook);
                    } catch (_) { /* ignore */ }
                    const refVal = refCell.value;
                    if (refVal !== null && typeof refVal !== 'undefined') return applyCustomFormat(String(refVal), cell.address, workbook);
                }
            }
        }
        const addr = cell.address;
        const computed = computeCellValue(currentSheet, addr, workbook);
        if (computed !== undefined && computed !== null && computed !== '') return applyCustomFormat(String(computed), addr, workbook);
        if (Array.isArray(v.richText)) return applyCustomFormat(v.richText.map((r) => r.text).join(''), addr, workbook);
        if (v.text) return applyCustomFormat(String(v.text), addr, workbook);
        if (typeof v.result !== 'undefined' && v.result !== null) return applyCustomFormat(String(v.result), addr, workbook);
        if (typeof v.formula !== 'undefined') {
            const res = typeof cell.result !== 'undefined' && cell.result !== null ? cell.result : v.result;
            if (typeof res !== 'undefined' && res !== null) return applyCustomFormat(String(res), addr, workbook);
            return applyCustomFormat(v.formula ? String(v.formula) : '', addr, workbook);
        }
    }
    const formatted = applyCustomFormat('', cell.address, workbook);
    return formatted;
}

function formatNumberWithCommas(str) {
    const num = Number(str);
    if (!Number.isFinite(num)) return str;
    if (Math.abs(num) < 1000) return str;
    const [intPart, decPart] = num.toString().split('.');
    const formattedInt = Number(intPart).toLocaleString('en-US');
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}

function applyCustomFormat(rawValue, cellAddress, workbook) {
    const match = cellAddress?.match(/^([A-Z]+)([0-9]+)$/);
    const inRange = (c, r, ranges) => ranges.some(([sc, sr, ec, er]) => {
        const colIdx = (name) => name.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
        const cIdx = colIdx(c);
        const scIdx = colIdx(sc);
        const ecIdx = colIdx(ec);
        return cIdx >= scIdx && cIdx <= ecIdx && r >= sr && r <= er;
    });

    // Excluded from default zero filling
    const zeroExclusions = [
        ['B', 1, 'K', 1],
        ['B', 4, 'K', 4],
        ['L', 1, 'N', 4]
    ];

    if (!match) {
        const valStr = rawValue === null || typeof rawValue === 'undefined' ? '' : String(rawValue);
        return valStr;
    }

    const col = match[1];
    const row = Number(match[2]);
    const isExcluded = inRange(col, row, zeroExclusions);
    const value = rawValue === null || typeof rawValue === 'undefined' || rawValue === '' ? (isExcluded ? '' : '0') : String(rawValue);

    const percentRanges = [
        ['G', 6, 'G', 8],
        ['I', 6, 'I', 8],
        ['K', 6, 'K', 8],
        ['L', 6, 'L', 8]
    ];
    const currencyCells = [
        ['K', 3, 'K', 3],
        ['E', 6, 'E', 8],
        ['M', 6, 'M', 8]
    ];
    const noCommaRanges = [
        ['G', 3, 'G', 3],
        ['F', 6, 'F', 8]
    ];

    // Percent formatting (convert decimals to percent)
    if (inRange(col, row, percentRanges)) {
        let numStr = value.trim();
        if (numStr === '') numStr = '0';
        let numVal = Number(numStr.replace('%', ''));
        if (Number.isFinite(numVal)) {
            if (Math.abs(numVal) <= 1) {
                numVal = numVal * 100;
            }
            const rounded = Number(numVal.toFixed(2));
            const absRounded = Math.abs(rounded);
            const display = absRounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
            const formatted = formatNumberWithCommas(display);
            return `${formatted}%`;
        }
        return `${numStr}%`;
    }

    // Currency formatting
    if (inRange(col, row, currencyCells)) {
        const numStr = value.trim() === '' ? '0' : value;
        const formatted = formatNumberWithCommas(numStr);
        return `${formatted} ر.س.`;
    }

    // Default number formatting with commas if > 1000
    const num = Number(value);
    if (Number.isFinite(num)) {
        if (inRange(col, row, noCommaRanges)) return value;
        return formatNumberWithCommas(value);
    }

    return value;
}

async function copyDataSheet(dataExcelPath, calcPath) {
    const dataWorkbook = new ExcelJS.Workbook();
    await dataWorkbook.xlsx.readFile(dataExcelPath);
    const sourceSheet = dataWorkbook.getWorksheet('data') || dataWorkbook.worksheets[0];
    if (!sourceSheet) throw new Error('لم يتم العثور على شيت data في ملف Data.xlsx');

    const calcWorkbook = new ExcelJS.Workbook();
    await calcWorkbook.xlsx.readFile(calcPath);
    let targetSheet = calcWorkbook.getWorksheet('data');
    if (!targetSheet) {
        targetSheet = calcWorkbook.addWorksheet('data');
    }

    // Clear old rows
    if (targetSheet.rowCount > 0) {
        targetSheet.spliceRows(1, targetSheet.rowCount);
    }

    const { maxRow, maxCol } = getSheetBounds(sourceSheet);

    for (let r = 1; r <= maxRow; r++) {
        const sourceRow = sourceSheet.getRow(r);
        const targetRow = targetSheet.getRow(r);
        for (let c = 1; c <= maxCol; c++) {
            targetRow.getCell(c).value = sourceRow.getCell(c).value;
        }
        targetRow.commit();
    }

    forceRightToLeft(targetSheet, sourceSheet);
    const templateSheet = calcWorkbook.getWorksheet('calc') || calcWorkbook.worksheets[0];
    if (templateSheet) forceRightToLeft(templateSheet, templateSheet);

    await calcWorkbook.xlsx.writeFile(calcPath);
}

function cloneSheet(templateSheet, targetSheet) {
    const { maxRow, maxCol } = getSheetBounds(templateSheet);

    // Copy column properties
    templateSheet.columns.forEach((col, idx) => {
        const tCol = targetSheet.getColumn(idx + 1);
        tCol.width = col.width;
        tCol.hidden = col.hidden;
        tCol.outlineLevel = col.outlineLevel;
    });

    // Copy rows/cells (values + styles) within used bounds
    for (let r = 1; r <= maxRow; r++) {
        const row = templateSheet.getRow(r);
        const targetRow = targetSheet.getRow(r);
        targetRow.height = row.height;
        for (let c = 1; c <= maxCol; c++) {
            const cell = row.getCell(c);
            const tCell = targetRow.getCell(c);
            tCell.value = cell.value;
            // Shallow clone style props to preserve design
            if (cell.style) tCell.style = JSON.parse(JSON.stringify(cell.style));
            if (cell.numFmt) tCell.numFmt = cell.numFmt;
            if (cell.alignment) tCell.alignment = JSON.parse(JSON.stringify(cell.alignment));
            if (cell.font) tCell.font = JSON.parse(JSON.stringify(cell.font));
            if (cell.border) tCell.border = JSON.parse(JSON.stringify(cell.border));
            if (cell.fill) tCell.fill = JSON.parse(JSON.stringify(cell.fill));
        }
        targetRow.commit();
    }

    // Copy merged cells
    const merges = templateSheet.model?.merges || templateSheet._merges;
    if (merges) {
        const mergeList = Array.isArray(merges)
            ? merges
            : (typeof merges === 'object' ? Object.keys(merges) : []);
        mergeList.forEach((merge) => {
            try {
                targetSheet.mergeCells(merge);
            } catch (err) {
                console.warn('[MAIN] Failed to merge cells', merge, err?.message);
            }
        });
    }

    forceRightToLeft(targetSheet, templateSheet);
}

function forceRightToLeft(sheet, templateSheet) {
    if (!sheet) return;
    const baseView = (templateSheet?.views && templateSheet.views[0]) || (sheet.views && sheet.views[0]) || {};
    const view = {
        state: baseView.state || 'normal',
        rightToLeft: true,
        showGridLines: typeof baseView.showGridLines === 'boolean' ? baseView.showGridLines : true,
        showRowColHeaders: typeof baseView.showRowColHeaders === 'boolean' ? baseView.showRowColHeaders : true,
        zoomScale: baseView.zoomScale,
        zoomScaleNormal: baseView.zoomScaleNormal
    };
    sheet.views = [view];
}

function setDataRefs(sheet, dataRowIndex) {
    const setRef = (addr, col) => {
        sheet.getCell(addr).value = { formula: `data!${col}${dataRowIndex}` };
    };

    // Top row mappings
    setRef('C3', 'B');
    setRef('D3', 'C');
    setRef('E3', 'D');
    setRef('F3', 'E');
    setRef('G3', 'F');
    setRef('H3', 'M');
    setRef('I3', 'G');
    setRef('J3', 'L');
    setRef('K3', 'N');

    // Rows 6-8 mappings
    ['C6', 'C7', 'C8'].forEach((addr) => setRef(addr, 'C'));
    ['D6', 'D7', 'D8'].forEach((addr) => setRef(addr, 'D'));

    setRef('E6', 'O');
    setRef('E7', 'V');
    setRef('E8', 'AC');

    setRef('F6', 'P');
    setRef('F7', 'W');
    setRef('F8', 'AD');

    setRef('G6', 'Q');
    setRef('G7', 'X');
    setRef('G8', 'AE');

    setRef('H6', 'T');
    setRef('H7', 'AA');
    setRef('H8', 'AH');

    setRef('I6', 'U');
    setRef('I7', 'AB');
    setRef('I8', 'AI');

    setRef('J6', 'R');
    setRef('J7', 'Y');
    setRef('J8', 'AF');

    setRef('K6', 'S');
    setRef('K7', 'Z');
    setRef('K8', 'AG');

    // Inline calculations on the same sheet
    sheet.getCell('L6').value = { formula: 'K6+I6+G6' };
    sheet.getCell('L7').value = { formula: 'K7+I7+G7' };
    sheet.getCell('L8').value = { formula: 'K8+I8+G8' };

    sheet.getCell('M6').value = { formula: 'E6+(E6*L6)' };
    sheet.getCell('M7').value = { formula: 'E7+(E7*L7)' };
    sheet.getCell('M8').value = { formula: 'E8+(E8*L8)' };
}

async function createCalcSheets(dataExcelPath, calcPath) {
    const dataWorkbook = new ExcelJS.Workbook();
    await dataWorkbook.xlsx.readFile(dataExcelPath);
    const dataSheet = dataWorkbook.getWorksheet('data') || dataWorkbook.worksheets[0];
    if (!dataSheet) throw new Error('لم يتم العثور على شيت data في ملف Data.xlsx');
    const { maxRow: dataMaxRow } = getSheetBounds(dataSheet);

    const calcWorkbook = new ExcelJS.Workbook();
    await calcWorkbook.xlsx.readFile(calcPath);

    const templateSheet = calcWorkbook.getWorksheet('calc') || calcWorkbook.worksheets[0];
    if (!templateSheet) throw new Error('لم يتم العثور على شيت calc في calc.xlsx');
    forceRightToLeft(templateSheet, templateSheet);

    const calcDataSheet = calcWorkbook.getWorksheet('data');
    if (calcDataSheet) forceRightToLeft(calcDataSheet, templateSheet);

    // Clear previously generated sheets, keep template and data
    const keepNames = new Set(['calc', 'data']);
    calcWorkbook.worksheets
        .filter((ws) => !keepNames.has(ws.name))
        .forEach((ws) => calcWorkbook.removeWorksheet(ws.id));

    const usedNames = new Set(calcWorkbook.worksheets.map((ws) => ws.name));
    const makeName = (raw, fallbackIndex) => {
        const base = sanitizeName(raw) || `Sheet_${fallbackIndex}`;
        let name = base;
        let i = 1;
        while (usedNames.has(name)) {
            name = `${base}_${i}`;
            i += 1;
        }
        usedNames.add(name);
        return name;
    };

    const lastRow = dataMaxRow || dataSheet.lastRow?.number || dataSheet.rowCount;
    for (let r = 2; r <= lastRow; r++) {
        const dataRow = dataSheet.getRow(r);
        const nameCell = dataRow.getCell('B').value;
        if (!nameCell) continue; // skip empty
        const sheetName = makeName(nameCell, r);

        const newSheet = calcWorkbook.addWorksheet(sheetName);
        cloneSheet(templateSheet, newSheet);
        setDataRefs(newSheet, r);
        forceRightToLeft(newSheet, templateSheet);
    }

    // Safety: enforce RTL on every sheet
    calcWorkbook.worksheets.forEach((ws) => forceRightToLeft(ws, templateSheet));

    await calcWorkbook.xlsx.writeFile(calcPath);
}

async function readDocxNamesFromCalc(calcPath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(calcPath);
    const sheet = workbook.getWorksheet('data') || workbook.worksheets[0];
    if (!sheet) throw new Error('لم يتم العثور على شيت data في calc.xlsx');

    const { maxRow } = getSheetBounds(sheet);
    const names = [];
    for (let r = 2; r <= maxRow; r++) {
        const row = sheet.getRow(r);
        const colA = sanitizeName(row.getCell('A').value) || `${r - 1}`;
        const colB = sanitizeName(row.getCell('B').value);
        if (!colB) continue;
        const rawName = `${colA}- ${colB}`;
        names.push(`${rawName}.docx`);
    }
    return names;
}

async function createDocxFiles(basePath, folderName, calcPath) {
    if (!basePath || !folderName || !calcPath) {
        throw new Error('basePath, folderName, and calcPath are required.');
    }
    if (!fs.existsSync(calcPath)) {
        throw new Error(`لم يتم العثور على calc.xlsx في المسار: ${calcPath}`);
    }
    if (!fs.existsSync(REPORT_TEMPLATE_PATH)) {
        throw new Error(`لم يتم العثور على report.docx في المسار: ${REPORT_TEMPLATE_PATH}`);
    }

    const targetDir = path.join(basePath, folderName, MAIN_FOLDERS[2]);
    await ensureDir(targetDir);

    const docNames = await readDocxNamesFromCalc(calcPath);
    let created = 0;
    for (const fileName of docNames) {
        const dest = path.join(targetDir, fileName);
        await fs.promises.copyFile(REPORT_TEMPLATE_PATH, dest);
        created += 1;
    }

    return { targetDir, created };
}

function computeSheetNameMap(workbook, dataSheet) {
    const { maxRow } = getSheetBounds(dataSheet);
    const entries = [];

    const findSheetName = (base) => {
        const exact = workbook.getWorksheet(base);
        if (exact) return exact.name;
        const candidate = workbook.worksheets.find((ws) => ws.name === base || ws.name.startsWith(`${base}_`));
        return candidate ? candidate.name : null;
    };

    for (let r = 2; r <= maxRow; r++) {
        const row = dataSheet.getRow(r);
        const colB = sanitizeName(row.getCell('B').value);
        if (!colB) continue;
        const colA = sanitizeName(row.getCell('A').value) || `${r - 1}`;
        const sheetName = findSheetName(colB);
        if (!sheetName) continue;
        entries.push({ rowIndex: r, sheetName, colA, colB });
    }

    return entries;
}

function renderSheetRangeToPng(sheet, workbook) {
    const rows = 8;
    const cols = 14; // A..N
    const padding = 8;
    const isRtlSheet = Boolean(sheet?.views?.[0]?.rightToLeft);
    const CURRENCY_TEXT_LATIN_DOTS = 'ر.س.';
    // Use Arabic full stop "۔" inside PNG rendering to avoid bidi flipping dots to the front (".ر.س")
    const CURRENCY_TEXT_ARABIC_DOTS = `ر\u06D4س\u06D4`;
    const currencyRegex = /ر[.\u06D4]\s*س[.\u06D4]/u;
    const colWidths = [];
    for (let c = 1; c <= cols; c++) {
        const w = sheet.getColumn(c)?.width;
        const px = Math.max(40, Math.min(160, (w || 12) * 7));
        colWidths.push(px);
    }
    const rowHeights = [];
    for (let r = 1; r <= rows; r++) {
        const h = sheet.getRow(r)?.height;
        const px = Math.max(18, Math.min(80, (h || 18) * 1.2));
        rowHeights.push(px);
    }

    // Pre-calc row heights based on wrapped text so values aren't cut off
    const measureCanvas = createCanvas(1, 1);
    const measureCtx = measureCanvas.getContext('2d');
    for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
            const cell = sheet.getCell(r, c);
            const text = getCellDisplay(cell, workbook, sheet);
            if (!text) continue;
            const isCurrencyText = currencyRegex.test(text) && /[0-9]/.test(text);
            const isBold = cell?.style?.font?.bold || r === 1 || r === 5;
            const baseFontSize = 13;
            const headerFontSize = 14;
            const fontSize = isBold ? headerFontSize : baseFontSize;
            const fontFamily = '"DejaVu Sans","Noto Naskh Arabic","Arial Unicode MS","Segoe UI","Arial","Tahoma",sans-serif';
            measureCtx.font = `${isBold ? 'bold ' : '600 '} ${fontSize}px ${fontFamily}`;
            const maxTextWidth = Math.max(20, colWidths[c - 1] - padding * 2);
            const textWidth = (() => {
                if (!isCurrencyText) return measureCtx.measureText(text).width;
                const number = String(text).replace(/\s*ر[.\u06D4]\s*س[.\u06D4]\s*/gu, '').trim();
                const numWidth = measureCtx.measureText(number).width;
                const spaceWidth = measureCtx.measureText(' ').width;
                const curWidth = measureCtx.measureText(CURRENCY_TEXT_ARABIC_DOTS).width;
                return numWidth + spaceWidth + curWidth;
            })();
            const lines = Math.max(1, Math.ceil(textWidth / maxTextWidth));
            const heightNeeded = lines * fontSize * 1.3 + padding * 2;
            rowHeights[r - 1] = Math.max(rowHeights[r - 1], heightNeeded);
        }
    }

    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + 2;
    const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + 2;
    const scale = 2; // render at higher resolution for sharper output

    const canvas = createCanvas(totalWidth * scale, totalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    ctx.strokeStyle = '#b8b8b8';
    ctx.lineWidth = 1;

    const argbToRgba = (argb) => {
        if (!argb || typeof argb !== 'string') return null;
        const hex = argb.replace(/^0x/i, '').padStart(8, 'F');
        const a = parseInt(hex.slice(0, 2), 16) / 255;
        const r = parseInt(hex.slice(2, 4), 16);
        const g = parseInt(hex.slice(4, 6), 16);
        const b = parseInt(hex.slice(6, 8), 16);
        return `rgba(${r},${g},${b},${a})`;
    };

    // Build merge map within the rendered range
    const merges = sheet.model?.merges || sheet._merges || [];
    const mergeList = Array.isArray(merges) ? merges : Object.keys(merges || {});
    const mergeMap = new Map();
    mergeList.forEach((m) => {
        const ref = m || '';
        const [start, end] = ref.split(':');
        if (!start || !end) return;
        const startCell = sheet.getCell(start);
        const endCell = sheet.getCell(end);
        const top = startCell.row;
        const left = startCell.col;
        const bottom = endCell.row;
        const right = endCell.col;
        if (top > rows || left > cols || bottom < 1 || right < 1) return;
        const anchorCol = isRtlSheet ? right : left;
        mergeMap.set(`${top}-${anchorCol}`, { top, left, bottom, right, anchorCol });
    });

    const isCoveredByMerge = (r, c) => {
        for (const merge of mergeMap.values()) {
            if (r >= merge.top && r <= merge.bottom && c >= merge.left && c <= merge.right) {
                if (merge.top !== r || merge.anchorCol !== c) return true;
            }
        }
        return false;
    };

    const colOrder = isRtlSheet
        ? Array.from({ length: cols }, (_v, idx) => cols - idx)
        : Array.from({ length: cols }, (_v, idx) => idx + 1);

    let y = 1;
    for (let r = 1; r <= rows; r++) {
        let x = 1;
        const rowHeight = rowHeights[r - 1];
        for (const c of colOrder) {
            if (isCoveredByMerge(r, c)) {
                x += colWidths[c - 1];
                continue;
            }

            const merge = mergeMap.get(`${r}-${c}`);
            const spanCols = merge ? merge.right - merge.left + 1 : 1;
            const spanRows = merge ? merge.bottom - merge.top + 1 : 1;
            const left = merge ? merge.left : c;
            const right = merge ? merge.right : c;
            const cellWidth = colWidths.slice(left - 1, right).reduce((a, b) => a + b, 0);
            const cellHeight = rowHeights.slice(r - 1, r - 1 + spanRows).reduce((a, b) => a + b, 0);

            const cell = merge ? sheet.getCell(merge.top, merge.left) : sheet.getCell(r, c);
            const fill = cell?.style?.fill;
            if (fill?.fgColor?.argb) {
                const rgba = argbToRgba(fill.fgColor.argb);
                if (rgba) {
                    ctx.fillStyle = rgba;
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                }
            }

            ctx.strokeRect(x, y, cellWidth, cellHeight);

            const text = getCellDisplay(cell, workbook, sheet);
            ctx.save();
            const hasArabic = /[\u0600-\u06FF]/.test(text);
            const isCurrencyText = currencyRegex.test(text) && /[0-9]/.test(text);
            const align = cell?.style?.alignment?.horizontal || (hasArabic || isRtlSheet ? 'right' : 'center');
            ctx.textAlign = align === 'right' ? 'right' : align === 'left' ? 'left' : 'center';
            ctx.direction = hasArabic ? 'rtl' : 'ltr';
            const isBold = cell?.style?.font?.bold || r === 1 || r === 5;
            const baseFontSize = 13;
            const headerFontSize = 14;
            const fontSize = isBold ? headerFontSize : baseFontSize;
            const fontFamily = '"DejaVu Sans","Noto Naskh Arabic","Arial Unicode MS","Segoe UI","Arial","Tahoma",sans-serif';
            ctx.font = `${isBold ? 'bold ' : '600 '} ${fontSize}px ${fontFamily}`;
            const fontColor = cell?.style?.font?.color?.argb;
            ctx.fillStyle = fontColor ? argbToRgba(fontColor) || '#222' : '#222';
            const maxTextWidth = Math.max(20, cellWidth - padding * 2);

            const wrapText = (t) => {
                const words = t.split(/\s+/);
                const lines = [];
                let line = '';
                for (let wi = 0; wi < words.length; wi++) {
                    const word = words[wi];
                    const testLine = line ? `${line} ${word}` : word;
                    if (ctx.measureText(testLine).width <= maxTextWidth) {
                        line = testLine;
                    } else {
                        if (line) lines.push(line);
                        line = word;
                    }
                }
                if (line) lines.push(line);
                if (!lines.length) lines.push(t);
                return lines;
            };

            const lineHeight = fontSize * 1.3;
            let textX = x + padding;
            if (ctx.textAlign === 'center') textX = x + cellWidth / 2;
            if (ctx.textAlign === 'right') textX = x + cellWidth - padding;

            // Draw currency as 2 parts to keep visual order and punctuation stable: "25,220 ر.س."
            if (isCurrencyText && (ctx.textAlign === 'right' || ctx.textAlign === 'center')) {
                const number = String(text).replace(/\s*ر[.\u06D4]\s*س[.\u06D4]\s*/gu, '').trim();
                const currency = CURRENCY_TEXT_ARABIC_DOTS;
                const numWidth = ctx.measureText(number).width;
                const spaceWidth = ctx.measureText(' ').width;
                const curWidth = ctx.measureText(currency).width;
                const totalWidth = numWidth + spaceWidth + curWidth;

                const anchorRight = ctx.textAlign === 'right'
                    ? (x + cellWidth - padding)
                    : (x + cellWidth / 2 + totalWidth / 2);

                const yLine = y + (cellHeight - lineHeight) / 2 + fontSize;

                ctx.save();
                ctx.textAlign = 'right';
                ctx.direction = 'ltr';
                ctx.fillText(number, anchorRight, yLine);
                ctx.restore();

                ctx.save();
                ctx.textAlign = 'right';
                ctx.direction = 'rtl';
                ctx.fillText(currency, anchorRight - numWidth - spaceWidth, yLine);
                ctx.restore();
            } else {
                const normalizedText = isCurrencyText
                    ? String(text).replace(CURRENCY_TEXT_LATIN_DOTS, CURRENCY_TEXT_ARABIC_DOTS)
                    : text;
                const lines = wrapText(normalizedText);
                const blockHeight = lines.length * lineHeight;
                const startY = y + (cellHeight - blockHeight) / 2 + fontSize;
                lines.forEach((line, idx) => {
                    const lineY = startY + idx * lineHeight;
                    ctx.fillText(line, textX, lineY);
                });
            }
            ctx.restore();

            x += colWidths[c - 1];
        }
        y += rowHeight;
    }

    return {
        buffer: canvas.toBuffer('image/png'),
        width: totalWidth * scale,
        height: totalHeight * scale
    };
}

async function flipImageHorizontal(buffer, width, height) {
    const img = await loadImage(buffer);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, width, height);
    return {
        buffer: canvas.toBuffer('image/png'),
        width,
        height
    };
}

function appendImageToDocx(docxPath, imageBuffer, size, markerText = DOCX_MARKER_TEXT) {
    const docXmlPath = 'word/document.xml';
    const relsPath = 'word/_rels/document.xml.rels';
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const content = fs.readFileSync(docxPath);
    const zip = new PizZip(content);
    const docFile = zip.file(docXmlPath);
    if (!docFile) throw new Error('document.xml غير موجود داخل التقرير.');

    let docXml = docFile.asText();
    let relsXml = zip.file(relsPath)?.asText();
    if (!relsXml) {
        relsXml = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    }

    const existingIds = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((m) => Number(m[1]));
    const nextId = (existingIds.length ? Math.max(...existingIds) : 0) + 1;
    const relId = `rId${nextId}`;
    const imageName = `image_${Date.now()}_${Math.floor(Math.random() * 100000)}.png`;

    // Add relationship entry
    const relTag = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`;
    relsXml = relsXml.replace('</Relationships>', `${relTag}</Relationships>`);
    zip.file(relsPath, relsXml);

    // Add image binary
    zip.file(`word/media/${imageName}`, imageBuffer);

    // Insert drawing into document body (after marker paragraph if found, otherwise appended)
    const targetWidthPx = 880; // wider image
    const targetHeightPx = 250; // height unchanged
    const cx = Math.round(targetWidthPx * 9525); // px to EMU
    const cy = Math.round(targetHeightPx * 9525);
    const leftIndentTwips = 1600; // more left margin
    const rightIndentTwips = 50; // keep small right indent
    const spacingBeforeTwips = 550; // slight spacing above
    const drawingXml = `
      <w:p>
        <w:pPr>
          <w:ind w:left="${leftIndentTwips}" w:right="${rightIndentTwips}"/>
          <w:spacing w:before="${spacingBeforeTwips}"/>
          <w:jc w="right"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
              <wp:extent cx="${cx}" cy="${cy}"/>
              <wp:docPr id="${nextId}" name="SheetImage"/>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="0" name="${imageName}"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${cx}" cy="${cy}"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect">
                        <a:avLst/>
                      </a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
    `;

    let insertionPoint = -1;
    if (markerText) {
        const paragraphs = docXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
        let lastMatchStart = -1;
        let lastMatchLength = 0;
        for (const p of paragraphs) {
            const plain = p.replace(/<[^>]+>/g, '');
            if (plain.includes(markerText)) {
                const paraStart = docXml.indexOf(p, lastMatchStart + 1);
                if (paraStart !== -1) {
                    lastMatchStart = paraStart;
                    lastMatchLength = p.length;
                }
            }
        }
        if (lastMatchStart !== -1) {
            insertionPoint = lastMatchStart + lastMatchLength;
        }

        // Fallback simple search (use last occurrence)
        if (insertionPoint === -1 && docXml.includes(markerText)) {
            const markerIdx = docXml.lastIndexOf(markerText);
            const paraStart = docXml.lastIndexOf('<w:p', markerIdx);
            const paraEnd = docXml.indexOf('</w:p>', markerIdx);
            if (paraStart >= 0 && paraEnd > paraStart) {
                insertionPoint = paraEnd + '</w:p>'.length; // after closing </w:p>
            }
        }
    }

    if (insertionPoint === -1) {
        if (docXml.includes('</w:body></w:document>')) {
            docXml = docXml.replace('</w:body></w:document>', `${drawingXml}</w:body></w:document>`);
        } else if (docXml.includes('</w:body>')) {
            docXml = docXml.replace('</w:body>', `${drawingXml}</w:body>`);
        } else {
            docXml += drawingXml;
        }
    } else {
        docXml = `${docXml.slice(0, insertionPoint)}${drawingXml}${docXml.slice(insertionPoint)}`;
    }

    zip.file(docXmlPath, docXml);
    const updated = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(docxPath, updated);
}

function findInsertionPointAfterSheetImage(docXml) {
    const idx = docXml.lastIndexOf('name="SheetImage"');
    if (idx === -1) return -1;
    const paraStart = docXml.lastIndexOf('<w:p', idx);
    const paraEnd = docXml.indexOf('</w:p>', idx);
    if (paraStart >= 0 && paraEnd > paraStart) return paraEnd + '</w:p>'.length;
    return -1;
}

function removeExistingPreviewImagesTable(docXml) {
    const captionIdx = docXml.indexOf(`w:tblCaption w:val="${PREVIEW_IMAGES_TABLE_CAPTION}"`);
    if (captionIdx === -1) return docXml;
    const tblStart = docXml.lastIndexOf('<w:tbl', captionIdx);
    const tblEnd = docXml.indexOf('</w:tbl>', captionIdx);
    if (tblStart === -1 || tblEnd === -1) return docXml;
    return `${docXml.slice(0, tblStart)}${docXml.slice(tblEnd + '</w:tbl>'.length)}`;
}

function appendPreviewImagesToDocx(docxPath, imagePaths, opts = {}) {
    const {
        markerText = DOCX_PREVIEW_MARKER_TEXT,
        imagesPerRow = 3,
        imageWidthPx = 210,
        imageHeightPx = 140,
        tableIndentTwips = 2200,
        rightIndentTwips = 80
    } = opts;

    if (!Array.isArray(imagePaths) || imagePaths.length === 0) return { appended: 0 };

    const docXmlPath = 'word/document.xml';
    const relsPath = 'word/_rels/document.xml.rels';

    const content = fs.readFileSync(docxPath);
    const zip = new PizZip(content);
    const docFile = zip.file(docXmlPath);
    if (!docFile) throw new Error('document.xml غير موجود داخل التقرير.');

    let docXml = docFile.asText();
    docXml = removeExistingPreviewImagesTable(docXml);

    let relsXml = zip.file(relsPath)?.asText();
    if (!relsXml) {
        relsXml = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    }

    const existingIds = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((m) => Number(m[1]));
    let nextRel = (existingIds.length ? Math.max(...existingIds) : 0) + 1;

    const pxToEmu = (px) => Math.round(px * 9525);
    const cx = pxToEmu(imageWidthPx);
    const cy = pxToEmu(imageHeightPx);

    const rows = [];
    const addedRels = [];
    for (let i = 0; i < imagePaths.length; i++) {
        const imagePath = imagePaths[i];
        const buf = fs.readFileSync(imagePath);
        const ext = (path.extname(imagePath) || '.png').toLowerCase();
        const imageName = `preview_${Date.now()}_${i}${ext}`;
        const relId = `rId${nextRel++}`;
        addedRels.push({ relId, imageName });

        zip.file(`word/media/${imageName}`, buf);
        const relTag = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`;
        relsXml = relsXml.replace('</Relationships>', `${relTag}</Relationships>`);

        rows.push({ relId, imageName });
    }

    zip.file(relsPath, relsXml);

    const makeDrawing = (relId, docPrId) => `
      <w:p>
        <w:pPr>
          <w:jc w:val="right"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
              <wp:extent cx="${cx}" cy="${cy}"/>
              <wp:docPr id="${docPrId}" name="PreviewImage"/>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="0" name="preview"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                      <a:stretch><a:fillRect/></a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${cx}" cy="${cy}"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
    `;

    const makeCell = (drawingXml) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="0" w:type="auto"/>
          <w:vAlign w:val="center"/>
        </w:tcPr>
        ${drawingXml}
      </w:tc>
    `;

    const tableRows = [];
    const docPrStart = Date.now() % 100000;
    for (let i = 0; i < rows.length; i += imagesPerRow) {
        const chunk = rows.slice(i, i + imagesPerRow);
        const cells = chunk.map((img, idx) => makeCell(makeDrawing(img.relId, docPrStart + i + idx))).join('');
        const paddingCells = Array.from({ length: Math.max(0, imagesPerRow - chunk.length) }, () => makeCell('<w:p/>')).join('');
        tableRows.push(`<w:tr>${cells}${paddingCells}</w:tr>`);
    }

    const galleryXml = `
      <w:p>
        <w:pPr>
          <w:ind w:left="${tableIndentTwips}" w:right="${rightIndentTwips}"/>
          <w:spacing w:before="250" w:after="150"/>
          <w:jc w:val="right"/>
        </w:pPr>
      </w:p>
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="0" w:type="auto"/>
          <w:jc w:val="right"/>
          <w:tblInd w:w="${tableIndentTwips}" w:type="dxa"/>
          <w:tblCaption w:val="${PREVIEW_IMAGES_TABLE_CAPTION}"/>
        </w:tblPr>
        <w:tblGrid>
          ${Array.from({ length: imagesPerRow }, () => '<w:gridCol w:w="0"/>').join('')}
        </w:tblGrid>
        ${tableRows.join('')}
      </w:tbl>
    `;

    let insertionPoint = -1;
    if (markerText) {
        // Insert after the paragraph that contains the marker text (use last occurrence).
        const paragraphs = docXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
        let lastMatchStart = -1;
        let lastMatchLength = 0;
        for (const p of paragraphs) {
            const plain = p.replace(/<[^>]+>/g, '');
            if (plain.includes(markerText)) {
                const paraStart = docXml.indexOf(p, lastMatchStart + 1);
                if (paraStart !== -1) {
                    lastMatchStart = paraStart;
                    lastMatchLength = p.length;
                }
            }
        }
        if (lastMatchStart !== -1) insertionPoint = lastMatchStart + lastMatchLength;
        if (insertionPoint === -1 && docXml.includes(markerText)) {
            const markerIdx = docXml.lastIndexOf(markerText);
            const paraStart = docXml.lastIndexOf('<w:p', markerIdx);
            const paraEnd = docXml.indexOf('</w:p>', markerIdx);
            if (paraStart >= 0 && paraEnd > paraStart) insertionPoint = paraEnd + '</w:p>'.length;
        }
    }
    // Fallback: append after "SheetImage" if present
    if (insertionPoint === -1) insertionPoint = findInsertionPointAfterSheetImage(docXml);
    if (insertionPoint === -1) {
        insertionPoint = docXml.includes('</w:body>') ? docXml.lastIndexOf('</w:body>') : docXml.length;
    }

    docXml = `${docXml.slice(0, insertionPoint)}${galleryXml}${docXml.slice(insertionPoint)}`;
    zip.file(docXmlPath, docXml);
    const updated = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(docxPath, updated);
    return { appended: imagePaths.length };
}

function isImageFile(fileName) {
    const ext = (path.extname(fileName) || '').toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(ext);
}

async function collectImageFilesRecursive(dirPath, maxFiles = 50) {
    const out = [];
    const visit = async (p) => {
        if (out.length >= maxFiles) return;
        let entries = [];
        try {
            entries = await fs.promises.readdir(p, { withFileTypes: true });
        } catch (_) {
            return;
        }
        for (const ent of entries) {
            if (out.length >= maxFiles) break;
            const full = path.join(p, ent.name);
            if (ent.isDirectory()) {
                await visit(full);
            } else if (ent.isFile() && isImageFile(ent.name)) {
                out.push(full);
            }
        }
    };
    await visit(dirPath);
    out.sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'en', { numeric: true, sensitivity: 'base' }));
    return out;
}

function normalizeKey(name) {
    return sanitizeName(String(name || '')).replace(/\s+/g, ' ').trim();
}

async function appendPreviewImages(basePath, folderName) {
    const root = path.join(basePath, folderName);
    const previewRoot = path.join(root, MAIN_FOLDERS[1]);
    const targetDir = path.join(root, MAIN_FOLDERS[2]);

    if (!fs.existsSync(previewRoot)) throw new Error(`لم يتم العثور على مجلد صور المعاينة: ${previewRoot}`);
    if (!fs.existsSync(targetDir)) throw new Error(`لم يتم العثور على مجلد ملفات DOCX: ${targetDir}`);

    const docxFiles = (await fs.promises.readdir(targetDir))
        .filter((f) => f.toLowerCase().endsWith('.docx'));

    const imageFolders = [];
    const locationDirs = await fs.promises.readdir(previewRoot, { withFileTypes: true });
    for (const loc of locationDirs) {
        if (!loc.isDirectory()) continue;
        const locPath = path.join(previewRoot, loc.name);
        let assetDirs = [];
        try {
            assetDirs = await fs.promises.readdir(locPath, { withFileTypes: true });
        } catch (_) {
            continue;
        }
        for (const asset of assetDirs) {
            if (!asset.isDirectory()) continue;
            imageFolders.push(path.join(locPath, asset.name));
        }
    }

    const folderImagesMap = new Map();
    for (const folderPath of imageFolders) {
        const key = normalizeKey(path.basename(folderPath));
        if (!key) continue;
        const imgs = await collectImageFilesRecursive(folderPath, 60);
        if (!imgs.length) continue;
        folderImagesMap.set(key, imgs);
    }

    let previewProcessed = 0;
    let previewSkipped = 0;
    let previewImagesAppended = 0;

    for (const docxFile of docxFiles) {
        const docBase = normalizeKey(path.basename(docxFile, '.docx'));
        const images = folderImagesMap.get(docBase);
        if (!images || !images.length) {
            previewSkipped += 1;
            continue;
        }
        const docxPath = path.join(targetDir, docxFile);
        appendPreviewImagesToDocx(docxPath, images);
        previewProcessed += 1;
        previewImagesAppended += images.length;
    }

    return { root, previewRoot, targetDir, previewProcessed, previewSkipped, previewImagesAppended };
}

async function createFoldersOnly(basePath, folderName, dataExcelPath) {
    if (!basePath || !folderName || !dataExcelPath) {
        throw new Error('basePath, folderName, and dataExcelPath are required.');
    }

    const root = path.join(basePath, folderName);
    await ensureDir(root);

    const subFolders = [];
    for (const name of MAIN_FOLDERS) {
        const dir = path.join(root, name);
        await ensureDir(dir);
        subFolders.push(dir);
    }

    const locationRoot = subFolders[LOCATION_FOLDER_INDEX] || subFolders[0];
    const locations = await readLocationsAndPlates(dataExcelPath);

    let locationsCreated = 0;
    let platesCreated = 0;

    for (let locIdx = 0; locIdx < locations.length; locIdx++) {
        const loc = locations[locIdx];
        const locationDirName = `${locIdx + 1}- ${loc.name}`;
        const locationDir = path.join(locationRoot, locationDirName);
        await ensureDir(locationDir);
        locationsCreated += 1;

        for (let plateIdx = 0; plateIdx < loc.plates.length; plateIdx++) {
            const plate = loc.plates[plateIdx];
            const prefix = plate.number || `${plateIdx + 1}`;
            const plateDirName = `${prefix}- ${plate.name}`;
            const plateDir = path.join(locationDir, plateDirName);
            await ensureDir(plateDir);
            platesCreated += 1;
        }
    }

    return { root, subFolders, locationsCreated, platesCreated };
}

async function updateCalcOnly(basePath, folderName, dataExcelPath) {
    if (!basePath || !folderName || !dataExcelPath) {
        throw new Error('basePath, folderName, and dataExcelPath are required.');
    }

    const root = path.join(basePath, folderName);
    const calcTargetDir = path.join(root, MAIN_FOLDERS[2]);
    await ensureDir(calcTargetDir);
    const calcPath = await copyCalcFile(calcTargetDir);
    await copyDataSheet(dataExcelPath, calcPath);
    await createCalcSheets(dataExcelPath, calcPath);
    return { root, calcPath };
}

async function appendCalcImages(basePath, folderName) {
    if (!basePath || !folderName) {
        throw new Error('basePath و folderName مطلوبة.');
    }

    const root = path.join(basePath, folderName);
    const targetDir = path.join(root, MAIN_FOLDERS[2]);
    const imagesDir = path.join(targetDir, VALUE_IMAGE_FOLDER);
    const calcPath = path.join(targetDir, CALC_TARGET_NAME);

    if (!fs.existsSync(calcPath)) {
        throw new Error(`لم يتم العثور على calc.xlsx في ${calcPath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(calcPath);

    const dataSheet = workbook.getWorksheet('data') || workbook.worksheets[0];
    if (!dataSheet) {
        throw new Error('شيت data غير موجود داخل calc.xlsx');
    }

    const mapping = computeSheetNameMap(workbook, dataSheet);
    await ensureDir(imagesDir);
    let processed = 0;
    let skipped = 0;
    let savedImages = 0;

    for (const entry of mapping) {
        const { sheetName, colA, colB } = entry;
        const docxName = `${colA}- ${colB}.docx`;
        const docxPath = path.join(targetDir, docxName);
        if (!fs.existsSync(docxPath)) {
            skipped += 1;
            continue;
        }

        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) {
            skipped += 1;
            continue;
        }

        const image = renderSheetRangeToPng(sheet, workbook);
        const imagePath = path.join(imagesDir, `${colA}- ${colB}.png`);
        await fs.promises.writeFile(imagePath, image.buffer);
        savedImages += 1;
        await appendImageToDocx(docxPath, image.buffer, { width: image.width, height: image.height });
        processed += 1;
    }

    return { root, targetDir, calcPath, processed, skipped, imagesDir, savedImages };
}

const valuationHandlers = {
    async handleCreateFolders(event, payload = {}) {
        try {
            const { basePath, folderName, dataExcelPath } = payload;
            const result = await createFoldersOnly(basePath, folderName, dataExcelPath);
            return {
                ok: true,
                root: result.root,
                created: {
                    mainFolders: result.subFolders,
                    locations: result.locationsCreated,
                    plates: result.platesCreated
                }
            };
        } catch (error) {
            console.error('[MAIN] valuation create folders failed:', error);
            return { ok: false, error: error.message || 'Failed to create valuation folders.' };
        }
    },

    async handleUpdateCalc(event, payload = {}) {
        try {
            const { basePath, folderName, dataExcelPath } = payload;
            const result = await updateCalcOnly(basePath, folderName, dataExcelPath);
            return {
                ok: true,
                root: result.root,
                calcPath: result.calcPath
            };
        } catch (error) {
            console.error('[MAIN] valuation update calc failed:', error);
            return { ok: false, error: error.message || 'Failed to update calc.xlsx.' };
        }
    },

    async handleCreateDocx(event, payload = {}) {
        try {
            const { basePath, folderName } = payload;
            const root = path.join(basePath || '', folderName || '');
            const calcPath = path.join(root, MAIN_FOLDERS[2], CALC_TARGET_NAME);
            const result = await createDocxFiles(basePath, folderName, calcPath);
            return {
                ok: true,
                root,
                calcPath,
                docsCreated: result.created,
                targetDir: result.targetDir
            };
        } catch (error) {
            console.error('[MAIN] valuation create docx failed:', error);
            return { ok: false, error: error.message || 'Failed to create docx files.' };
        }
    },

    async handleValueCalculations(event, payload = {}) {
        try {
            const { basePath, folderName } = payload;
            const result = await appendCalcImages(basePath, folderName);
            return {
                ok: true,
                ...result
            };
        } catch (error) {
            console.error('[MAIN] valuation value calculations failed:', error);
            return { ok: false, error: error.message || 'Failed to append calculations to docx files.' };
        }
    },

    async handleAppendPreviewImages(event, payload = {}) {
        try {
            const { basePath, folderName } = payload;
            const result = await appendPreviewImages(basePath, folderName);
            return {
                ok: true,
                ...result
            };
        } catch (error) {
            console.error('[MAIN] valuation append preview images failed:', error);
            return { ok: false, error: error.message || 'Failed to append preview images to docx files.' };
        }
    }
};

module.exports = valuationHandlers;
