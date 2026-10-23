# Changelog — CycleAI

Tutte le modifiche e le evoluzioni di **CycleAI** sono documentate in questo file.

---

## [1.0.0] - 2026-10-24 (Release 1.0.0 Stable)

### 🚀 Novità Principali
- **General Availability (GA):** Rilascio stabile 1.0.0 con completamento di tutte e 4 le milestone architetturali.
- **Notifiche Native Windows:** Segnalazioni desktop al completamento dei task, all'attivazione della pausa preventiva al 90% e al risveglio post-reset.
- **Export Report Esecuzione:** Generazione con 1 click di report markdown dettagliati (`PROJECT_REPORT.md`) con stato dei task, log multiplexer e storico consumi.
- **Auto-Configurazione MCP Loopback:** Registrazione sicura del bridge in `%APPDATA%\Claude\claude_desktop_config.json` e nelle customizzazioni Antigravity.
- **Hardening Sicurezza:** Nessun identificativo hardware né hash privati salvati nel codice sorgente.

---

## [0.3.0-beta] - 2026-10-24

### ✨ Aggiunte
- **Loopback MCP Server (`cycleAiMcpServer.ts`):** Protocollo Model Context Protocol implementato per permettere alle app Desktop di interrogare CycleAI (`cycleai_get_active_task`, `cycleai_check_quota_status`).
- **CLI Adapters Nativi (`cliAdapters.ts`):** Rilevamento automatico ed esecuzione per Claude CLI, Codex CLI e Antigravity.
- **Espansione Test Suite:** 21 test automatizzati con copertura completa su 8 file.

---

## [0.2.0-alpha] - 2026-10-24

### ✨ Aggiunte
- **Session Watcher Real-Time:** Watcher in background per monitorare le modifiche nelle directory `~/.codex`, `~/.claude` e `~/.gemini/antigravity/brain`.
- **Process Runner:** Esecuzione di comandi di validazione sul workspace con streaming di stdout e stderr.
- **Persistenza Locale:** Salvataggio delle preferenze e dello storico progetti in `~/.cycleai/app_state.json`.
- **Filtri Log:** Filtraggio rapido nel multiplexer per tipo di evento (PAUSE, HANDOFF, SUCCESS) e copia log.

---

## [0.1.0] - 2026-10-23 (Initial MVP)

### ✨ Aggiunte
- Scaffolding dell'architettura Desktop Windows con Electron, React 19, TypeScript e TailwindCSS.
- Motore Quota & Slot Radar per la stima delle finestre rolling di 5 ore e del Burn Rate.
- Discovery Wizard 100% Upfront con generazione di domande e scomposizione in Task DAG atomici.
- Pre-Reset Graceful Pause (90%) e timer di Auto-Resume.
- Protocollo di passaggio consegne con generazione di `.cycleai/HANDOFF.md` e sincronizzazione file nativi (`CLAUDE.md`, `AGENTS.md`, `.gemini/rules/`).
- Sistema di donazioni (GitHub Sponsors, Ko-fi, PayPal, Crypto TRC20/BTC/ETH).
