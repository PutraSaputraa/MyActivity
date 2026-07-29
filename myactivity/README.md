# MyActivity

Aplikasi full-stack untuk mencatat aktivitas berulang, menyelesaikan rutinitas harian, membangun streak, dan mengelola agenda berbasis kalender.

## Fitur utama

- Login dan register berbasis username/password.
- Password di-hash dengan bcrypt dan session disimpan sebagai JWT dalam cookie HTTP-only.
- Activity, ActivityCompletion, dan Agenda disimpan sebagai koleksi terpisah.
- Weekly activity board, optimistic completion, Current Streak, dan Perfect Streak.
- Kalender bulanan, detail tanggal, pencarian, filter, status agenda dinamis, dan pengingat dalam aplikasi.
- Edit/hapus aktivitas berulang untuk satu tanggal, jadwal berikutnya, atau seluruh rangkaian.
- Responsive drawer/bottom navigation, modal bottom sheet, light mode, dan dark mode.
- Firestore hanya dapat diakses melalui Cloud Functions; Security Rules menolak akses browser langsung.

## Menjalankan UI

```bash
npm install
npm run dev
```

Tanpa `VITE_API_BASE_URL`, aplikasi otomatis berjalan dalam mode demo lokal. Klik **Lihat dashboard demo** atau gunakan:

```text
username: galih
password: demo123
```

Mode demo menyimpan perubahan ke `localStorage`, sehingga seluruh interaksi UI dapat dicoba tanpa Firebase.

## Deploy ke Netlify

Untuk deploy melalui repository, gunakan konfigurasi `netlify.toml` yang sudah tersedia. Netlify akan menjalankan `npm run build` dan mempublikasikan folder `dist`.

Untuk manual drag-and-drop, jalankan `npm run build`, lalu upload **isi folder `dist`** atau file `myactivity-netlify.zip`. Jangan upload folder induk proyek. File `_redirects` sudah disertakan agar fallback SPA tidak menghasilkan halaman 404.

Deploy Netlify tanpa backend Firebase akan otomatis berjalan dalam mode demo lokal.

## Menyambungkan Firebase

1. Buat Firebase project dan aktifkan Firestore Database.
2. Instal Firebase CLI dan login.
3. Project ini sudah diarahkan ke Firebase Project ID `myactivity-2d817` melalui `.firebaserc`.
4. Salin `.env.example` menjadi `.env`.
5. Buat secret JWT:

```bash
firebase functions:secrets:set JWT_SECRET
```

6. Salin `functions/.env.example` menjadi `functions/.env`. Untuk production, isi `WEB_APP_ORIGIN` dengan domain Firebase Hosting dan set `COOKIE_SECURE=true`.
7. Deploy:

```bash
npm run build
npm run firebase:deploy
```

Firebase Hosting meneruskan `/api/**` ke Cloud Function `api`, sehingga cookie session tetap first-party.

> Cloud Functions memerlukan paket Blaze untuk deployment production. Paket ini tetap memiliki kuota tanpa biaya, tetapi billing account harus ditautkan. Mode demo lokal dan Firebase Emulator tetap dapat digunakan pada paket Spark.

## Menjalankan Firebase Emulator

Ubah sementara `.env` menjadi:

```text
VITE_API_BASE_URL=http://127.0.0.1:5001/YOUR_FIREBASE_PROJECT_ID/asia-southeast2/api
```

Set `COOKIE_SECURE=false` di `functions/.env`, kemudian jalankan emulator dan Vite pada dua terminal:

```bash
npm run firebase:emulators
npm run dev
```

## Struktur Firestore

```text
users/{userId}
usernames/{normalizedUsername}
activities/{activityId}
activityCompletions/{activityId_date}
agendas/{agendaId}
```

Setiap Activity, ActivityCompletion, dan Agenda memiliki `userId`. Semua endpoint memverifikasi kepemilikan dokumen sebelum membaca atau mengubah data.
