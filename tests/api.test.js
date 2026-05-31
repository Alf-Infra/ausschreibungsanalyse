import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { getDocxPath } from '../src/server/docx.js';

const app = createApp();

test('GET /health returns exact JSON body', async () => {
  const response = await request(app).get('/health').expect(200);
  assert.equal(response.text, '{"ok":true}');
});

test('mock analyze returns structured JSON, download id and no API key leakage', async () => {
  const secret = 'sk-test-secret-value-that-must-not-appear';
  const response = await request(app)
    .post('/api/analyze')
    .field('provider', 'mock')
    .field('model', 'mock-model')
    .field('apiKey', secret)
    .attach('files', Buffer.from('Abgabefrist 31.12.2026. Deutsch ist Projektsprache. Unternehmensreferenzen und Personalqualifikation erforderlich.'), 'ausschreibung.txt')
    .expect(200);

  assert.equal(response.body.analysis.executiveSummary.recommendation, 'Review');
  assert.ok(response.body.analysis.tenderBasics);
  assert.ok(response.body.analysis.companyReferencesAndEvidence);
  assert.ok(response.body.analysis.staffQualification);
  assert.ok(response.body.downloadId);
  assert.equal(JSON.stringify(response.body).includes(secret), false);

  const filePath = getDocxPath(response.body.downloadId);
  const buffer = await fs.readFile(filePath);
  assert.equal(buffer.subarray(0, 2).toString('utf8'), 'PK');
  assert.equal(buffer.includes(Buffer.from(secret)), false);

  const download = await request(app).get(`/api/download/${response.body.downloadId}`).expect(200);
  assert.match(download.headers['content-disposition'], /ausschreibungsanalyse\.docx/);
});

test('analyze validates missing API key without echoing sensitive data', async () => {
  const response = await request(app)
    .post('/api/analyze')
    .field('provider', 'openai')
    .field('model', 'gpt-4.1-mini')
    .attach('files', Buffer.from('Text'), 'a.txt')
    .expect(400);

  assert.match(response.body.error, /API-Key/);
});
