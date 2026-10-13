# Roadmap Arena Cikpus 3D

## Versi 0.4 — Game flow, audio, effects, multiplayer prototype
- [x] Menu utama dan pemilihan mode
- [x] Tiga arketipe hero berbasis statistik/warna
- [x] Solo Practice dan Brawl vs AI
- [x] Sound effects dan ambience musik sintetis melalui Web Audio API
- [x] Particle burst, slash/projectile, flash screen dan feedback kill/heal
- [x] Lobby online, quick match, custom room, kode join
- [x] Colyseus sync untuk pemain sampai 10 klien, serangan, skill dasar, HP/mana, respawn dan skor
- [x] GitHub Pages frontend workflow dan blueprint deployment backend

## P1 — Gameplay online yang stabil
- [ ] Jadikan semua gelombang minion/tower/server-side dan implementasi objective/win condition
- [ ] Fixed simulation tick, server validation, rate limiting dan anti-cheat
- [ ] Matchmaking queue, room timeout, reconnection/backoff, keepalive dan latency compensation
- [ ] Uji 2 browser dulu, lalu 10 pemain; ukur CPU/memori/latency sebelum buka publik

## P2 — Kualitas visual/audio
- [ ] Hero dan monster GLB/GLTF dengan rig/animasi yang benar
- [ ] Skill telegraph, projectile trail, elemental particles, camera shake/hit stop opsional
- [ ] File audio berlisensi untuk UI, serangan, skill, ambience dan musik; master/music/SFX mixer
- [ ] Preset grafis Low/Medium/High, render scale, shadow/bloom toggle, batas FPS

## P3 — Konten dan retensi
- [ ] Tutorial singkat, bot dengan beberapa kesulitan dan ringkasan akhir match
- [ ] Hero role yang benar-benar berbeda dan balancing cooldown/damage/mana
- [ ] Party/lobby, quick pings, reconnect, profil, riwayat dan ranking setelah core gameplay stabil

GitHub Pages hanya menyediakan static frontend. Multiplayer membutuhkan Node.js + WebSocket backend di service terpisah. Layanan gratis dapat tidur, memiliki batas performa, atau berubah kebijakan; cocok untuk prototype/test, bukan jaminan kompetitif.
