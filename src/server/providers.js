import { analysisSchemaInstruction, normalizeAnalysis } from './schema.js';

function safeProviderError(provider, status, body) {
  const compact = String(body || '').replace(/[A-Za-z0-9_\-]{24,}/g, '[redacted]').slice(0, 900);
  const error = new Error(`${provider} API Fehler${status ? ` (${status})` : ''}: ${compact || 'Keine Detailantwort erhalten.'}`);
  error.statusCode = status || 502;
  return error;
}

function parseJsonFromText(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Provider-Antwort enthaelt kein valides JSON.');
  }
}

export function buildAnalysisPrompt(documents) {
  return `Du bist ein erfahrener Bid-Manager fuer oeffentliche Ausschreibungen.
Erstelle eine entscheidungsorientierte Erst-Auswertung. Trenne klar zwischen:
- Kurzueberblick und Empfehlung
- harten Ausschlusskriterien und Mindestanforderungen
- Bewertungskriterien und Punktemechanik
- Unternehmensreferenzen und Unternehmensnachweisen
- Personalqualifikation, Sprache, Standort und Praesenz
- Anforderungen fuer volle Punktzahl im Qualitaetsbereich

Kennzeichne fehlende, widerspruechliche oder unsichere Informationen. Keine Rechtsberatung formulieren.

${analysisSchemaInstruction()}

Unterlagen:
${documents}`;
}

export async function analyzeWithProvider({ provider, model, apiKey, corpus, documents }) {
  if (provider === 'mock' || apiKey === 'mock') {
    return mockAnalysis(documents);
  }
  const prompt = buildAnalysisPrompt(corpus);
  if (provider === 'openai') return callOpenAI({ model, apiKey, prompt });
  if (provider === 'anthropic') return callAnthropic({ model, apiKey, prompt });
  if (provider === 'gemini') return callGemini({ model, apiKey, prompt });
  const error = new Error('Unbekannter Provider.');
  error.statusCode = 400;
  throw error;
}

async function callOpenAI({ model, apiKey, prompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Du antwortest nur mit validem JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });
  const body = await response.text();
  if (!response.ok) throw safeProviderError('OpenAI', response.status, body);
  const json = JSON.parse(body);
  return normalizeAnalysis(parseJsonFromText(json.choices?.[0]?.message?.content));
}

async function callAnthropic({ model, apiKey, prompt }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 5000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const body = await response.text();
  if (!response.ok) throw safeProviderError('Anthropic', response.status, body);
  const json = JSON.parse(body);
  const text = (json.content || []).map((part) => part.text || '').join('\n');
  return normalizeAnalysis(parseJsonFromText(text));
}

async function callGemini({ model, apiKey, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    })
  });
  const body = await response.text();
  if (!response.ok) throw safeProviderError('Gemini', response.status, body);
  const json = JSON.parse(body);
  const text = (json.candidates || []).flatMap((candidate) => candidate.content?.parts || []).map((part) => part.text || '').join('\n');
  return normalizeAnalysis(parseJsonFromText(text));
}

function findAny(documents, patterns) {
  const text = documents.map((document) => document.text).join('\n').toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

export function mockAnalysis(documents = []) {
  const names = documents.map((document) => document.name).join(', ') || 'keine Dokumente';
  const hasDeadline = findAny(documents, ['frist', 'abgabe', 'submission']);
  return normalizeAnalysis({
    executiveSummary: {
      recommendation: 'Review',
      confidence: 'medium',
      mainReasons: [
        'Mock-Auswertung auf Basis extrahierter Unterlagen erzeugt.',
        'Bid-/No-Bid sollte nach Abgleich interner Referenzen und Personalprofile entschieden werden.'
      ],
      criticalUnknowns: [
        hasDeadline ? 'Abgabefrist bitte gegen Originalunterlagen validieren.' : 'Abgabefrist wurde nicht eindeutig erkannt.',
        'Konkrete interne Referenzen und CVs wurden nicht bereitgestellt.'
      ]
    },
    tenderBasics: {
      topic: 'Aus den Unterlagen zu pruefen',
      entryPoint: 'unbekannt',
      structure: 'sonstiges',
      submissionDeadline: hasDeadline ? 'In Unterlagen erwaehnt, Fundstelle pruefen' : 'Unbekannt',
      contractRuntime: 'Unbekannt',
      estimatedVolume: 'Unbekannt',
      placeOfPerformance: 'Unbekannt',
      remoteShare: 'Unbekannt',
      germanLanguageRequirement: findAny(documents, ['deutsch', 'german']) ? 'Deutsch-Anforderung wahrscheinlich relevant' : 'Unbekannt',
      germanyOnlyPersonnel: findAny(documents, ['deutschland', 'germany only']) ? 'Moegliche Deutschland-Beschraenkung pruefen' : 'Unbekannt'
    },
    awardCriteria: {
      priceWeighting: 'Unbekannt',
      qualityWeighting: 'Unbekannt',
      subcriteria: ['Qualitaet, Preis und Eignung aus Originalunterlagen detailliert pruefen.'],
      scoringLogic: ['Punktemechanik im Mock nicht belastbar extrahiert.'],
      fullQualityScoreRequirements: ['Passgenaue Referenzen, belastbare Methodik, qualifiziertes Personal und nachweisbare Projekterfahrung erforderlich.']
    },
    exclusionCriteria: {
      hardExclusionCriteria: ['Formale Ausschlusskriterien gegen Vergabeunterlagen pruefen.'],
      minimumRequirements: ['Mindestanforderungen an Referenzen, Nachweise und Personal vollstaendig nachweisen.'],
      formalEvidence: ['Eigenerklaerungen, Registerauszuege, Versicherungs- und Eignungsnachweise pruefen.'],
      deadlinesAndFormalities: ['Fristen, Dateiformate, Signatur und Portalvorgaben validieren.']
    },
    companyReferencesAndEvidence: {
      requiredCompanyReferences: ['Geforderte Unternehmensreferenzen identifizieren und auf Themenfit mappen.'],
      minimumNumber: 'Unbekannt',
      timeframe: 'Unbekannt',
      projectVolume: 'Unbekannt',
      topicFit: 'Hoher Fit wahrscheinlich entscheidend fuer volle Punktzahl.',
      clientType: 'Oeffentliche Auftraggeber koennen relevant sein.',
      requiredCompanyEvidence: ['Unternehmensnachweise vollstaendig sammeln.'],
      exclusionOrMinimumCriteria: ['Mindestanzahl, Zeitraum, Themenfit und Nachweisform sind rote Risiken, falls nicht erfuellt.'],
      evaluationCriteria: ['Bewertung voraussichtlich nach Vergleichbarkeit, Umfang, Rolle und Ergebnisqualitaet.'],
      maximumScoreNeeds: ['Mehrere sehr vergleichbare, aktuelle Referenzen mit klarem Leistungsanteil und nachweisbarem Erfolg.'],
      risksAndGaps: ['Interne Referenzliste fehlt fuer belastbare Bid-Entscheidung.']
    },
    staffQualification: {
      requiredRolesProfiles: ['Projektleitung', 'Fachpersonal', 'Qualitaetssicherung'],
      mustQualifications: ['Muss-Profile, Mindestjahre, Zertifikate und Sprachlevel gegen Unterlagen pruefen.'],
      optionalOrEvaluationCriteria: ['Mehr Erfahrung, einschlaegige Zertifikate und Methodensicherheit koennen Punkte bringen.'],
      certificatesExperienceLanguageLocation: ['Deutschlevel, Praesenzpflicht und Standortvorgaben gesondert pruefen.'],
      maximumScoreNeeds: ['CVs mit exakt passenden Rollen, Branchen-/Technologieerfahrung, Zertifikaten und Verfuegbarkeit.'],
      risksAndGaps: ['Konkrete CVs und Verfuegbarkeiten fehlen.']
    },
    bidNoBidMatrix: [
      { criterion: 'Ausschlusskriterien', status: 'unbekannt', reason: 'Originalvorgaben muessen vollstaendig abgeglichen werden.', source: names },
      { criterion: 'Unternehmensreferenzen', status: 'gelb', reason: 'Passende interne Referenzen noch nicht belegt.', source: names },
      { criterion: 'Personalqualifikation', status: 'gelb', reason: 'Profile und Verfuegbarkeit fehlen.', source: names },
      { criterion: 'Sprache/Deutschland', status: 'unbekannt', reason: 'Deutsch- und Standortvorgaben pruefen.', source: names }
    ],
    sourceNotes: documents.map((document) => ({ documentName: document.name, location: 'extrahierter Text', note: `${document.chars || document.text.length} Zeichen ausgewertet` })),
    warnings: ['Mock-Provider verwendet: Ergebnisse sind nur zur technischen Validierung gedacht.']
  });
}
