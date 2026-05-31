import fs from 'node:fs/promises';
import path from 'node:path';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { v4 as uuidv4 } from 'uuid';

const TMP_DIR = path.resolve('tmp');
const RESULT_DIR = path.join(TMP_DIR, 'results');

function text(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  if (value === undefined || value === null || value === '') return 'Unbekannt';
  return String(value);
}

function heading(value, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text: value, heading: level, spacing: { before: 240, after: 120 } });
}

function para(value, bold = false) {
  return new Paragraph({ children: [new TextRun({ text: text(value), bold })], spacing: { after: 100 } });
}

function bullets(items) {
  const values = Array.isArray(items) && items.length ? items : ['Keine Angabe'];
  return values.map((item) => new Paragraph({ text: text(item), bullet: { level: 0 }, spacing: { after: 80 } }));
}

function table(headers, rows) {
  const allRows = [
    new TableRow({ children: headers.map((header) => new TableCell({ children: [para(header, true)] })) }),
    ...rows.map((row) => new TableRow({ children: row.map((cell) => new TableCell({ children: [para(cell)] })) }))
  ];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: allRows });
}

export async function renderAnalysisDocx(analysis) {
  await fs.mkdir(RESULT_DIR, { recursive: true });
  const id = uuidv4();
  const filePath = path.join(RESULT_DIR, `${id}.docx`);
  const matrixRows = (analysis.bidNoBidMatrix || []).map((row) => [row.criterion, row.status, row.reason, row.source]);
  const sourceRows = (analysis.sourceNotes || []).map((row) => [row.documentName, row.location, row.note]);
  const basics = analysis.tenderBasics || {};
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        heading('Bid-/No-Bid-Empfehlung'),
        table(['Empfehlung', 'Sicherheit'], [[analysis.executiveSummary?.recommendation, analysis.executiveSummary?.confidence]]),
        heading('Hauptgruende', HeadingLevel.HEADING_2),
        ...bullets(analysis.executiveSummary?.mainReasons),
        heading('Kritische Unklarheiten', HeadingLevel.HEADING_2),
        ...bullets(analysis.executiveSummary?.criticalUnknowns),

        heading('Kritische Ausschlusskriterien und rote Risiken'),
        table(['Kriterium', 'Status', 'Begruendung', 'Quelle'], matrixRows.length ? matrixRows : [['Keine Angabe', 'unbekannt', 'Keine Angabe', 'Keine Angabe']]),
        heading('Harte Ausschlusskriterien', HeadingLevel.HEADING_2),
        ...bullets(analysis.exclusionCriteria?.hardExclusionCriteria),
        heading('Mindestanforderungen und Nachweise', HeadingLevel.HEADING_2),
        ...bullets([...(analysis.exclusionCriteria?.minimumRequirements || []), ...(analysis.exclusionCriteria?.formalEvidence || [])]),

        heading('Unternehmensreferenzen und Unternehmensnachweise'),
        table(
          ['Aspekt', 'Bewertung'],
          [
            ['Geforderte Referenzen', text(analysis.companyReferencesAndEvidence?.requiredCompanyReferences)],
            ['Mindestanzahl/Zeitraum/Volumen', `${text(analysis.companyReferencesAndEvidence?.minimumNumber)} / ${text(analysis.companyReferencesAndEvidence?.timeframe)} / ${text(analysis.companyReferencesAndEvidence?.projectVolume)}`],
            ['Ausschluss-/Mindestkriterien', text(analysis.companyReferencesAndEvidence?.exclusionOrMinimumCriteria)],
            ['Bewertungskriterien', text(analysis.companyReferencesAndEvidence?.evaluationCriteria)],
            ['Volle Punktzahl', text(analysis.companyReferencesAndEvidence?.maximumScoreNeeds)],
            ['Risiken/Luecken', text(analysis.companyReferencesAndEvidence?.risksAndGaps)]
          ]
        ),

        heading('Personalqualifikation'),
        table(
          ['Aspekt', 'Bewertung'],
          [
            ['Rollen/Profile', text(analysis.staffQualification?.requiredRolesProfiles)],
            ['Muss-Qualifikationen', text(analysis.staffQualification?.mustQualifications)],
            ['Soll-/Bewertungskriterien', text(analysis.staffQualification?.optionalOrEvaluationCriteria)],
            ['Zertifikate/Erfahrung/Sprache/Standort', text(analysis.staffQualification?.certificatesExperienceLanguageLocation)],
            ['Volle Punktzahl', text(analysis.staffQualification?.maximumScoreNeeds)],
            ['Risiken/Luecken', text(analysis.staffQualification?.risksAndGaps)]
          ]
        ),

        heading('Kurzer Basisueberblick'),
        table(
          ['Feld', 'Wert'],
          [
            ['Thematik', basics.topic],
            ['Einstiegspunkt', basics.entryPoint],
            ['Struktur', basics.structure],
            ['Abgabefrist', basics.submissionDeadline],
            ['Laufzeit', basics.contractRuntime],
            ['Volumen', basics.estimatedVolume],
            ['Zuschlagskriterien Preis/Qualitaet', `${text(analysis.awardCriteria?.priceWeighting)} / ${text(analysis.awardCriteria?.qualityWeighting)}`],
            ['Punkte-/Bewertungslogik', text(analysis.awardCriteria?.scoringLogic)],
            ['Volle Qualitaetspunktzahl', text(analysis.awardCriteria?.fullQualityScoreRequirements)],
            ['Erfuellungsort/Remote', `${text(basics.placeOfPerformance)} / ${text(basics.remoteShare)}`],
            ['Sprache/Deutschland-Beschraenkung', `${text(basics.germanLanguageRequirement)} / ${text(basics.germanyOnlyPersonnel)}`]
          ]
        ),

        heading('Quellen und Warnhinweise'),
        table(['Dokument', 'Fundstelle', 'Hinweis'], sourceRows.length ? sourceRows : [['Keine Angabe', 'Keine Angabe', 'Keine Angabe']]),
        heading('Warnhinweise', HeadingLevel.HEADING_2),
        ...bullets(analysis.warnings)
      ]
    }]
  });
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(filePath, buffer);
  return { id, filePath };
}

export function getDocxPath(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return path.join(RESULT_DIR, `${id}.docx`);
}
