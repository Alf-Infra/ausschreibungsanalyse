# MEMORY — ausschreibungsanalyse

## Iterationen

### v1 (2026-05-31)
- Auftrag: App zur fundierten KI-Erstauswertung öffentlicher Ausschreibungsunterlagen mit Upload von ZIP/Einzeldateien, Provider-/Modellauswahl und strukturiertem Word-Export für schnelle Bid-/No-Bid-Entscheidungen.
- Codex-Commits: `2ce9ab6` (Build), `056df3a` (Deploy).
- Besonderheiten: React/Vite + Express, Dokumentextraktion für ZIP/PDF/DOCX/XLSX/CSV/TXT, Provider-Abstraktion für OpenAI/Anthropic/Gemini, Mock-Analyse für Tests und echte DOCX-Ausgabe.
- Deploy: Port 3108, PM2 `ausschreibungsanalyse`, GitHub https://github.com/Alf-Infra/ausschreibungsanalyse.
