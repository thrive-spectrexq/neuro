# Neuro Terms of Service

**Last Updated:** September 3, 2026  
**Effective Date:** September 3, 2026  

---

## 1. Acceptance of Terms

Please read these Terms of Service ("Terms") carefully before downloading, installing, accessing, or using **Neuro** ("the Software," "the Service," or "the Platform"), maintained by Bright and the Neuro project contributors ("the Project," "we," "us," or "our").

By downloading, installing, compiling, or using the Software, you ("User," "you," or "your") agree to be legally bound by these Terms and our [Privacy Policy](PRIVACY_POLICY.md). If you do not agree with these Terms, do not install, copy, or use Neuro.

---

## 2. Description of the Software & Open Source License

1. **Open-Source Software:** Neuro is an open-source, local-first artificial intelligence second brain designed to run on personal computers and self-hosted environments. The core source code of Neuro is licensed under the **MIT License** (as set forth in the repository's `LICENSE` file).
2. **Local Execution:** The Software runs predominantly on your local hardware. You provide the computing resources, operating system environment, database storage, and internet connectivity required to execute the Software.
3. **Optional Services:** Certain optional capabilities—such as cloud-hosted LLM connectivity or remote multi-device synchronization—may connect to third-party or hosted endpoints subject to these Terms.

---

## 3. Acceptable Use Policy (AUP)

You agree to use Neuro solely for lawful, authorized purposes and in strict accordance with these Terms.

### 3.1 Prohibited Activities
You agree **NOT** to use Neuro to:
- Generate, store, synthesize, or distribute illegal content, including Child Sexual Abuse Material (CSAM), non-consensual intimate imagery, or content depicting or promoting extreme violence.
- Engage in unlawful harassment, stalking, hate speech, defamation, or threats of physical harm against any individual or group.
- Develop, refine, or facilitate the deployment of malware, spyware, ransomware, zero-day exploits, or cyberattack tooling.
- Facilitate the creation or synthesis of chemical, biological, radiological, or nuclear weapons or other dangerous materials.
- Conduct fraudulent schemes, deceptive phishing attacks, identity theft, or financial crimes.
- Attempt to circumvent, disable, probe, scan, or breach the authentication, rate limiting, or security safeguards of the Software or connected cloud infrastructure.
- Violate the Acceptable Use Policies, Terms of Service, or rate limits of connected third-party AI providers (such as OpenAI, Anthropic, or Google Cloud).

### 3.2 Automated Scraping and API Abuse
If connecting to shared Neuro community servers or hosted sync instances, you agree not to submit automated high-concurrency requests designed to overwhelm, degrade, or disrupt services for other users.

---

## 4. User Responsibilities & Data Control

### 4.1 Ownership and Control of User Data
- **You own 100% of your data:** All notes, markdown documents, journal entries, audio recordings, personal thoughts, graphs, flashcards, and vector embeddings created, imported, or generated in Neuro remain your exclusive intellectual property.
- The Project claims **zero intellectual property rights, licenses, or ownership** over your personal vault contents.

### 4.2 Security of Credentials and Encryption Keys
- You are solely responsible for maintaining the confidentiality and security of your encryption passphrases, master keys, `NEURO_SECRET_KEY`, database passwords, and third-party AI API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`).
- Because Neuro is built upon a local-first, zero-knowledge architecture, **the Project cannot recover lost passphrases or decrypt encrypted vaults on your behalf.**

### 4.3 Backups
- You are solely responsible for establishing and maintaining adequate automated backups of your local database (`neuro.db`), ChromaDB storage, and markdown files.
- The Project is not liable for data loss arising from hardware failures, software crashes, operating system upgrades, or user error.

---

## 5. Service Availability and No Service Level Agreement (SLA)

1. **Provided "As-Is":** The Software is provided free of charge as an open-source project without any warranty or formal Service Level Agreement (SLA).
2. **No Guaranteed Uptime:** We do not guarantee that the Software will be uninterrupted, error-free, timely, secure, or free from bugs, regressions, or security vulnerabilities.
3. **Self-Hosted Autonomy:** You have full authority to modify, freeze, rollback, fork, or manage your version of the Software according to your operational requirements.

---

## 6. Intellectual Property

### 6.1 Neuro Codebase & License
The Software, including its source code, architecture, build scripts, documentation, and design assets, is licensed under the permissive **MIT License**:

```text
Copyright (c) 2026 Bright

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### 6.2 Trademarks
The name "Neuro," the Neuro logo, and related project insignia are project identifiers. While the code is open source under the MIT License, nothing in these Terms grants you permission to use project trademarks in a misleading manner that falsely implies official endorsement, partnership, or sponsorship.

---

## 7. AI Disclaimers & Professional Advice Warning

### 7.1 Non-Deterministic and Experimental AI Outputs
Neuro integrates generative artificial intelligence and large language models (LLMs), which operate through statistical inference. You acknowledge and agree that:
- **Hallucinations & Inaccuracies:** AI models can produce outputs that are factually inaccurate, outdated, misleading, incomplete, or offensive ("hallucinations").
- **Verification Requirement:** You are solely responsible for reviewing, verifying, and confirming the accuracy, completeness, and appropriateness of any notes, summaries, flashcards, code snippets, or insights generated by AI models before relying upon them.
- **No Guarantee of Uniqueness:** Outputs generated by AI models for you may be similar or identical to outputs generated for other users querying similar concepts.

### 7.2 Not Professional Legal, Medical, or Financial Advice
- **General Information Only:** Neuro and its integrated AI agents are productivity, synthesis, and knowledge-management utilities. They do **NOT** provide professional legal, medical, psychiatric, financial, tax, or engineering advice.
- **Consult Professionals:** Never make healthcare decisions, medical diagnoses, financial investments, or legal commitments based solely on summaries, recommendations, or responses generated within Neuro. Always consult a qualified professional.

---

## 8. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:

1. **NO LIABILITY FOR DAMAGES:** IN NO EVENT SHALL THE AUTHORS, MAINTAINERS, CONTRIBUTORS, OR COPYRIGHT HOLDERS OF NEURO BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, REVENUE, OR PROFITS; BUSINESS INTERRUPTION; LOSS OF GOODWILL; OR HARDWARE CORRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF OR INABILITY TO USE THE SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
2. **TOTAL LIABILITY CAP:** TO THE EXTENT THAT ANY JURISDICTION DOES NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR IN CONNECTION WITH THE SOFTWARE SHALL NOT EXCEED ONE HUNDRED UNITED STATES DOLLARS ($100.00 USD) OR THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, WHICHEVER IS LESS.

---

## 9. Third-Party Services, Plugins, and External APIs

1. **Third-Party Providers:** Neuro interacts with third-party APIs (including OpenAI, Anthropic, Google Gemini, Ollama, and ChromaDB). We have no control over the availability, pricing, terms, or privacy practices of these third-party services.
2. **Community Plugins:** Third-party plugins and community integrations are developed by independent third parties. You install and execute plugins at your own risk. The Project does not warrant, verify, or guarantee the security or performance of community-developed extensions.

---

## 10. Termination

- **User Termination:** You may terminate your relationship with the Software at any time by simply stopping your use of the Software, deleting the local database and files from your system, and uninstalling the applications.
- **Project Termination of Hosted Features:** If you violate these Terms, we reserve the right to suspend or terminate your access to any hosted synchronization servers, community repositories, issue trackers, or discussion forums operated by the Project.
- **Survival:** Sections 4, 6, 7, 8, 9, 11, and 12 shall survive any termination of these Terms.

---

## 11. Governing Law and Dispute Resolution

- **Governing Law:** These Terms shall be governed by and construed in accordance with the laws of the jurisdiction of the Project maintainers, without regard to its conflict of law principles.
- **Informal Resolution First:** Before initiating formal legal proceedings, you agree to contact the project maintainers directly and attempt in good faith to resolve any dispute, controversy, or claim amicably and informally.
- **Severability:** If any provision of these Terms is found to be unlawful, invalid, or unenforceable, that provision shall be deemed severable and shall not affect the validity and enforceability of any remaining provisions.

---

## 12. Modifications to These Terms

We reserve the right to modify or replace these Terms at our discretion. When updates occur, the updated document will be published in the Neuro code repository, and the "Last Updated" date at the top of this document will be revised. Your continued use of Neuro after any modifications constitutes acceptance of the new Terms.

---

## 13. Contact Information

For inquiries regarding these Terms of Service, please reach out via:

- **Repository:** [https://github.com/thrive-spectrexq/neuro](https://github.com/thrive-spectrexq/neuro)
- **Issues & Discussions:** [https://github.com/thrive-spectrexq/neuro/issues](https://github.com/thrive-spectrexq/neuro/issues)
- **Email:** `legal@neuro.local`
