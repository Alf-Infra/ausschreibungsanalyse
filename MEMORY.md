# MEMORY — ausschreibungsanalyse

## Iterationen

### v1 (2026-05-31)
- Auftrag: App zur fundierten KI-Erstauswertung öffentlicher Ausschreibungsunterlagen mit Upload von ZIP/Einzeldateien, Provider-/Modellauswahl und strukturiertem Word-Export für schnelle Bid-/No-Bid-Entscheidungen.
- Codex-Commits: `2ce9ab6` (Build), `056df3a` (Deploy).
- Besonderheiten: React/Vite + Express, Dokumentextraktion für ZIP/PDF/DOCX/XLSX/CSV/TXT, Provider-Abstraktion für OpenAI/Anthropic/Gemini, Mock-Analyse für Tests und echte DOCX-Ausgabe.
- Deploy: Port 3108, PM2 `ausschreibungsanalyse`, GitHub https://github.com/Alf-Infra/ausschreibungsanalyse.

### v1.1 (2026-05-31)
- Auftrag: Modell-Auswahllisten aktualisieren; alte/schwache Default-Modelle entfernen.
- Änderung: OpenAI-Auswahl auf `gpt-5.5` und `gpt-5.4`; Anthropic-Auswahl auf `claude-sonnet-4-6`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-1-20250805`; Gemini-Auswahl auf `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`.
- Besonderheiten: Manuelle Modell-ID-Eingabe bleibt erhalten, weil API-Verfügbarkeit je Provider-Key variieren kann.
