import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const providerModels = {
  openai: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
};

function List({ items }) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) return <span className="muted">Keine Angabe</span>;
  return <ul>{values.map((item, index) => <li key={index}>{String(item)}</li>)}</ul>;
}

function Field({ label, value }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{value || <span className="muted">Unbekannt</span>}</dd>
    </div>
  );
}

function ResultPreview({ analysis, downloadId }) {
  const matrix = Array.isArray(analysis.bidNoBidMatrix) ? analysis.bidNoBidMatrix : [];
  return (
    <section className="result">
      <div className={`recommendation ${analysis.executiveSummary?.recommendation?.toLowerCase() || 'review'}`}>
        <div>
          <span>Empfehlung</span>
          <strong>{analysis.executiveSummary?.recommendation || 'Review'}</strong>
        </div>
        <div>
          <span>Sicherheit</span>
          <strong>{analysis.executiveSummary?.confidence || 'low'}</strong>
        </div>
        <a className="download" href={`/api/download/${downloadId}`}>DOCX herunterladen</a>
      </div>

      <div className="grid two">
        <article>
          <h2>Kurzüberblick</h2>
          <List items={analysis.executiveSummary?.mainReasons} />
          <h3>Unklarheiten</h3>
          <List items={analysis.executiveSummary?.criticalUnknowns} />
        </article>
        <article>
          <h2>Basisdaten</h2>
          <dl className="facts">
            <Field label="Thema" value={analysis.tenderBasics?.topic} />
            <Field label="Einstieg" value={analysis.tenderBasics?.entryPoint} />
            <Field label="Struktur" value={analysis.tenderBasics?.structure} />
            <Field label="Frist" value={analysis.tenderBasics?.submissionDeadline} />
            <Field label="Laufzeit" value={analysis.tenderBasics?.contractRuntime} />
            <Field label="Volumen" value={analysis.tenderBasics?.estimatedVolume} />
            <Field label="Erfüllungsort" value={analysis.tenderBasics?.placeOfPerformance} />
            <Field label="Remote" value={analysis.tenderBasics?.remoteShare} />
            <Field label="Deutschpflicht" value={analysis.tenderBasics?.germanLanguageRequirement} />
            <Field label="Nur Personal aus DE" value={analysis.tenderBasics?.germanyOnlyPersonnel} />
          </dl>
        </article>
      </div>

      <div className="grid two">
        <article>
          <h2>Unternehmensreferenzen/-nachweise</h2>
          <List items={analysis.companyReferencesAndEvidence?.requiredCompanyReferences} />
          <h3>Mindest-/Ausschlusskriterien</h3>
          <List items={analysis.companyReferencesAndEvidence?.exclusionOrMinimumCriteria} />
          <h3>Volle Punktzahl</h3>
          <List items={analysis.companyReferencesAndEvidence?.maximumScoreNeeds} />
        </article>
        <article>
          <h2>Personalqualifikation</h2>
          <List items={analysis.staffQualification?.requiredRolesProfiles} />
          <h3>Muss-Qualifikationen</h3>
          <List items={analysis.staffQualification?.mustQualifications} />
          <h3>Volle Punktzahl</h3>
          <List items={analysis.staffQualification?.maximumScoreNeeds} />
        </article>
      </div>

      <article>
        <h2>Bid-/No-Bid-Matrix</h2>
        <table>
          <thead><tr><th>Kriterium</th><th>Status</th><th>Begründung</th><th>Quelle</th></tr></thead>
          <tbody>
            {matrix.map((row, index) => (
              <tr key={index}>
                <td>{row.criterion}</td>
                <td><span className={`status ${row.status}`}>{row.status}</span></td>
                <td>{row.reason}</td>
                <td>{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article>
        <h2>Warnhinweise</h2>
        <List items={analysis.warnings} />
      </article>
    </section>
  );
}

function App() {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState(providerModels.openai[0]);
  const [apiKey, setApiKey] = useState('');
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('Bereit');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const models = useMemo(() => providerModels[provider] || [], [provider]);

  const changeProvider = (next) => {
    setProvider(next);
    setModel(providerModels[next][0]);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!files.length) {
      setError('Bitte ZIP oder mindestens eine Datei auswählen.');
      return;
    }
    if (!apiKey.trim()) {
      setError('Bitte API-Key für den aktuellen Analyse-Request eingeben.');
      return;
    }
    const body = new FormData();
    files.forEach((file) => body.append('files', file));
    body.append('provider', provider);
    body.append('model', model);
    body.append('apiKey', apiKey);
    setStatus('Upload und Textextraktion laufen...');
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Analyse fehlgeschlagen.');
      setStatus('Analyse abgeschlossen');
      setApiKey('');
      setResult(payload);
    } catch (err) {
      setStatus('Fehler');
      setError(err.message);
    }
  };

  return (
    <main>
      <header>
        <h1>Ausschreibungsanalyse</h1>
        <p>Entscheidungsorientierte Erstbewertung für Bid-/No-Bid mit Fokus auf Ausschlusskriterien, Referenzen, Nachweise und Personal.</p>
      </header>

      <form className="workspace" onSubmit={submit}>
        <section className="panel upload">
          <h2>Unterlagen</h2>
          <label className="drop">
            <input type="file" multiple accept=".zip,.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            <strong>Dateien auswählen</strong>
            <span>ZIP, PDF, Word, Excel, CSV oder TXT</span>
          </label>
          <div className="filelist">
            {files.length ? files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>) : <span className="muted">Keine Dateien ausgewählt</span>}
          </div>
        </section>

        <section className="panel controls">
          <h2>KI-Konfiguration</h2>
          <label>Provider
            <select value={provider} onChange={(event) => changeProvider(event.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic / Claude</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </label>
          <label>API-Key
            <input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Nur für diesen Request" />
          </label>
          <label>Modell
            <input list="models" value={model} onChange={(event) => setModel(event.target.value)} />
            <datalist id="models">{models.map((item) => <option value={item} key={item} />)}</datalist>
          </label>
          <button type="submit">Analyse starten</button>
        </section>

        <section className="panel statusbox">
          <h2>Status</h2>
          <p>{status}</p>
          {error && <div className="error">{error}</div>}
        </section>
      </form>

      {result?.analysis && <ResultPreview analysis={result.analysis} downloadId={result.downloadId} />}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
