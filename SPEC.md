# SPEC — Ausschreibungsanalyse

**Slug:** ausschreibungsanalyse
**Iteration:** v1.1
**Type:** feature
**Port:** 3108
**Eingegangen:** 2026-05-31T07:29:00+02:00

## Beschreibung

Kevin möchte eine App, die öffentliche Ausschreibungsunterlagen als ZIP oder als einzelne Dateien entgegennimmt, die Unterlagen per KI fundiert erst-auswertet und eine strukturierte Word-Datei erzeugt. Standard-Eingaben sind PDF-, Word- und Excel-Dokumente.

Das Ziel ist eine schnelle Bid-/No-Bid-Decision. Deshalb muss die Ausgabe sehr klar zwischen Kurzüberblick, Ausschlusskriterien, Bewertungskriterien und realistischer Gewinnchance unterscheiden. Besonders wichtig sind:

- Ausschlusskriterien und Mindestanforderungen bezogen auf Unternehmensreferenzen und Unternehmensnachweise.
- Bewertungskriterien und Punktemechanik bezogen auf Unternehmensreferenzen und Unternehmensnachweise.
- Ausschlusskriterien, Mindestanforderungen und Bewertungskriterien bezogen auf Qualifikation des eingesetzten Personals.
- Was konkret für volle Punktzahl im Bereich Qualität benötigt wird.
- Hinweise, ob Auftragserfüllung in deutscher Sprache verpflichtend ist oder Personal nur aus Deutschland zugelassen ist.

Alle anderen Informationen sollen kurz, prägnant und entscheidungsorientiert ausgegeben werden.

## User Flow

- Nutzer öffnet die Web-App.
- Nutzer lädt eine ZIP-Datei oder mehrere einzelne Dateien hoch.
- Unterstützte Dateitypen in v1: `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.csv`, `.txt`; ZIPs dürfen diese Dateien enthalten.
- Nutzer wählt KI-Provider: OpenAI, Anthropic/Claude oder Google Gemini.
- Nutzer gibt einen API-Key für den gewählten Provider ein.
- Nutzer wählt ein Modell aus einer editierbaren Modellliste.
- Nutzer startet die Analyse.
- App extrahiert Text aus den Dokumenten, zeigt Verarbeitungsstatus und ruft den gewählten Provider mit einem strukturierten Analyseprompt auf.
- App zeigt eine Vorschau der strukturierten Auswertung.
- Nutzer kann die Auswertung als `.docx` herunterladen.

## Datenschutz / API-Key

- API-Keys dürfen nicht dauerhaft gespeichert werden.
- API-Keys dürfen nicht in LocalStorage, Logs, Git, Result-Dateien oder Fehlermeldungen landen.
- Der Key darf nur für den aktuellen Analyse-Request verwendet werden.
- Fehlerausgaben müssen Provider-/HTTP-Status und hilfreiche Erklärung enthalten, aber niemals den API-Key.

## Analyse-Schema

Die KI-Auswertung muss intern als strukturiertes JSON erzeugt und anschließend als Word-Dokument gerendert werden. Das JSON muss mindestens folgende Felder enthalten:

- `executiveSummary`
  - `recommendation`: `Bid`, `No-Bid` oder `Review`
  - `confidence`: `high`, `medium` oder `low`
  - `mainReasons`: kurze Stichpunkte
  - `criticalUnknowns`: fehlende oder unsichere Informationen
- `tenderBasics`
  - `topic`
  - `entryPoint`: direktes Angebot, Teilnahmewettbewerb, Verhandlungsverfahren, unbekannt
  - `structure`: Lose, Rahmenvereinbarung, Einzelauftrag, dynamisches Beschaffungssystem, sonstiges
  - `submissionDeadline`
  - `contractRuntime`
  - `estimatedVolume`
  - `placeOfPerformance`
  - `remoteShare`
  - `germanLanguageRequirement`
  - `germanyOnlyPersonnel`
- `lots`
  - Losnummer, Titel, Umfang, relevante Besonderheiten
- `awardCriteria`
  - Preis/Gewichtung
  - Qualität/Gewichtung
  - Unterkriterien
  - Punkte-/Bewertungslogik
  - Anforderungen für volle Punktzahl im Qualitätsbereich
- `exclusionCriteria`
  - harte Ausschlusskriterien
  - Mindestanforderungen
  - formale Nachweise
  - Fristen/Formvorgaben
- `companyReferencesAndEvidence`
  - geforderte Unternehmensreferenzen
  - Mindestanzahl, Zeitraum, Projektvolumen, Themenfit, Auftraggebertyp
  - geforderte Unternehmensnachweise
  - Ausschluss-/Mindestkriterien
  - Bewertungskriterien
  - Was für maximale Punktzahl nötig ist
  - Risiken/Lücken
- `staffQualification`
  - geforderte Rollen/Profile
  - Muss-Qualifikationen
  - Soll-/Bewertungskriterien
  - Zertifikate, Erfahrung, Sprachlevel, Standort-/Präsenzanforderungen
  - Was für maximale Punktzahl nötig ist
  - Risiken/Lücken
- `bidNoBidMatrix`
  - Kriterium
  - Status: grün/gelb/rot/unbekannt
  - Begründung
  - Quelle/Dokumenthinweis
- `sourceNotes`
  - Dokumentname
  - Fundstelle falls extrahierbar: Seite, Tabellenblatt, Abschnitt oder Textanker
- `warnings`
  - unsichere Extraktion
  - widersprüchliche Angaben
  - fehlende Unterlagen

## Word-Ausgabe

Die App muss eine echte `.docx`-Datei erzeugen, keine HTML-Datei mit anderer Endung.

Das Word-Dokument muss klar gegliedert sein:

1. Bid-/No-Bid-Empfehlung auf der ersten Seite.
2. Kritische Ausschlusskriterien und rote Risiken.
3. Unternehmensreferenzen und Unternehmensnachweise: Muss-Kriterien, Bewertung, volle Punktzahl.
4. Personalqualifikation: Muss-Kriterien, Bewertung, volle Punktzahl.
5. Kurzer Basisüberblick: Thematik, Einstiegspunkt, Struktur, Fristen, Laufzeit, Volumen, Zuschlagskriterien, Erfüllungsort/Remote, Sprache/Deutschland-Beschränkung.
6. Quellen-/Fundstellenübersicht und Warnhinweise.

Die wichtigsten Punkte müssen tabellarisch dargestellt werden, wo es der Lesbarkeit hilft.

## Provider / Modelle

Implementiere einen Provider-Abstraktionslayer für:

- OpenAI: Chat Completions oder Responses API über `fetch`; Modellliste mit mindestens `gpt-5.5`, `gpt-5.4`.
- Anthropic/Claude: Messages API über `fetch`; Modellliste mit mindestens `claude-sonnet-4-6`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-1-20250805`.
- Google Gemini: Generative Language API über `fetch`; Modellliste mit mindestens `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`.

Die Modellliste muss im UI editierbar sein, damit Kevin ein anderes Modell manuell eintragen kann.

Hinweis: Einige Frontier-Modelle können je nach API-Key/Account noch nicht freigeschaltet sein. Die App soll sie auswählbar machen, Provider-Fehler aber klar anzeigen und weiterhin manuelle Modell-IDs erlauben.

Wenn Provider-Aufrufe im Test nicht möglich sind, muss die Analyse-Logik über eine Mock-Provider-Implementierung testbar sein.

## Dokument-Parsing

- ZIP-Dateien rekursiv entpacken und enthaltene unterstützte Dateien analysieren.
- PDF-Text extrahieren.
- DOCX-Text extrahieren.
- XLSX/XLS/CSV-Inhalte extrahieren, inklusive Blattnamen.
- TXT direkt lesen.
- Für `.doc` darf v1 eine klare Fehlermeldung oder Best-Effort-Unterstützung liefern; kein Crash.
- Nicht unterstützte Dateien überspringen und in `warnings` aufführen.
- Große Eingaben müssen begrenzt und nachvollziehbar gekürzt werden, statt unkontrolliert Provider-Limits zu überschreiten.

## UI-Anforderungen

- Seriöse, dichte Arbeitsoberfläche, keine Marketing-Landingpage.
- Erste Ansicht: Upload-Bereich, Provider/API-Key/Modell-Auswahl, Start-Button, Statusbereich.
- Nach Analyse: strukturierte Ergebnisvorschau mit klarer Bid-/No-Bid-Empfehlung und Download-Button für Word.
- Fehlerzustände für ungültige Dateien, fehlenden API-Key, Providerfehler und Extraktionsfehler.
- Keine API-Key-Anzeige nach Eingabe außer maskiert.

## API-Anforderungen

- `GET /health` liefert exakt `{"ok":true}`.
- `POST /api/analyze` nimmt Multipart-Upload, Provider, Modell und API-Key entgegen und gibt strukturiertes JSON plus eine serverseitige Download-ID zurück.
- `GET /api/download/:id` liefert die erzeugte `.docx`.
- Temporäre Dateien und Analyse-Artefakte dürfen lokal im App-Verzeichnis unter `tmp/` liegen und sollten nach Neustart nicht kritisch sein.

## Acceptance Criteria

- [ ] App startet auf `process.env.PORT`, Fallback `PORT.txt`.
- [ ] `GET /health` liefert exakt `{"ok":true}`.
- [ ] UI erlaubt Upload von ZIP und mehreren Einzeldateien.
- [ ] UI erlaubt Provider-Auswahl OpenAI, Claude/Anthropic und Gemini.
- [ ] UI erlaubt API-Key-Eingabe ohne persistente Speicherung.
- [ ] UI erlaubt Modell-Auswahl und manuelle Modell-Eingabe.
- [ ] Analyse erzeugt strukturierte JSON-Auswertung nach dem Analyse-Schema.
- [ ] Auswertung enthält alle Mindestkriterien aus Kevins Auftrag: Thematik, Einstiegspunkt, Struktur, Abgabefrist, Laufzeit, Volumen, Zuschlagskriterien, Unternehmensreferenzen/-nachweise, Personalqualifikation, Erfüllungsort/Remote, German-only/Sprache.
- [ ] Auswertung hebt Ausschlusskriterien und Bewertungskriterien für Unternehmensreferenzen/-nachweise gesondert hervor.
- [ ] Auswertung hebt Ausschlusskriterien und Bewertungskriterien für Personalqualifikation gesondert hervor.
- [ ] Auswertung beschreibt, was für volle Punktzahl im Qualitätsbereich erforderlich ist.
- [ ] Auswertung gibt eine Bid-/No-Bid-/Review-Empfehlung mit Gründen und Unsicherheiten.
- [ ] App erzeugt eine echte `.docx`-Datei mit strukturierter Auswertung.
- [ ] Tests decken Health, Parser/ZIP-Verarbeitung, Mock-Analyse, API-Key-Nichtpersistenz und DOCX-Erzeugung ab.
- [ ] `npm test` ist grün.
- [ ] `npm run build` ist grün.

## Stack-Pflicht

- Node.js v22 kompatibel.
- React + Vite für UI.
- Express für Backend.
- `process.env.PORT` muss als Port-Quelle genutzt werden; Fallback aus `PORT.txt` nur, wenn `process.env.PORT` nicht gesetzt ist.
- npm test über `node --test` oder vitest.
- Für ZIP, PDF, DOCX, XLSX und DOCX-Ausgabe bevorzugt etablierte npm-Libraries nutzen, nicht selbst Binärformate parsen.
- Keine Datenbank in v1 nötig; temporäre Ergebnisse im Dateisystem reichen.

## Nicht-Ziele

- Kein produktionsreifes Nutzer-/Rechtesystem.
- Kein dauerhaftes Speichern von Ausschreibungsunterlagen.
- Kein OCR für gescannte PDFs in v1, aber klare Warnung bei leerer PDF-Extraktion.
- Keine garantierte Rechtsberatung; Ausgabe ist eine KI-gestützte Erstauswertung.

## Definition of Done

- Tests grün.
- Build grün.
- App startet auf Port aus `process.env.PORT`.
- `/health` Endpoint OK.
- Root-Route liefert HTML.
- Analysefluss ist mit Mock-Provider ohne echte API-Keys testbar.
- Word-Export funktioniert.
