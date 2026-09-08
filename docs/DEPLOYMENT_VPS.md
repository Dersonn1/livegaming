# VPS Deployment (shared Ubuntu box, no owned domain)

This documents the exact deployment used for this project's production
instance — a shared Ubuntu 22.04 VPS that already runs other sites behind
Nginx, with no dedicated domain name available. Reuse this if redeploying
to a fresh VPS.

## Why sslip.io instead of a real domain

Roblox's `HttpService` requires a **valid, CA-trusted TLS certificate** —
self-signed certs are rejected. Let's Encrypt needs a real, publicly
resolvable hostname to issue one; you can't get a trusted cert for a bare
IP. [sslip.io](https://sslip.io) solves this for free: any hostname of the
form `<anything>.<ip-with-dashes>.sslip.io` resolves via DNS straight to
that IP, with no registration needed. This project uses:

- `api.<ip-with-dashes>.sslip.io` → backend (port 4000 internally)
- `app.<ip-with-dashes>.sslip.io` → dashboard (port 4001 internally)

Replace `<ip-with-dashes>` with your VPS's IP, dots replaced by dashes
(e.g. `203.0.113.5` → `203-0-113-5`). Swap this for a real domain later by
just repeating the Nginx + certbot steps below with your domain instead.

## 0. Before touching anything: check what's already running

On a shared box, **do not assume ports/Nginx config are yours to overwrite**.

```bash
docker --version                         # is Docker even installed?
ss -tlnp                                 # what ports are already taken?
ls /etc/nginx/sites-enabled/             # what sites already exist?
systemctl is-active nginx
which certbot
ufw status                               # don't blindly enable this on a
                                          # multi-site box you don't fully
                                          # know the rules for — safer to
                                          # bind new services to 127.0.0.1
                                          # only and leave the firewall alone
```

Pick host ports for the backend/dashboard that don't collide with anything
already listed by `ss -tlnp`.

## 1. Install Docker (if not already present)

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

## 2. Get the code onto the VPS

```bash
mkdir -p /opt/livegaming && cd /opt/livegaming
git clone https://github.com/<you>/<your-repo>.git .
```

## 3. Production environment file

Create `apps/backend/.env` on the VPS (never commit this). Generate strong
secrets locally first:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Fill in (see `.env.example` for the full list):
- `JWT_SECRET`, `ROBLOX_API_KEY`, `ROBLOX_COMMAND_SIGNING_SECRET`,
  `DASHBOARD_ADMIN_PASSWORD` — strong random values, unique to this
  deployment.
- `DATABASE_URL=postgresql://live_user:live_password@postgres:5432/live_platform`
  and `REDIS_URL=redis://redis:6379` — note the hostnames are the Docker
  Compose service names (`postgres`, `redis`), not `localhost`.
- `CORS_ORIGIN=https://app.<ip-with-dashes>.sslip.io`
- Two extra variables **not** part of the app's own schema, used only by
  `docker-compose.vps.yml` to bake the right URLs into the dashboard build:
  `PUBLIC_API_URL=https://api.<ip-with-dashes>.sslip.io` and
  `PUBLIC_WS_URL=wss://api.<ip-with-dashes>.sslip.io/ws`.

```bash
chmod 600 apps/backend/.env
```

## 4. Build, migrate, start

```bash
cd docker
docker compose -f docker-compose.vps.yml --env-file ../apps/backend/.env run --rm migrate
docker compose -f docker-compose.vps.yml --env-file ../apps/backend/.env up --build -d
docker ps   # expect postgres, redis, backend, dashboard all "healthy"/"Up"
curl http://127.0.0.1:4000/health
```

`docker-compose.vps.yml` binds backend/dashboard to `127.0.0.1` only and
publishes no Postgres/Redis ports at all — nothing here is reachable from
the internet without Nginx in front of it.

## 5. Nginx reverse proxy + HTTPS

Create `/etc/nginx/sites-available/<name>-api` and `<name>-app` (see the
two server blocks below), symlink into `sites-enabled/`, then run certbot:

```nginx
server {
    listen 80;
    server_name api.<ip-with-dashes>.sslip.io;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

(Same for `app.<ip-with-dashes>.sslip.io` → `127.0.0.1:4001`.)

```bash
nginx -t && systemctl reload nginx
certbot --nginx -d api.<ip-with-dashes>.sslip.io -d app.<ip-with-dashes>.sslip.io \
  --non-interactive --agree-tos -m you@example.com --redirect
```

Certbot edits the two server blocks in place to add the cert paths and an
HTTP→HTTPS redirect, and installs a systemd timer for auto-renewal.

## 6. Verify end-to-end over real HTTPS

```bash
curl https://api.<ip-with-dashes>.sslip.io/health
curl -X POST https://api.<ip-with-dashes>.sslip.io/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"admin","password":"<your DASHBOARD_ADMIN_PASSWORD>"}'
```

## 7. Point Roblox at production

In `roblox/game/src/ServerScriptService/Security/Config.lua`:

```lua
BackendBaseUrl = "https://api.<ip-with-dashes>.sslip.io",
ApiKey = "<your ROBLOX_API_KEY>",
CommandSigningSecret = "<your ROBLOX_COMMAND_SIGNING_SECRET>",
```

Publish the place (or re-test in Studio pointed at the real backend) —
`Config.EnableDebugCommands` already defaults to `RunService:IsStudio()`,
so it's automatically `false` on a published server.

## 8. Redeploying after code changes

```bash
cd /opt/livegaming && git pull
cd docker
docker compose -f docker-compose.vps.yml --env-file ../apps/backend/.env run --rm migrate   # only if a new migration file was added
docker compose -f docker-compose.vps.yml --env-file ../apps/backend/.env up --build -d
```

## 9. Hardening follow-ups (do these once things are confirmed working)

- Switch SSH to key-based auth and disable password login
  (`PasswordAuthentication no` in `/etc/ssh/sshd_config`, then
  `systemctl restart sshd`) — especially important if the root password
  was ever shared over a non-secure channel.
- Rotate any credential (GitHub token, VPS password) that was ever pasted
  in plaintext anywhere, including in a chat with an AI assistant.
- Consider `ufw` once you've inventoried every port every site on the box
  actually needs — don't enable it blind on a box you don't fully control.
