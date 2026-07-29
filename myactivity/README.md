# MyActivity

Aplikasi aktivitas dan agenda berbasis React, Firebase Authentication, dan Cloud Firestore. Frontend dapat di-deploy langsung ke Netlify tanpa Cloud Functions dan tanpa paket Blaze.

## Fitur utama

- Login dan register menggunakan username/password.
- Password dan session dikelola oleh Firebase Authentication.
- Activity, ActivityCompletion, dan Agenda disimpan sebagai subkoleksi pengguna yang terpisah.
- Sinkronisasi data realtime melalui Firestore `onSnapshot`.
- Weekly activity board, optimistic completion, Current Streak, dan Perfect Streak.
- Kalender bulanan, pencarian, filter, status agenda, dan pengingat dalam aplikasi.
- Edit/hapus aktivitas berulang untuk satu tanggal, jadwal berikutnya, atau seluruh rangkaian.
- Responsive drawer/bottom navigation, light mode, dark mode, dan mode demo lokal.

## Konfigurasi Firebase

Project sudah tersambung ke Firebase Project ID `myactivity-2d817` melalui `src/firebase.js`.

Sebelum memakai akun production:

1. Buka **Firebase Console → Authentication → Sign-in method**.
2. Aktifkan provider **Email/Password**.
3. Tambahkan domain Netlify di **Authentication → Settings → Authorized domains**.
4. Terapkan isi `firestore.rules` melalui tab Firestore Rules, lalu klik **Publish**.

Antarmuka tetap meminta username. Di belakang layar, username dinormalisasi menjadi identitas email internal untuk Firebase Authentication. Pengguna tidak perlu mengetahui atau mengetik email internal tersebut.

## Struktur Firestore

```text
users/{uid}
  activities/{activityId}
  completions/{activityId_date}
  agendas/{agendaId}
```

Firestore Rules membatasi seluruh dokumen dan subkoleksi agar hanya dapat diakses ketika `request.auth.uid` sama dengan `{uid}` pada path.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Klik **Lihat dashboard demo** untuk mencoba tanpa akun Firebase. Data demo disimpan di `localStorage`.

## Deploy Netlify melalui Git

Konfigurasi deployment berada di `../netlify.toml` karena root Git adalah folder induk `Activity`.

```text
Base directory: myactivity
Build command: npm run build
Publish directory: dist
```

Push source repository seperti biasa. Jangan membuat environment variable `VITE_API_BASE_URL`; browser berkomunikasi langsung dengan Firebase SDK.

## Firestore Rules via CLI

Jika Firebase CLI sudah terpasang dan login:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

