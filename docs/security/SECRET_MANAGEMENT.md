# Neuro Secret Management and Rotation Procedures

This guide defines the standards, storage architecture, operational procedures, and emergency response workflows for managing and rotating cryptographic keys and credentials across the **Neuro** platform.

---

## 1. Principles of Secret Management

1. **Defense-in-Depth & Principle of Least Privilege:** Every component (API server, background worker, database, desktop app) must only hold credentials necessary for its specific duties.
2. **Zero Hardcoded Secrets:** Credentials, API tokens, and private keys must **never** be checked into version control, embedded in source code, or hardcoded in client bundles.
3. **No Unencrypted Storage:** Secrets at rest must reside in encrypted stores (OS Keychain/Keystore, Kubernetes Secrets, AWS Secrets Manager, or file systems with restricted permissions).
4. **Auditability & Traceability:** All secret rotation events, privilege escalations, and administrative access must be logged in the immutable audit trail.
5. **Fail-Safe Revocation:** Every secret must support rapid zero-downtime rotation and immediate emergency revocation.

---

## 2. Environment Variable Naming Conventions

Neuro enforces standard uppercase variable names grouped by subsystem prefix:

| Environment Variable | Subsystem | Description | Sensitivity | Permitted in Client Bundle? |
| :--- | :--- | :--- | :--- | :---: |
| `NEURO_SECRET_KEY` | Core Auth | Secret key used for JWT signature generation and cryptographic token hashing. | **Critical** | **NO** |
| `NEURO_ENV` | Core Runtime | Environment name (`development`, `staging`, `production`). | Low | Yes |
| `DATABASE_URL` | Persistence | Async database connection URI (SQLite path or PostgreSQL connection string with embedded password). | **Critical** | **NO** |
| `REDIS_URL` | Cache/Queue | Redis connection URI with authentication credentials (`redis://:password@host:port/db`). | **High** | **NO** |
| `CHROMA_HOST` / `CHROMA_PORT` | Vector Store | ChromaDB network endpoint coordinates. | Medium | **NO** |
| `OPENAI_API_KEY` | Cloud AI | OpenAI API credential for GPT-4o and cloud embedding models. | **Critical** | **NO** |
| `ANTHROPIC_API_KEY` | Cloud AI | Anthropic API credential for Claude models. | **Critical** | **NO** |
| `GEMINI_API_KEY` | Cloud AI | Google Gemini API credential. | **Critical** | **NO** |
| `SENTRY_DSN` | Telemetry | Sentry error monitoring DSN string. | Low | Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Core Auth | JWT access token lifetime in minutes. | Low | No |

---

## 3. Strong Secret Generation Standard

All secrets used in production must be generated using cryptographically secure pseudo-random number generators (CSPRNG). Never use human-chosen passwords, dictionary words, or low-entropy strings.

### 3.1 Recommended Generation Commands

#### Generating `NEURO_SECRET_KEY` (256-bit entropy)
```bash
# Recommended: 32 bytes hex-encoded (64 characters)
openssl rand -hex 32

# Alternative: Base64-encoded 32 bytes
openssl rand -base64 32

# Python one-liner using secrets standard library
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Generating Database / Redis Passwords (High entropy alphanumeric + symbols)
```bash
# Generate 48 characters of high entropy URL-safe string
python -c "import secrets; print(secrets.token_urlsafe(36))"

# Using openssl
openssl rand -hex 24
```

### 3.2 Secret Length and Entropy Minimums
- **JWT Secret Keys:** Minimum 256 bits (32 bytes / 64 hex chars).
- **Service Passwords (DB/Redis):** Minimum 24 characters with high entropy.
- **Provider API Keys:** Assigned by external AI providers; never truncate or modify.

---

## 4. CI/CD Secret Configuration (GitHub Actions)

When building and testing Neuro in continuous integration, manage secrets through GitHub repository and environment secret settings.

### 4.1 Configuring GitHub Actions Secrets
1. Navigate to your repository: **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Configure **Repository Secrets** for continuous integration:
   - `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (for container publishing)
   - `CODECOV_TOKEN` (for coverage reporting)
   - `APPLE_CERTIFICATE` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` (for macOS desktop app signing)
   - `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (for Windows desktop app Authenticode signing)
3. For deployment workflows, create a dedicated **Production** environment with mandatory reviewer approval and scoped production secrets (`PROD_DATABASE_URL`, `PROD_NEURO_SECRET_KEY`).

### 4.2 Masking and Preventing Secret Leaks in CI
- GitHub Actions automatically masks secrets registered under repository settings. However, to prevent indirect leaks:
  - Never print shell environment variables (`env`, `printenv`) in workflow steps.
  - Disable verbose debugging logs that echo expanded command lines in production workflows.
  - Ensure TruffleHog secret scanning runs on all commits (`.github/workflows/security.yml`).

---

## 5. Routine Secret Rotation Procedures

### 5.1 Rotation Procedure: `NEURO_SECRET_KEY`

`NEURO_SECRET_KEY` signs JWT bearer tokens. Changing this key invalidates active user sessions. To rotate without interrupting service or causing unexpected 401 spikes:

#### Preparation
1. Schedule rotation during a designated maintenance window or low-traffic period.
2. Generate a new high-entropy secret key:
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   ```

#### Dual-Key Verification Transition (Zero-Downtime Pattern)
If zero session invalidation is required:
1. Update `backend/app/core/config.py` to support `NEURO_SECRET_KEY_FALLBACK` (secondary key used only for decoding existing tokens).
2. Set `NEURO_SECRET_KEY` to `$NEW_SECRET` and set `NEURO_SECRET_KEY_FALLBACK` to the previous key.
3. Deploy the backend. All new tokens are signed with `$NEW_SECRET`, while valid active tokens signed with the previous key continue to decode successfully until expired (`ACCESS_TOKEN_EXPIRE_MINUTES`).
4. Once the maximum token lifespan expires (e.g., 24 hours), remove `NEURO_SECRET_KEY_FALLBACK` from the environment and restart the backend.

#### Direct Single-Step Rotation (Standard Procedure)
1. Stop backend services or prepare rolling container update.
2. Update the environment configuration:
   ```bash
   # In production environment or secret manager
   export NEURO_SECRET_KEY="<NEW_32_BYTE_HEX_STRING>"
   ```
3. Restart FastAPI / Uvicorn backend instances:
   ```bash
   systemctl restart neuro-backend
   # Or docker compose
   docker compose up -d --no-deps backend
   ```
4. Active users will be redirected to `/api/v1/auth/login` to authenticate and receive fresh tokens.

---

### 5.2 Rotation Procedure: AI Provider API Keys (OpenAI, Anthropic, Gemini)

When rotating cloud AI provider keys:

#### Step 1: Generate New Key in Provider Console
- **OpenAI:** Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys) $\rightarrow$ Create new secret key $\rightarrow$ Name it `neuro-prod-YYYY-MM-DD`.
- **Anthropic:** Visit [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) $\rightarrow$ Create key $\rightarrow$ Name `neuro-prod-YYYY-MM-DD`.
- **Google Gemini:** Visit [aistudio.google.com](https://aistudio.google.com/) $\rightarrow$ Get API key $\rightarrow$ Create key.

#### Step 2: Test New Key in Staging / CLI
Verify the new key functions prior to deployment:
```bash
# Test OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $NEW_OPENAI_API_KEY"

# Test Anthropic key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $NEW_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 10, "messages": [{"role": "user", "content": "hi"}]}'
```

#### Step 3: Update Production Environment & Reload
```bash
# Update .env or secret manager
OPENAI_API_KEY="sk-proj-newkey..."

# Reload backend
docker compose exec backend kill -HUP 1
# Or restart container
docker compose restart backend
```

#### Step 4: Revoke Old Key
Once the new key is confirmed working in production logs, navigate back to the provider console and **delete / revoke** the retired key.

---

### 5.3 Rotation Procedure: Database Credentials (PostgreSQL)

To rotate PostgreSQL credentials without application downtime:

1. Connect to PostgreSQL as an administrator:
   ```bash
   psql -h db-host -U postgres neuro_db
   ```
2. Create a temporary secondary application role or change the existing user's password:
   ```sql
   -- Option A: Immediate password update
   ALTER USER neuro_app WITH PASSWORD 'NewSecurePassword123!';
   ```
3. Update `DATABASE_URL` in the Neuro backend configuration:
   ```bash
   DATABASE_URL="postgresql+asyncpg://neuro_app:NewSecurePassword123!@db-host:5432/neuro_db?ssl=require"
   ```
4. Restart backend processes. The connection pool reconnects with the new credentials.

---

### 5.4 Rotation Procedure: Redis Authentication Credentials

1. Update `redis.conf` with new password or use Redis ACLs:
   ```bash
   # In redis-cli as admin
   AUTH "OldPassword"
   ACL SETUSER default on >"NewSecureRedisPassword!"
   ```
2. Update `REDIS_URL` in Neuro backend environment:
   ```bash
   REDIS_URL="redis://:NewSecureRedisPassword!@localhost:6379/0"
   ```
3. Restart Celery worker processes and FastAPI:
   ```bash
   docker compose restart backend celery_worker
   ```
4. In `redis-cli`, remove the old password from the default user:
   ```bash
   ACL SETUSER default <"OldPassword"
   ```

---

## 6. Secret Rotation Schedule Recommendations

| Secret Type | Minimum Rotation Cadence | Trigger-Based Rotation |
| :--- | :--- | :--- |
| `NEURO_SECRET_KEY` | Every 180 days | Staff departure, suspected breach, major version upgrade |
| Cloud AI Keys (OpenAI, Anthropic, Gemini)| Every 90 days | Billing anomalies, leaked token, staff departure |
| Database Passwords | Every 180 days | Infrastructure migration, suspected database leak |
| Redis Auth Tokens | Every 180 days | Infrastructure migration, worker compromise |
| CI/CD Deploy Tokens | Every 90 days | Pipeline overhaul, developer access revocation |
| Code Signing Certificates | Prior to certificate expiration (typically 1–3 years) | Private key exposure |

---

## 7. Emergency Secret Rotation Procedures (Compromised Key Runbook)

If a secret is inadvertently committed to a public repository, exposed in application logs, or compromised by an adversary, execute this emergency runbook immediately:

```mermaid
graph TD
    A[1. Triage & Confirm Leak] --> B[2. Immediate Revocation of Compromised Key]
    B --> C[3. Generate & Deploy New Secret]
    C --> D[4. Invalidate Sessions & Cache]
    D --> E[5. Audit Logs for Unauthorized Activity]
    E --> F[6. Post-Mortem & Preventative Controls]
```

### Phase 1: Containment & Revocation (< 15 Minutes)
1. **Cloud AI Keys:** Log directly into the provider console (OpenAI/Anthropic/Gemini) and delete the compromised key immediately. This immediately terminates unauthorized billing and external API consumption.
2. **`NEURO_SECRET_KEY`:** Immediately generate a replacement key and restart the backend. All active sessions are terminated, denying attackers access with forged or stolen JWTs.
3. **Database / Redis:** Alter the user password in the database/cache server immediately.

### Phase 2: Generation & Redeployment (< 30 Minutes)
1. Generate new 32+ byte high-entropy secrets using `openssl rand -hex 32`.
2. Update production secrets in container runners or server environment variables.
3. Redeploy backend and worker instances.
4. Verify backend health endpoint returns `HTTP 200 OK`:
   ```bash
   curl -I http://localhost:8000/api/v1/health
   ```

### Phase 3: Forensic Audit & Session Invalidation (< 2 Hours)
1. Review `AuditLog` table records around the time of the exposure:
   ```sql
   SELECT * FROM auditlog WHERE timestamp >= NOW() - INTERVAL '24 HOURS' ORDER BY timestamp DESC;
   ```
2. Search web server access logs for anomalous requests, unexpected IP addresses, or spike in AI endpoint queries (`/api/v1/ai/*`).
3. Check provider billing dashboards for unusual usage spikes.

### Phase 4: Git History Cleansing (If Secret Was Committed)
If the secret was committed to git:
1. Revoking the secret is the primary security boundary; scrubbing git history alone does **not** make a compromised key safe.
2. Use `git-filter-repo` or BFG Repo-Cleaner to eliminate credentials from git history:
   ```bash
   git filter-repo --replace-text <(echo "compromised-key==>REDACTED")
   ```
3. Force-push to all remotes and notify collaborators to re-clone the repository.

---

## 8. Production vs. Development Secret Handling

| Aspect | Development (`NEURO_ENV=development`) | Production (`NEURO_ENV=production`) |
| :--- | :--- | :--- |
| **Storage Location** | Local uncommitted `.env` file | OS Environment, Docker Secrets, or Secret Manager |
| **`NEURO_SECRET_KEY`** | Default warning allowed (`changeme`) | Strict enforcement: $\ge 32$ chars, cannot be `changeme` |
| **AI Keys** | Local Ollama (no key needed) or personal dev keys | Pinned organization keys with budget caps and alerting |
| **Database** | Embedded SQLite (`./neuro.db`) | Managed PostgreSQL with SSL or hardened SQLite |
| **Log Exposure** | Detailed tracebacks permitted | Strict PII/Secret scrubbing, structured JSON format |
| **Desktop Storage** | In-memory / mock store | OS native credential store (`safeStorage` / Keychain) |

---

## Summary Checklist

- [ ] All production secrets meet or exceed 256-bit entropy requirements.
- [ ] No secrets or `.env` files appear in version control.
- [ ] Rotation schedules are added to calendar/operations backlog.
- [ ] Emergency runbook contact list and provider console logins are verified.
