# <img src="./Ghostbin.png" width="25" alt="logo" style="vertical-align: bottom;"/> ghostbin  [![CI](https://github.com/90th/ghostbin/actions/workflows/ci.yml/badge.svg)](https://github.com/90th/ghostbin/actions/workflows/ci.yml) [![Stars](https://img.shields.io/github/stars/90th/ghostbin?style=social)](https://github.com/90th/ghostbin/stargazers)

a secure, ephemeral, zero-knowledge pastebin.
client-side encryption. nothing hits the disk. ever.

## why?
most pastebins store logs or persist data to databases. we don't.

ghostbin runs entirely in volatile memory.
data is stored in redis RAM with **no disk persistence** (no RDB/AOF).
if the server restarts, the power cuts, or the process is killed, the data is instantly and irretrievably gone.

## features
- **zero-knowledge:** aes-256-gcm encryption happens in the browser. the server only ever sees ciphertext.
- **dos protection:** client-side proof-of-work required for uploads. keeps the ram safe from spam floods without tracking ips.
- **password protection:** optional. keys derived from password using argon2id via wasm.
- **volatile by design:** no hard drive writes. forensic analysis is impossible once the process dies.
- **burn after read:** optional setting to nuke the paste immediately after it's viewed once.
- **syntax highlighting:** rich rendering for common languages (c/c++, js, rust, python, etc).
- **tor support:** ships with a built-in tor hidden service configuration.

## stack
- **frontend:** react + vite + typescript (bun)
- **backend:** rust (axum + tokio)
- **database:** redis (in-memory only)

## running it

### docker (recommended)
spin up the full stack, including the backend, frontend, redis, nginx, and tor service.
```bash
docker-compose up -d --build
```
access the frontend at `http://localhost:80`.

### manual dev
if you want to hack on the source.

**1. backend (rust)**
needs a local redis instance running on port 6379.
```bash
cd backend
# creates a dummy .env if you don't have one
cp .env.example .env
cargo run
```

**2. frontend (bun)**
proxies api requests to localhost:8080.
```bash
bun install
bun dev
```

## api
minimal endpoints.
encryption happens client-side, so don't send raw text here.
uploads require a valid proof-of-work solution in the headers.

- `GET /api/v1/challenge` - request a pow challenge (returns salt + difficulty + signature). rate-limited.
- `POST /api/v1/paste` - upload encrypted payload. requires `X-PoW-*` headers. returns assigned `{id: "..."}`
- `GET /api/v1/paste/:id` - fetch encrypted payload
- `GET /api/v1/paste/:id/metadata` - lightweight check for paste existence and properties
- `DELETE /api/v1/paste/:id` - delete manually (requires burn token if active)

## disclaimer
I built this for fun and to learn.
while the crypto is standard (aes-256 + argon2id), i'm just one dev and this hasn't been audited by a pro.
there are still some bugs and rough edges i'm smoothing out.

## license
mit.
use it for whatever.