import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/db';

// Halaman tujuan saat stiker NFC ditempel ke HP:
// https://jagokandangapp.gloos.id/scan/LIVESTOCK-0001
export default function ScanRedirect() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const find = async () => {
      const key = decodeURIComponent(id).trim();
      // Coba beberapa kali: data contoh dibuat saat aplikasi pertama dibuka.
      for (let attempt = 0; attempt < 6; attempt++) {
        const match =
          (await db.livestock.where('register_number').equals(key.toUpperCase()).first()) ??
          (await db.livestock.where('rfid_uid').equals(key).first());
        if (cancelled) return;
        if (match) {
          navigate(`/livestock/${match.id}`, { replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      if (!cancelled) setNotFound(true);
    };

    void find();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-extrabold text-slate-900">Ternak tidak ditemukan</h2>
        <p className="text-sm text-slate-500">
          ID <span className="font-mono">{id}</span> belum terdaftar.
        </p>
        <Link to="/" className="px-5 h-12 flex items-center rounded-xl bg-brand-600 text-white font-semibold">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-24 text-slate-500">
      <div className="text-4xl animate-pulse">📡</div>
      <p className="text-sm font-medium">Mencari data ternak…</p>
    </div>
  );
}
