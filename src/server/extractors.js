import path from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import xlsx from 'xlsx';

const SUPPORTED = new Set(['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt']);
const MAX_TOTAL_CHARS = 120_000;
const MAX_FILE_CHARS = 35_000;

function extension(name) {
  return path.extname(name || '').toLowerCase();
}

function asText(buffer) {
  return buffer.toString('utf8').replace(/\0/g, '').trim();
}

async function extractPdf(buffer, name) {
  const { default: pdfParse } = await import('pdf-parse');
  const data = await pdfParse(buffer);
  const text = (data.text || '').trim();
  const warnings = text ? [] : [`${name}: PDF enthaelt keinen extrahierbaren Text. OCR ist in v1 nicht enthalten.`];
  return { text, warnings };
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: (result.value || '').trim(),
    warnings: (result.messages || []).map((message) => `DOCX-Hinweis: ${message.message || message}`)
  };
}

function extractWorkbook(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sections = [];
  for (const sheetName of workbook.SheetNames) {
    const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName], { blankrows: false });
    if (csv.trim()) sections.push(`Tabellenblatt: ${sheetName}\n${csv.trim()}`);
  }
  return sections.join('\n\n');
}

async function extractSingle(buffer, name) {
  const ext = extension(name);
  if (!SUPPORTED.has(ext)) {
    return { skipped: true, warnings: [`${name}: Dateityp ${ext || 'ohne Endung'} wird in v1 uebersprungen.`] };
  }
  if (ext === '.doc') {
    return { text: '', warnings: [`${name}: .doc wird in v1 nicht verlaesslich unterstuetzt und wurde uebersprungen.`] };
  }
  try {
    if (ext === '.pdf') return await extractPdf(buffer, name);
    if (ext === '.docx') return await extractDocx(buffer);
    if (ext === '.xlsx' || ext === '.xls') return { text: extractWorkbook(buffer), warnings: [] };
    return { text: asText(buffer), warnings: [] };
  } catch (error) {
    return { text: '', warnings: [`${name}: Extraktion fehlgeschlagen (${error.message}).`] };
  }
}

async function walkZip(buffer, zipName, documents, warnings) {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files).filter((file) => !file.dir);
  for (const entry of entries) {
    const nestedName = `${zipName}/${entry.name}`;
    const nestedBuffer = await entry.async('nodebuffer');
    if (extension(entry.name) === '.zip') {
      await walkZip(nestedBuffer, nestedName, documents, warnings);
      continue;
    }
    const extracted = await extractSingle(nestedBuffer, nestedName);
    warnings.push(...(extracted.warnings || []));
    if (!extracted.skipped && extracted.text) {
      documents.push({ name: nestedName, text: extracted.text, chars: extracted.text.length });
    }
  }
}

export async function extractDocumentsFromUploads(files) {
  const documents = [];
  const warnings = [];
  for (const file of files || []) {
    if (extension(file.originalname) === '.zip') {
      try {
        await walkZip(file.buffer, file.originalname, documents, warnings);
      } catch (error) {
        warnings.push(`${file.originalname}: ZIP konnte nicht entpackt werden (${error.message}).`);
      }
      continue;
    }
    const extracted = await extractSingle(file.buffer, file.originalname);
    warnings.push(...(extracted.warnings || []));
    if (!extracted.skipped && extracted.text) {
      documents.push({ name: file.originalname, text: extracted.text, chars: extracted.text.length });
    }
  }
  let remaining = MAX_TOTAL_CHARS;
  const limitedDocuments = documents.map((document) => {
    const perFileText = document.text.slice(0, Math.min(MAX_FILE_CHARS, remaining));
    remaining -= perFileText.length;
    if (perFileText.length < document.text.length) {
      warnings.push(`${document.name}: Text wurde fuer Provider-Limits auf ${perFileText.length} Zeichen gekuerzt.`);
    }
    return { ...document, text: perFileText, chars: perFileText.length };
  }).filter((document) => document.text.length > 0);

  if (!limitedDocuments.length) warnings.push('Keine auswertbaren Textinhalte gefunden.');
  return { documents: limitedDocuments, warnings };
}

export function buildDocumentCorpus(documents) {
  return documents.map((document, index) => (
    `### Dokument ${index + 1}: ${document.name}\n${document.text}`
  )).join('\n\n');
}
