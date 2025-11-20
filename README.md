# <img src="./Ghostbin.png" width="25" alt="logo" style="vertical-align: bottom;" /> ghostbin 

a secure, ephemeral, zero-knowledge pastebin.
client-side encryption. nothing hits the disk. ever.

## why?
most pastebins store logs or persist data to databases. we don't.

ghostbin runs entirely in volatile memory. data is stored in redis RAM with **no disk persistence** (no RDB/AOF). if the server restarts, the power cuts, or the process is killed, the data is instantly and irretrievably gone.

## features
- **zero-knowledge:** aes-256-gcm encryption happens in the browser. the server only ever sees ciphertext.
- **secure derivation:** passwords hashed using argon2id via wasm.
- **volatile by design:** no hard drive writes. forensic analysis is impossible once the process dies.
- **burn after read:** optional setting to nuke the paste immediately after it's viewed once.
- **tor support:** ships with a built-in tor hidden service configuration.

## stack
- **frontend:** react + vite + typescript (tailwind for style)
- **backend:** rust (axum + tokio)
- **database:** redis (in-memory only)

## running it

### docker (recommended)
spin up the full stack, including the backend, frontend, redis, and tor service.
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
**2. frontend (node)**
proxies api requests to localhost:8080.
```bash
npm install
npm run dev
```
## api
minimal endpoints. encryption happens client-side, so don't send raw text here.

- `POST /api/v1/paste` - upload encrypted payload
- `GET /api/v1/paste/:id` - fetch encrypted payload
- `DELETE /api/v1/paste/:id` - delete manually

## license
mit. use it for whatever.