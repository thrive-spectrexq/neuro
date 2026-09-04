# Neuro Deployment Security Hardening Checklist

This document provides an exhaustive, production-grade security hardening checklist and operational guide for deploying the **Neuro** platform. Neuro is architected as a local-first, privacy-centric AI second brain consisting of:

- **Backend:** FastAPI (Python 3.12+), SQLModel/SQLAlchemy, SQLite (default) / PostgreSQL, Redis, Celery workers, and ChromaDB vector store.
- **Desktop Application:** Electron, React, TypeScript, Tailwind CSS, Vite.
- **Web Application & Clipper:** React, Vite, Browser WebExtensions.

Deploying Neuro in single-user local environments, self-hosted private servers, or multi-tenant production teams requires enforcing defense-in-depth across every layer of the stack.

---

## Hardening Verification Matrix

| Category | Security Control | Default (Dev) | Production Requirement | Verified |
| :--- | :--- | :--- | :--- | :---: |
| **Secrets** | `NEURO_SECRET_KEY` | `changeme` | 32+ byte cryptographically random hex/base64 | [ ] |
| **Secrets** | Commit Verification | Local git | TruffleHog / GitGuardian scan in CI | [ ] |
| **Transport** | TLS / HTTPS | Plain HTTP (`:8000`) | Enforced TLS 1.3 / HSTS enabled | [ ] |
| **Database** | SQLite WAL & PRAGMAs | WAL enabled | File permissions `0600`, encrypted backups | [ ] |
| **Database** | PostgreSQL Security | None (SQLite) | Dedicated non-superuser, SSL forced | [ ] |
| **Cache/Queue**| Redis Access Control | Unauthenticated | Strong `requirepass`, ACLs, command renames | [ ] |
| **Vector DB** | ChromaDB Isolation | Local port | Network isolated, private VPC / loopback only | [ ] |
| **Desktop** | Electron Context Isolation | Enabled (`true`) | `contextIsolation: true`, `nodeIntegration: false` | [ ] |
| **Desktop** | Content Security Policy | Permissive | Strict CSP, sandboxed renderers | [ ] |
| **Network** | CORS Configuration | Wildcard (`*`) | Explicit origin whitelist | [ ] |
| **Network** | Rate Limiting | Basic limits | Distributed Redis rate limiting active | [ ] |
| **Auth** | JWT Token Expiry | 24 Hours | Short-lived access tokens (15-60m) + Refresh | [ ] |
| **Auth** | Password Hashing | Bcrypt (cost 12) | Bcrypt (cost >= 12) with salt | [ ] |
| **Logging** | Log Output Format | Text / Console | Structured JSON, correlation IDs, PII redaction | [ ] |
| **Supply Chain**| Dependency Auditing | Manual | Dependabot + `pip-audit` + `pnpm audit` in CI | [ ] |
| **Container** | Docker Execution | Root user | Non-root `appuser` (UID 10001), read-only root | [ ] |

---

## 1. Secret Management Hardening

### 1.1 Environment Variable Isolation
- **Rule:** Never store production secrets in `.env` files committed to version control.
- Ensure `.gitignore` explicitly ignores `.env`, `.env.local`, `.env.*.local`, and all `*.pem`, `*.key`, and `*.db` files.
- Verify repository clean status prior to deployment:
  ```bash
  git status --ignored
  git ls-files --stage | grep .env
  ```

### 1.2 Mandatory Production Secret Validation
In `backend/app/core/config.py`, Neuro automatically validates the secret key:
- If `NEURO_ENV=production` and `NEURO_SECRET_KEY` equals `"changeme"` or is shorter than 32 characters, the application raises a fatal validation error and halts startup.
- In production, inject secrets exclusively via system environment variables, container secrets (Docker Swarm / Kubernetes Secrets), or cloud secret managers (AWS Secrets Manager, HashiCorp Vault).

### 1.3 Pre-commit and CI Secret Detection
- Run automated secret scanners on all commits and pull requests using the project CI pipeline (`.github/workflows/security.yml`):
  ```bash
  # Local scan before pushing
  trufflehog git file://. --only-verified
  ```
- Any committed credential must be immediately treated as compromised and rotated according to [SECRET_MANAGEMENT.md](SECRET_MANAGEMENT.md).

---

## 2. TLS / HTTPS Enforcement

Neuro handles sensitive personal notes, vector embeddings, thoughts, and LLM conversations. Unencrypted transport exposure over public networks or local Wi-Fi exposes tokens and private data to eavesdropping and session hijacking.

### 2.1 Reverse Proxy SSL Termination
Never expose the backend Uvicorn ASGI server directly to public interfaces. Place a battle-tested reverse proxy (Nginx, Caddy, or Traefik) in front of FastAPI.

#### Caddy Configuration (Recommended for Auto-HTTPS)
```caddy
neuro.example.com {
    encode gzip zstd

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }

    reverse_proxy localhost:8000 {
        header_up X-Forwarded-Proto https
        header_up X-Forwarded-For {remote_host}
    }
}
```

#### Nginx SSL Hardening Snippet
```nginx
server {
    listen 443 ssl http2;
    server_name neuro.example.com;

    ssl_certificate /etc/letsencrypt/live/neuro.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neuro.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # HSTS (2 years)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 2.2 Application TLS Enforcement
Set `ENFORCE_HTTPS=true` in `.env`. When active, `HTTPSRedirectMiddleware` forces all non-HTTPS incoming requests to their HTTPS equivalent and mandates secure transport for WebSockets (`wss://`).

---

## 3. Database Security

Neuro supports both embedded SQLite and networked PostgreSQL databases through SQLModel/SQLAlchemy.

### 3.1 SQLite Hardening (Default / Local Deployments)
When running with SQLite (`DATABASE_URL=sqlite+aiosqlite:///./neuro.db`):
- **Write-Ahead Logging (WAL):** Neuro automatically executes:
  ```sql
  PRAGMA foreign_keys=ON;
  PRAGMA journal_mode=WAL;
  PRAGMA synchronous=NORMAL;
  ```
  WAL provides high concurrency, prevents writer starvation, and ensures ACID transaction isolation against application crashes.
- **File System Permissions:** Lock down the SQLite database file and WAL logs so only the Neuro system process can access them:
  ```bash
  chmod 600 ./neuro.db ./neuro.db-wal ./neuro.db-shm
  chown neuro:neuro ./neuro.db*
  ```
- **Directory Traversal Defense:** Store the SQLite database outside web-accessible directory roots.

### 3.2 PostgreSQL Hardening (Production / Server Deployments)
When scaling to PostgreSQL (`DATABASE_URL=postgresql+asyncpg://...`):
- **Forced SSL / TLS:** Always append `ssl=require` or `ssl=verify-full` to the database connection string:
  ```bash
  DATABASE_URL=postgresql+asyncpg://neuro_app:StrongPass123!@db-host:5432/neuro_db?ssl=require
  ```
- **Principle of Least Privilege:** Create a dedicated database role for Neuro with permissions restricted strictly to the application schema. Never run migrations or runtime queries as `postgres` superuser:
  ```sql
  CREATE USER neuro_app WITH PASSWORD 'StrongGeneratedPassword';
  GRANT CONNECT ON DATABASE neuro_db TO neuro_app;
  GRANT USAGE ON SCHEMA public TO neuro_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO neuro_app;
  ```
- **Connection Pool Exhaustion Prevention:** Ensure `pool_pre_ping=True`, configure `pool_size` (default 20), and set `max_overflow` (default 10) to prevent denial-of-service against the database.

### 3.3 Encrypted Automated Backups
- Database dumps contain complete personal knowledge graphs, credentials, and notes.
- Backups must be encrypted at rest before storing off-host:
  ```bash
  # PostgreSQL encrypted backup
  pg_dump -h db-host -U neuro_app neuro_db | gpg --symmetric --cipher-algo AES256 -o neuro_backup_$(date +%F).sql.gpg

  # SQLite vacuum backup with atomic copy
  sqlite3 ./neuro.db ".backup './backup.db'" && \
    gpg --symmetric --cipher-algo AES256 -o neuro_sqlite_$(date +%F).db.gpg ./backup.db && \
    rm -f ./backup.db
  ```
- Store encrypted archives in immutable, access-logged object storage with automated lifecycle policies.

---

## 4. Redis & Background Worker Security

Redis powers Neuro's background Celery workers, asynchronous LLM task queues, and rate-limiting counters.

### 4.1 Redis Authentication and Network Binding
- **No Public Exposure:** Redis must **never** listen on `0.0.0.0` or open ports to the public internet. Bind exclusively to `127.0.0.1` or a private Docker bridge network:
  ```text
  # redis.conf
  bind 127.0.0.1 -::1
  protected-mode yes
  port 6379
  ```
- **Strong Authentication:** Require a strong password (`requirepass`):
  ```text
  requirepass "GenerateA64CharRandomHexPasswordForRedisAUTH"
  ```
  Configure Neuro connection URL:
  ```bash
  REDIS_URL=redis://:GenerateA64CharRandomHexPasswordForRedisAUTH@localhost:6379/0
  ```

### 4.2 Restrict Dangerous Commands
Disable or rename sensitive Redis commands in `redis.conf` to prevent administrative exploits, reconnaissance, and cache wipes:
```text
rename-command MONITOR ""
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command KEYS ""
rename-command DEBUG ""
```

### 4.3 Redis TLS (Transit Encryption)
In cloud environments where Redis is hosted across network boundaries, use Redis over TLS (`rediss://`):
```bash
REDIS_URL=rediss://:password@redis.internal.domain:6380/0
```

---

## 5. ChromaDB & Vector Store Isolation

ChromaDB stores high-dimensional embeddings generated from user notes, documents, and private thoughts.

- **Zero Public Exposure:** ChromaDB does not feature granular application-level authorization by default. Its service port (default `8000` or `8001`) must **never** be accessible outside the host machine or internal cluster network.
- **Docker Compose Network Boundary:**
  ```yaml
  chroma:
    image: chromadb/chroma:latest
    networks:
      - neuro_internal
    expose:
      - "8000"
    # DO NOT map ports to host (no 'ports: ["8001:8000"]')
  ```
- **Embeddings Poisoning Defense:** Neuro validates all input text ingested into ChromaDB to prevent embedding manipulation or oversized document injections that could crash or degrade the vector index.

---

## 6. Electron Desktop Application Security

The Electron desktop client (`apps/desktop`) bridges native operating system capabilities with the web-based React user interface. Following Chromium and Electron security best practices is mandatory.

### 6.1 Process Isolation & IPC Security
Verified in `apps/desktop/src/main/main.ts`:
```typescript
mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, '../preload/preload.js'),
    nodeIntegration: false,        // STRICT: Never allow Node.js in renderer
    contextIsolation: true,       // STRICT: Separate execution context
    sandbox: true,                // STRICT: Enforce Chromium sandbox
  },
});
```

### 6.2 Preload Context Bridge Strictness
In `apps/desktop/src/preload/preload.ts`, expose only explicitly validated, type-safe API methods via `contextBridge.exposeInMainWorld`.
- **Prohibited:** Exposing raw `ipcRenderer.send`, `ipcRenderer.on`, or `child_process`.
- **Required:** Expose structured wrapper functions with strict argument validation.

### 6.3 Content Security Policy (CSP)
Mandate a restrictive CSP in `apps/desktop/src/renderer/index.html` and via session headers in `main.ts`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' http://localhost:8000 ws://localhost:8000 http://localhost:11434;
  object-src 'none';
  base-uri 'self';
  form-action 'none';
  frame-ancestors 'none';
">
```

### 6.4 Navigation and Window Open Lockdown
Prevent the renderer from navigating to malicious external websites or opening arbitrary native windows:
```typescript
// Prevent arbitrary external navigation inside main window
mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
  const parsedUrl = new URL(navigationUrl);
  if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
    event.preventDefault();
  }
});

// Intercept window.open calls to use default OS browser safely
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    shell.openExternal(url);
  }
  return { action: 'deny' };
});
```

---

## 7. Network Security & Traffic Control

### 7.1 Firewall (UFW) Rules
On production Linux hosts, close all ports except SSH (custom port recommended) and HTTP/HTTPS reverse proxy:
```bash
# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allowed ports
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Explicitly ensure backend services are inaccessible externally
ufw deny 8000
ufw deny 6379
ufw deny 8001
ufw enable
```

### 7.2 Strict CORS Restrictions
In `backend/app/core/config.py`, the default development setting `CORS_ORIGINS="*"` must be overridden in production.
- Configure exact trusted origins matching your desktop application and web clients:
  ```bash
  CORS_ORIGINS="https://neuro.example.com,http://localhost:3000"
  ```
- Reject credentials when origin is `*`.

### 7.3 Multi-Tiered Rate Limiting
Neuro implements tiered IP and user rate limiting via `app/core/rate_limit.py`:
- **Auth Endpoints (`/api/v1/auth/*`):** 10 requests / minute (mitigates brute-force credential stuffing).
- **AI Endpoints (`/api/v1/ai/*`):** 30 requests / minute (protects LLM tokens and downstream provider costs).
- **Standard Endpoints (`/api/v1/*`):** 60 requests / minute.

---

## 8. Authentication & Session Hardening

### 8.1 JWT Lifecycle & Cryptographic Signing
- **Algorithm:** Neuro uses `HS256` HMAC with a high-entropy secret (`NEURO_SECRET_KEY`).
- **Short Expiration:** Set `ACCESS_TOKEN_EXPIRE_MINUTES` between `15` and `60` minutes in production (override default 1440m).
- **Token Verification:** In `backend/app/core/security.py`, token decoding strictly specifies `algorithms=["HS256"]` to prevent `algorithm: none` bypass attacks.
- **Refresh Token Strategy:** Long-term sessions must use refresh tokens stored in secure, `HttpOnly`, `SameSite=Strict`, `Secure` cookies.

### 8.2 Password Hashing
- **Bcrypt Work Factor:** Passwords are salted and hashed using `bcrypt` with `bcrypt.gensalt()`.
- Ensure standard work factor of at least 12 rounds to resist modern GPU-accelerated offline cracking.
- Enforce user password policy: minimum 10 characters, combining uppercase, lowercase, numbers, and symbols.

---

## 9. Logging, Auditing & Privacy Safeguards

### 9.1 Zero-PII Structured Logging
In `backend/app/core/logging.py`, Neuro implements structured JSON logging:
- **Scrubbing Sensitive Fields:** Passwords, JWT tokens, API keys, and private note contents are stripped from log records.
- Set `LOG_FORMAT=json` and `LOG_LEVEL=INFO` in production.
- Every HTTP request receives a unique `correlation_id` (UUIDv4) passed via the `X-Correlation-ID` header and tracked across async tasks.

### 9.2 Audit Logging
All security-critical and data-modification actions are persisted in the `AuditLog` SQLModel table:
- Actions recorded: User login, password changes, API key updates, project sharing, bulk note deletions, and export operations.
- Audit records capture: `user_id`, `action`, `target_type`, `target_id`, `details`, and UTC `timestamp`.
- Audit tables must be append-only with immutable retention.

---

## 10. Dependency & Supply Chain Security

### 10.1 Automated Dependency Auditing
Integrate regular automated scanning into daily workflows:
```bash
# Python backend vulnerabilities
cd backend
pip-audit -r requirements.txt

# Node.js frontend vulnerabilities
pnpm audit --audit-level=moderate
```

### 10.2 Dependabot Configuration
Verified in `.github/dependabot.yml`:
- Weekly automated dependency scans across `pip` (backend), `npm` (monorepo frontend & packages), and `github-actions`.
- High-severity security PRs must be merged promptly.

### 10.3 SAST & Code Scanning
- Run `bandit -r backend/app` to detect AST-level security vulnerabilities in Python.
- Run `eslint` with `@typescript-eslint` security plugins on frontend packages.

---

## 11. Container Security Hardening

When deploying Neuro via Docker, adhere to the following container hardening requirements:

### 11.1 Hardened Multi-Stage Dockerfile Pattern
```dockerfile
# Stage 1: Build stage
FROM python:3.12-slim AS builder

WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime stage
FROM python:3.12-slim AS runtime

# Create dedicated non-root user and group
RUN groupadd -g 10001 neuro && \
    useradd -u 10001 -g neuro -s /bin/false -m neuro

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local
COPY --chown=neuro:neuro . .

# Run as non-root
USER neuro:neuro

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 11.2 Docker Runtime Security Flags
Deploy containers with restricted kernel privileges and read-only root filesystems:
```yaml
services:
  backend:
    image: neuro-backend:latest
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    restart: unless-stopped
```

---

## Pre-Deployment Sign-Off Checklist

Before announcing a Neuro instance ready for production usage:

1. [ ] `NEURO_SECRET_KEY` generated with `openssl rand -hex 32` and verified $\ge 32$ chars.
2. [ ] `NEURO_ENV=production` set.
3. [ ] Reverse proxy active with HTTPS (A+ rating on SSL Labs target).
4. [ ] `CORS_ORIGINS` configured to exact domain names (no wildcard).
5. [ ] SQLite database file permissions set to `0600`, or PostgreSQL SSL connection verified.
6. [ ] Redis password authentication enabled and `MONITOR` command disabled.
7. [ ] ChromaDB port isolated from external interfaces.
8. [ ] Electron desktop build verified with `nodeIntegration: false` and `contextIsolation: true`.
9. [ ] Automated backups scheduled and tested with recovery drill.
10. [ ] Dependency audits (`pip-audit`, `pnpm audit`) executed with zero critical findings.
