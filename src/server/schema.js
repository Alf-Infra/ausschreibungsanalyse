export function emptyAnalysis() {
  return {
    executiveSummary: {
      recommendation: 'Review',
      confidence: 'low',
      mainReasons: [],
      criticalUnknowns: []
    },
    tenderBasics: {
      topic: 'Unbekannt',
      entryPoint: 'unbekannt',
      structure: 'sonstiges',
      submissionDeadline: 'Unbekannt',
      contractRuntime: 'Unbekannt',
      estimatedVolume: 'Unbekannt',
      placeOfPerformance: 'Unbekannt',
      remoteShare: 'Unbekannt',
      germanLanguageRequirement: 'Unbekannt',
      germanyOnlyPersonnel: 'Unbekannt'
    },
    lots: [],
    awardCriteria: {
      priceWeighting: 'Unbekannt',
      qualityWeighting: 'Unbekannt',
      subcriteria: [],
      scoringLogic: [],
      fullQualityScoreRequirements: []
    },
    exclusionCriteria: {
      hardExclusionCriteria: [],
      minimumRequirements: [],
      formalEvidence: [],
      deadlinesAndFormalities: []
    },
    companyReferencesAndEvidence: {
      requiredCompanyReferences: [],
      minimumNumber: 'Unbekannt',
      timeframe: 'Unbekannt',
      projectVolume: 'Unbekannt',
      topicFit: 'Unbekannt',
      clientType: 'Unbekannt',
      requiredCompanyEvidence: [],
      exclusionOrMinimumCriteria: [],
      evaluationCriteria: [],
      maximumScoreNeeds: [],
      risksAndGaps: []
    },
    staffQualification: {
      requiredRolesProfiles: [],
      mustQualifications: [],
      optionalOrEvaluationCriteria: [],
      certificatesExperienceLanguageLocation: [],
      maximumScoreNeeds: [],
      risksAndGaps: []
    },
    bidNoBidMatrix: [],
    sourceNotes: [],
    warnings: []
  };
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function mergeObject(base, incoming) {
  const result = { ...base };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (Array.isArray(base[key])) {
      result[key] = ensureArray(value);
    } else if (base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      result[key] = mergeObject(base[key], value);
    } else if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  }
  return result;
}

export function normalizeAnalysis(value, extraWarnings = []) {
  const merged = mergeObject(emptyAnalysis(), value || {});
  merged.executiveSummary.recommendation = ['Bid', 'No-Bid', 'Review'].includes(merged.executiveSummary.recommendation)
    ? merged.executiveSummary.recommendation
    : 'Review';
  merged.executiveSummary.confidence = ['high', 'medium', 'low'].includes(merged.executiveSummary.confidence)
    ? merged.executiveSummary.confidence
    : 'low';
  merged.warnings = [...ensureArray(merged.warnings), ...extraWarnings].filter(Boolean);
  return merged;
}

export function analysisSchemaInstruction() {
  return `Gib ausschliesslich valides JSON ohne Markdown zurueck. Nutze dieses Schema:
{
  "executiveSummary": {"recommendation": "Bid|No-Bid|Review", "confidence": "high|medium|low", "mainReasons": ["..."], "criticalUnknowns": ["..."]},
  "tenderBasics": {"topic": "...", "entryPoint": "direktes Angebot|Teilnahmewettbewerb|Verhandlungsverfahren|unbekannt", "structure": "Lose|Rahmenvereinbarung|Einzelauftrag|dynamisches Beschaffungssystem|sonstiges", "submissionDeadline": "...", "contractRuntime": "...", "estimatedVolume": "...", "placeOfPerformance": "...", "remoteShare": "...", "germanLanguageRequirement": "...", "germanyOnlyPersonnel": "..."},
  "lots": [{"lotNumber": "...", "title": "...", "scope": "...", "specialNotes": "..."}],
  "awardCriteria": {"priceWeighting": "...", "qualityWeighting": "...", "subcriteria": ["..."], "scoringLogic": ["..."], "fullQualityScoreRequirements": ["..."]},
  "exclusionCriteria": {"hardExclusionCriteria": ["..."], "minimumRequirements": ["..."], "formalEvidence": ["..."], "deadlinesAndFormalities": ["..."]},
  "companyReferencesAndEvidence": {"requiredCompanyReferences": ["..."], "minimumNumber": "...", "timeframe": "...", "projectVolume": "...", "topicFit": "...", "clientType": "...", "requiredCompanyEvidence": ["..."], "exclusionOrMinimumCriteria": ["..."], "evaluationCriteria": ["..."], "maximumScoreNeeds": ["..."], "risksAndGaps": ["..."]},
  "staffQualification": {"requiredRolesProfiles": ["..."], "mustQualifications": ["..."], "optionalOrEvaluationCriteria": ["..."], "certificatesExperienceLanguageLocation": ["..."], "maximumScoreNeeds": ["..."], "risksAndGaps": ["..."]},
  "bidNoBidMatrix": [{"criterion": "...", "status": "grün|gelb|rot|unbekannt", "reason": "...", "source": "..."}],
  "sourceNotes": [{"documentName": "...", "location": "...", "note": "..."}],
  "warnings": ["..."]
}`;
}
