import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { extractDocumentsFromUploads } from '../src/server/extractors.js';

test('extracts txt, csv and recursive zip contents while warning on unsupported files', async () => {
  const nested = new JSZip();
  nested.file('details.csv', 'Kriterium,Wert\nAbgabefrist,31.12.2026\nSprache,Deutsch');
  const nestedBuffer = await nested.generateAsync({ type: 'nodebuffer' });

  const zip = new JSZip();
  zip.file('intro.txt', 'Ausschreibung fuer Beratungsleistungen mit Unternehmensreferenzen.');
  zip.file('nested.zip', nestedBuffer);
  zip.file('image.png', Buffer.from('not supported'));
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  const { documents, warnings } = await extractDocumentsFromUploads([
    { originalname: 'paket.zip', buffer: zipBuffer }
  ]);

  assert.equal(documents.length, 2);
  assert.match(documents.map((doc) => doc.name).join('\n'), /paket\.zip\/intro\.txt/);
  assert.match(documents.map((doc) => doc.text).join('\n'), /Abgabefrist/);
  assert.ok(warnings.some((warning) => warning.includes('image.png')));
});

test('doc files do not crash and produce a clear warning', async () => {
  const { documents, warnings } = await extractDocumentsFromUploads([
    { originalname: 'alt.doc', buffer: Buffer.from('legacy') }
  ]);

  assert.equal(documents.length, 0);
  assert.ok(warnings.some((warning) => warning.includes('.doc')));
});
