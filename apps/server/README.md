# Arena Cikpus 3D — Colyseus Server

Backend prototype dengan room `battle` (quick match) dan `custom-battle` (room privat) maksimal 10 pemain. Sinkronisasi dasar yang tersedia: posisi/rotasi, pembagian tim, HP/mana, serangan hero, skill Q/E/R, respawn dan skor kill. Host service Node.js ini terpisah dari GitHub Pages.

## Deploy via Render

Blueprint `render.yaml` di root repository memakai:

- Root directory: `apps/server`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`

URL publik perlu memakai HTTPS agar SDK di game yang berada di GitHub Pages meng-upgrade koneksi menjadi secure WebSocket.

## Jalankan lokal

Dari folder `apps/server`:

```bash
npm install
npm start
```

Default port `2567`, atau `PORT` dari environment service hosting. Endpoint `/health` mengembalikan JSON status server; room multiplayer memakai Colyseus WebSocket.

## Batasan

Ini belum server MOBA produksi. Wave minion/tower, win condition, leaderboard, anti-cheat lengkap, autentikasi, matchmaking antrean, party, reconnect dan stress testing masih diperlukan. Tidak ada database yang dikonfigurasi.
