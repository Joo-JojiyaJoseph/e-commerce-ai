import { adminGet } from '../../api.js';

const PAGE_SIZE = 200;
const MAX_PAGES = 50; // hard stop at 10,000 rows so a huge catalogue can't freeze the tab

/**
 * Fetches every page of an admin list using the same filters currently on screen.
 */
export async function fetchAllRows(endpoint, params = {}) {
    const rows = [];
    let page = 1;
    let lastPage = 1;

    do {
        const search = new URLSearchParams({ ...params, per_page: String(PAGE_SIZE), page: String(page) });
        const payload = await adminGet(`${endpoint}?${search}`);
        rows.push(...(payload.data ?? []));
        lastPage = payload.meta?.last_page ?? payload.last_page ?? 1;
        page += 1;
    } while (page <= lastPage && page <= MAX_PAGES);

    return { rows, truncated: lastPage > MAX_PAGES };
}

/**
 * Spreadsheet apps run text starting with = + - @ as a formula. Prefixing a quote neutralises
 * "CSV injection" from customer-controlled values such as names or addresses.
 */
export function safeCell(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
}

function resolve(row, column) {
    return typeof column.value === 'function' ? column.value(row) : row[column.key];
}

export function toCSV(rows, columns) {
    const escape = (text) => (/[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);
    const lines = [columns.map((column) => escape(column.label)).join(',')];
    rows.forEach((row) => lines.push(columns.map((column) => escape(safeCell(resolve(row, column)))).join(',')));
    // BOM so Excel reads UTF-8 (₹, accents) correctly.
    return `\uFEFF${lines.join('\r\n')}`;
}

const xmlEscape = (text) =>
    text.replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch])
        // strip control characters that are illegal in XML 1.0
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function columnName(index) {
    let name = '';
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    }
    return name;
}

/**
 * Minimal, dependency-light .xlsx writer: numbers stay numeric, text is stored as inline strings.
 */
export async function toXLSX(rows, columns, sheetName = 'Export') {
    const { zipSync, strToU8 } = await import('fflate');

    const cell = (value, c, r, bold = false) => {
        const ref = `${columnName(c)}${r}`;
        const style = bold ? ' s="1"' : '';
        if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
        return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(safeCell(value))}</t></is></c>`;
    };

    const body = [
        `<row r="1">${columns.map((column, c) => cell(column.label, c, 1, true)).join('')}</row>`,
        ...rows.map((row, r) => {
            const cells = columns.map((column, c) => {
                const raw = resolve(row, column);
                const value = column.numeric && raw !== '' && raw !== null && raw !== undefined && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
                return cell(value, c, r + 2);
            });
            return `<row r="${r + 2}">${cells.join('')}</row>`;
        }),
    ].join('');

    const widths = columns
        .map((column, c) => `<col min="${c + 1}" max="${c + 1}" width="${Math.min(40, Math.max(12, column.label.length + 4))}" customWidth="1"/>`)
        .join('');

    const safeSheet = xmlEscape(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Export');
    const files = {
        '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
        '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
        'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
        'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${body}</sheetData></worksheet>`,
    };

    const zipped = zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])));

    return new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportRows({ format, filename, rows, columns }) {
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'xlsx') {
        download(await toXLSX(rows, columns, filename), `${filename}-${stamp}.xlsx`);
        return;
    }

    download(new Blob([toCSV(rows, columns)], { type: 'text/csv;charset=utf-8' }), `${filename}-${stamp}.csv`);
}
