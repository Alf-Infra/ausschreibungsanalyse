import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { extractDocumentsFromUploads, buildDocumentCorpus } from './extractors.js';
import { analyzeWithProvider } from './providers.js';
import { normalizeAnalysis } from './schema.js';
import { getDocxPath, renderAnalysisDocx } from './docx.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024, files: 40 }
});

function publicDir() {
  return path.resolve('dist');
}

export function createApp() {
  const app = express();

  app.get('/health', (req, res) => {
    res.type('application/json').send('{"ok":true}');
  });

  app.post('/api/analyze', upload.array('files'), async (req, res) => {
    try {
      const provider = String(req.body.provider || '').trim();
      const model = String(req.body.model || '').trim();
      const apiKey = String(req.body.apiKey || '').trim();
      if (!req.files?.length) return res.status(400).json({ error: 'Keine Dateien hochgeladen.' });
      if (!provider || !model) return res.status(400).json({ error: 'Provider und Modell sind erforderlich.' });
      if (!apiKey) return res.status(400).json({ error: 'API-Key ist erforderlich und wird nicht gespeichert.' });

      const extraction = await extractDocumentsFromUploads(req.files);
      const corpus = buildDocumentCorpus(extraction.documents);
      const providerAnalysis = await analyzeWithProvider({ provider, model, apiKey, corpus, documents: extraction.documents });
      const analysis = normalizeAnalysis(providerAnalysis, extraction.warnings);
      const docx = await renderAnalysisDocx(analysis);
      return res.json({ analysis, downloadId: docx.id });
    } catch (error) {
      const status = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
      return res.status(status).json({ error: error.message || 'Analyse fehlgeschlagen.' });
    }
  });

  app.get('/api/download/:id', async (req, res) => {
    const filePath = getDocxPath(req.params.id);
    if (!filePath) return res.status(404).json({ error: 'Download nicht gefunden.' });
    try {
      const buffer = await fs.readFile(filePath);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="ausschreibungsanalyse.docx"');
      res.send(buffer);
    } catch {
      res.status(404).json({ error: 'Download nicht gefunden.' });
    }
  });

  app.use(express.static(publicDir()));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(publicDir(), 'index.html'));
  });

  return app;
}
