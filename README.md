# Arena Cikpus 3D — Web MOBA Prototype v0.5

Prototype MOBA 3D berbasis Three.js dan Vite yang dapat diterbitkan sebagai frontend statis di GitHub Pages. Versi ini menambahkan layar pembuka sinematik sebelum menu mode, animasi atmosfer, audio prosedural berlapis, efek skill/impact yang lebih kuat, dan koneksi awal untuk room multiplayer Colyseus.

## Pembaruan v0.5

- **Layar pembuka baru**: layar awal menampilkan identitas game dan tombol “Mulai Petualangan”; pemain harus masuk ke menu mode terlebih dahulu, tidak langsung dimasukkan ke arena.
- **Animasi layar awal dan arena**: partikel cahaya, rune melayang, aurora, emblem berputar, scanline, transisi ke menu, serta 150 mote magis bergerak di arena.
- **Sound effect diperkuat**: serangan dengan swoosh/impact, dash, burst, heal, hit, kill, level-up, UI, menu, dan efek mulai pertandingan. Audio berbasis Web Audio API tanpa file audio eksternal; toggle audio tersedia di splash dan menu.
- **Musik prosedural berlapis**: pad, harmoni, arpeggio, dan pulse bass dengan slider MUSIC dan SFX yang dapat disimpan.
- **Combat feedback baru**: magic sigil/rune di lantai, motion trail saat dash, impact burst lebih besar, ring impact, projectile hit burst, screen flash saat mulai match/terkena hit, dan camera shake pendek.
- **Scene menu tetap hidup**: air, kristal/tower, dan idle hero bergerak perlahan saat splash atau menu tampil.

## Pembaruan versi ini

- **Menu utama baru**: pilih hero, Solo Practice, Brawl vs AI, Online 5v5, atau Custom Room.
- **Tiga arketipe hero**: Guardian (lebih tahan), Arcanist (mana besar), dan Ranger (lebih cepat). Pada build ini ketiganya masih memakai rig/geometri dasar yang sama dengan perbedaan statistik dan warna.
- **Solo Practice** untuk belajar kamera, gerakan, serangan dan skill; **Brawl vs AI** membuat bot lawan lebih agresif.
- **Sound effect sintetis** melalui Web Audio API: UI, serangan, dash, magic burst, heal, hit, kill dan level-up. Musik latar dibuat secara prosedural; tidak membutuhkan unduhan audio.
- **Visual effect**: particle burst, slash, proyektil bercahaya, ring skill, flash layar, umpan balik kill/respawn, dan minimap yang menampilkan pemain remote.
- **Lobby multiplayer**: URL backend, quick match, create room privat, join lewat kode room, serta indikator kode room.
- **Colyseus multiplayer prototype**: room maksimal 10 pemain dengan pembagian tim otomatis, gerakan tersinkron, serangan dasar terhadap hero lawan, skill Q/E/R, HP/mana, respawn dan skor kill dasar.
- **GitHub Pages workflow** tetap disediakan untuk frontend. `render.yaml` disertakan sebagai opsi deployment server Node.js untuk uji coba.

## Alur mulai game

Saat pertama dibuka, layar splash sinematik tampil lebih dahulu. Klik **Mulai Petualangan** untuk membuka menu utama, pilih hero dan mode; arena baru aktif setelah memilih Solo Practice atau Brawl vs AI. Audio default aktif untuk kunjungan baru dan dapat dimute melalui tombol audio pada splash/menu. Browser mengharuskan interaksi pemain sebelum memulai audio.

## Jalankan frontend di GitHub Pages (tanpa VS Code)

1. Download ZIP proyek dan ekstrak.
2. Buka repository GitHub yang sudah digunakan, pilih **Add file → Upload files**.
3. Upload isi folder `arena-cikpus-3d`, jangan ZIP-nya saja. Pastikan `apps/client`, `apps/server`, `.github`, `render.yaml` dan `README.md` berada di root repository.
4. Commit ke branch `main`.
5. Buka **Actions** dan periksa workflow deployment. Atur **Settings → Pages → Build and deployment → Source: GitHub Actions**.
6. Setelah workflow berhasil, frontend tetap di `https://USERNAME.github.io/arena-cikpus-3d/`.

Jangan membuat folder proyek bersarang seperti `arena-cikpus-3d/arena-cikpus-3d/apps/client`.

## Aktifkan server multiplayer

GitHub Pages **tidak menjalankan Node.js/WebSocket**. Multiplayer tidak akan tersambung hanya dengan mengunggah frontend. Server di `apps/server` harus diterbitkan sebagai service Node.js terpisah.

Opsi uji coba menggunakan Render:

1. Buka dashboard Render dan pilih **New → Blueprint**, lalu hubungkan repository GitHub yang sama. Render akan membaca `render.yaml` yang memakai root directory `apps/server`, perintah `npm install`, `npm start`, dan health check `/health`.
2. Pilih instance Free bila tersedia pada akun/region Anda. Tunggu deploy selesai; tes URL server, misalnya `https://arena-cikpus-server.onrender.com/health`. Respons yang diharapkan adalah JSON berstatus `ok`.
3. Buka game GitHub Pages, klik **ONLINE 5v5** atau **CUSTOM ROOM**. Masukkan URL backend HTTPS tersebut, isi nama pemain, lalu pilih **Cari Match 5v5**, **Buat Room Privat**, atau **Gabung** dengan kode teman.
4. Untuk masuk ke custom room, semua pemain memakai URL server yang sama; host membagikan kode room yang muncul di header game.

Render mendukung WebSocket, tetapi layanan Free dapat tidur setelah 15 menit tanpa traffic dan membutuhkan sekitar satu menit untuk aktif kembali ketika diakses lagi. Ini layak untuk pengujian, bukan jaminan pengalaman kompetitif tanpa jeda. Lihat dokumentasi resmi: [WebSockets on Render](https://render.com/docs/websocket) dan [Free instances](https://render.com/docs/free).

## Kontrol game

| Aksi | Kontrol |
|---|---|
| Gerak | `W A S D` atau tombol panah |
| Serangan dasar | `SPACE` atau tombol SERANG |
| Dash | `Q` |
| Arcane Burst | `E` |
| Heal | `R` |
| Jeda / lanjut | `P` atau tombol jeda |
| Kamera | Drag untuk putar/tilt, scroll atau slider untuk zoom |
| Audio | Tombol musik di header/menu; slider MUSIC dan SFX untuk volume |

Browser memerlukan satu interaksi pengguna untuk mengaktifkan audio. Sound effect dan musik bersifat sintetis, bukan audio rekaman.

## Batasan saat ini — baca sebelum menganggapnya game siap rilis

Ini masih **prototype**. Multiplayer server-authoritative sudah menjadi dasar teknis, tetapi belum merupakan MOBA produksi penuh. Wave minion, tower, objective/win condition, bot, efek dan statistik di arena masih banyak yang berjalan lokal di client. Sistem serangan pemain dan skor kill tersinkron, tetapi belum ada matchmaking ranked, akun, inventori, reconnect otomatis, validasi anti-cheat lengkap, penyimpanan statistik, chat, atau uji beban 10 pemain.

Model hero masih memakai geometri prosedural yang sama dengan warna/statistik berbeda, bukan tiga model karakter GLB berbeda. Efek audio sintetis memberi feedback dasar; audio profesional berikutnya sebaiknya menggunakan file audio berlisensi dengan spatial audio/mixing terpisah. Build final perlu diverifikasi melalui **GitHub Actions** sesudah dependency terpasang karena instalasi npm di lingkungan pembuat paket sempat mengalami timeout.

## Roadmap yang direkomendasikan

### P1 — Stabilkan permainan online
- Server authoritative untuk gerak, cooldown, skill, HP, mana dan kematian; validasi batas gerak dan spam serangan.
- Wave minion serta tower berjalan server-side, objective markas, akhir match, respawn dan skor tim konsisten.
- Matchmaking dengan antrean, room lifecycle, join/reconnect handling, latency indicator dan keepalive.
- Uji dua browser/perangkat bersamaan terlebih dahulu, lanjut ke 10 klien sebelum disebut 5v5 siap bermain.

### P2 — Perbaiki kualitas visual dan suara
- Model hero, minion, jungle monster dan tower dalam GLB/GLTF dengan rig serta animasi idle/run/attack/skill/hit/death.
- Partikel elemental tiap hero, telegraph area skill, trail proyektil, screen shake yang dapat dimatikan, hit stop singkat, angka damage dan indikator critical.
- Sound design berlapis untuk sword swing, impact, magic charge/release, heal, tower, kill, UI, ambience hutan, sungai dan musik menu; tambahkan pengaturan master/music/SFX serta mute.
- Menu opsi grafis: Low/Medium/High, kualitas bayangan, bloom, render scale, batas FPS, dan pengaturan kamera.

### P3 — Menambah replay value
- Tutorial interaktif 60–90 detik, objective harian, bot dengan 3 tingkat kesulitan, statistik akhir match dan tombol rematch.
- Empat hingga enam hero dengan role jelas (Tank, Fighter, Mage, Marksman, Support, Assassin), skill yang berbeda, cooldown/mana seimbang, dan draft sederhana.
- Lobby party, kode undangan, chat cepat/ping map, reconnect, riwayat match, profil dan ranking baru setelah server game stabil.

## Struktur utama

- `apps/client`: Three.js, UI, sound, visual effect, gameplay client.
- `apps/server`: Colyseus room dan state pemain.
- `.github/workflows/deploy-pages.yml`: build/deploy frontend ke GitHub Pages.
- `render.yaml`: blueprint backend Node.js.
- `docs/ROADMAP.md`: tahap pengembangan berikutnya.
