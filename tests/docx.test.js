import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { renderAnalysisDocx } from '../src/server/docx.js';
import { mockAnalysis } from '../src/server/providers.js';

test('renders a real docx file for an analysis', async () => {
  const analysis = mockAnalysis([{ name: 'unterlage.txt', text: 'Ausschreibung', chars: 13 }]);
  const result = await renderAnalysisDocx(analysis);
  const buffer = await fs.readFile(result.filePath);

  assert.ok(result.id);
  assert.equal(buffer.subarray(0, 2).toString('utf8'), 'PK');
  assert.ok(buffer.length > 1000);
});
