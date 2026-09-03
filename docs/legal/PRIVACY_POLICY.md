# Neuro Privacy Policy

**Last Updated:** September 3, 2026  
**Effective Date:** September 3, 2026  

---

## 1. Introduction and Core Philosophy

Neuro ("we," "our," or "the Project") is an open-source, local-first artificial intelligence second brain designed to help you capture, organize, synthesize, and retrieve your personal knowledge, thoughts, tasks, and ideas.

Our guiding architecture is **Local-First Privacy by Design**. We believe that your personal thoughts, journal entries, voice memos, and knowledge graphs represent your most intimate intellectual property. By default, Neuro is designed so that your data resides exclusively on your local computer, under your direct physical and cryptographic control.

This Privacy Policy explains how information is processed when you use the Neuro desktop application, web application, web clipper extension, and self-hosted backend.

---

## 2. Information We Process and Store

### 2.1 Notes, Thoughts, and Knowledge Graph Data
- **What is processed:** The text, Markdown documents, tags, tasks, projects, flashcards, bidirectional links, graph relationships, and file attachments you create or import.
- **Where it lives:** Stored locally on your personal device in your local SQLite database (`./neuro.db`) and local ChromaDB vector store.
- **Transmission:** This data is **never** transmitted to Neuro servers or third parties unless you explicitly enable cloud features (such as third-party AI models or optional cloud sync).

### 2.2 Voice Audio and Audio Recordings
- **What is processed:** Voice dictations, audio notes, and conversational interactions initiated via the Neuro Jarvis interface or voice capture tools.
- **Where it lives:** Audio files are stored locally in your Neuro application data directory.
- **Local Transcription:** When using local speech-to-text models (such as offline Whisper or Vosk), audio is transcribed entirely on your device's CPU/GPU. No audio streams leave your machine.
- **Cloud Transcription (Optional):** If you configure a third-party cloud speech API, audio chunks are sent directly to that provider using your own API credentials. Neuro maintainers never hear or store your voice data.

### 2.3 System Telemetry and Usage Metrics
- **What is processed:** Error tracebacks, crash logs, operating system platform, and anonymized performance metrics (e.g., query latency, memory consumption).
- **Default State:** Telemetry and crash reporting are **strictly opt-in** and disabled by default in self-hosted and open-source installations.
- **Anonymization:** When enabled by explicit user preference, telemetry payloads are scrubbed of any personal identifying information (PII), note contents, document titles, search queries, and file paths before transmission.

---

## 3. Local-First Storage Architecture

Neuro's core design ensures complete offline autonomy:

1. **On-Device Storage:** All note content, vector embeddings, relational metadata, and index caches are stored in your device's local file system.
2. **Offline-First Functionality:** You can create, edit, search, link, and visualize your entire second brain with zero internet connectivity.
3. **Local AI Engine:** Through integrations with local runtime engines such as **Ollama**, you can run LLMs (e.g., Llama 3, Mistral, Gemma) and local embedding models (e.g., `all-MiniLM-L6-v2`) 100% locally on your own hardware without transmitting a single token over the internet.

---

## 4. Optional Cloud Synchronization

If you choose to synchronize your Neuro vault across multiple devices (e.g., desktop, mobile, or web):

- **Opt-In Requirement:** Remote synchronization is completely optional and deactivated by default.
- **End-to-End Encryption (E2EE):** When remote sync is configured with an E2EE-compatible server, all note payloads, files, and graphs are encrypted locally on your device using keys derived from your personal passphrase before being transmitted over TLS.
- **Zero-Knowledge Architecture:** The sync server receives only ciphertext blobs and metadata required for conflict resolution (e.g., timestamps and vector clock hashes). The host server cannot read or decrypt your notes.
- **Self-Hosting:** You can self-host the entire Neuro synchronization server and database, ensuring zero reliance on third-party cloud infrastructure.

---

## 5. Third-Party AI Providers (Bring-Your-Own-Key)

Neuro allows you to optionally connect external cloud AI providers to augment note synthesis, semantic search, and conversational reasoning:

### 5.1 Supported Cloud Providers
- **OpenAI** (GPT-4o, GPT-4, text-embedding-3)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus)
- **Google Cloud** (Gemini 1.5 Pro, Gemini 1.5 Flash)

### 5.2 What Is Sent to Cloud Providers
When you explicitly invoke an AI action (such as summarizing a note, querying the Jarvis agent, or generating flashcards) using a cloud model:
- The selected note excerpt, prompt text, or context window necessary to complete the request is sent over an encrypted TLS connection directly to the provider's API.
- Your personal API key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`) is used for the request.
- **No Intermediary:** The request travels directly from your local Neuro instance to the AI provider. Neuro's maintainers operate no intermediary proxy and cannot inspect your prompts or AI outputs.

### 5.3 AI Provider Data Policies
Each cloud provider maintains its own data retention and privacy policies. Commercial API agreements for OpenAI, Anthropic, and Google Gemini generally specify that API inputs are not used to train foundation models. We urge you to review:
- [OpenAI Enterprise Privacy Policy](https://openai.com/enterprise-privacy)
- [Anthropic Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms)
- [Google Cloud Vertex & AI Studio Privacy](https://cloud.google.com/terms)

If your data contains sensitive, confidential, or regulated information, **we strongly recommend using local offline models (via Ollama) exclusively.**

---

## 6. Telemetry and Diagnostic Reporting

- **Opt-In Only:** Neuro asks for your explicit consent before enabling any diagnostic reporting.
- **What is Collected When Opted-In:**
  - Application version, operating system architecture, Electron/Node/Python version.
  - Non-fatal exceptions and fatal crash traces.
  - Aggregated performance statistics (e.g., vector search duration).
- **What is NEVER Collected:**
  - Text of your notes, titles, or tag labels.
  - Prompts sent to AI models or LLM responses.
  - Usernames, email addresses, passwords, or authentication tokens.
  - File system directory paths or private hostnames.
- You may toggle telemetry on or off at any time in **Settings $\rightarrow$ Privacy & Security $\rightarrow$ Anonymous Telemetry**.

---

## 7. Data Retention, Portability, and Deletion

### 7.1 Data Retention
Because Neuro stores data locally, your data is retained on your device for as long as you choose to keep it. Neuro does not maintain remote backups of your local data.

### 7.2 Data Portability & Export
You own your data completely. At any time, you can export your entire second brain without lock-in:
- **Markdown Export:** Export all notes, frontmatter metadata, and attachments into standard Markdown files organized in folders.
- **SQLite Database:** Direct access to `neuro.db` using any standard SQLite client.
- **JSON / Graph Export:** Complete graph adjacency export for graph databases or visualization tools.

### 7.3 Data Deletion
- **Local Deletion:** Deleting a note or vault within the application immediately removes it from SQLite and deletes the corresponding vector embeddings from ChromaDB.
- **Complete Erasure:** Uninstalling the application and deleting the local application directory (`~/.neuro` or `%APPDATA%\neuro`) permanently removes 100% of your data from your device.
- **Cloud Sync Deletion:** If using an optional cloud sync service, issuing a vault deletion command triggers immediate cryptographic zeroization and purge of the encrypted blobs from the sync server.

---

## 8. Your Rights Under GDPR, CCPA/CPRA, and International Regulations

Whether you are located in the European Economic Area (EEA), United Kingdom, California, or elsewhere in the world, Neuro's local-first architecture provides built-in compliance with global data protection frameworks:

- **Right of Access (GDPR Article 15 / CCPA §1798.100):** You have immediate, unmediated access to all your data locally at all times.
- **Right to Rectification (GDPR Article 16):** You can edit or correct any note, record, or profile at any moment.
- **Right to Erasure / "Right to be Forgotten" (GDPR Article 17 / CCPA §1798.105):** You can delete any note, project, or database instantly without submitting a ticket.
- **Right to Data Portability (GDPR Article 20):** You can export your data in open, standardized formats (Markdown, JSON, SQLite) at zero cost.
- **Do Not Sell or Share My Personal Information (CCPA/CPRA):** Neuro does **not sell, rent, trade, or monetize** your personal information or content under any circumstances.

---

## 9. Third-Party Integrations and Links

The Neuro desktop app and web application may include links to third-party services, plugins, or external documentation:
- **Community Plugins:** Neuro provides an open plugin architecture. Third-party plugins execute in their own isolated contexts. When installing third-party plugins, review their source code and documentation to verify how they handle data.
- **Web Clipper Extension:** The Neuro browser extension clips web pages you explicitly choose to capture. It does not track your general browsing activity, history, or cookies.

---

## 10. Children's Privacy (COPPA Compliance)

Neuro is not directed at children under the age of 13 (or under 16 in the EEA). Because Neuro does not operate a centralized user registration directory or collect personal identifying information, we do not knowingly solicit or collect information from children.

---

## 11. Security Safeguards

We enforce rigorous security standards throughout the Neuro development lifecycle:
- Transport Layer Security (TLS 1.3) across all network calls.
- Electron process isolation (`contextIsolation: true`, `nodeIntegration: false`).
- Zero-PII structured logging with automatic secret masking.
- Weekly automated security and dependency vulnerability scanning.

For full technical specifications, see our [Security Hardening Guide](../security/HARDENING.md).

---

## 12. Changes to This Privacy Policy

As Neuro evolves and introduces new capabilities, we may update this Privacy Policy to reflect changes in our practices, software architecture, or legal requirements. When changes are made, we will update the "Last Updated" date at the top of this document and provide a notice in release notes.

---

## 13. Contact and Inquiries

If you have questions, feedback, or concerns regarding this Privacy Policy or Neuro's data practices, contact the maintainers:

- **GitHub Security Advisories:** [Open a private security advisory](https://github.com/thrive-spectrexq/neuro/security/advisories)
- **Email:** `privacy@neuro.local` (or reach out via the official project repository)
- **Repository:** [https://github.com/thrive-spectrexq/neuro](https://github.com/thrive-spectrexq/neuro)
