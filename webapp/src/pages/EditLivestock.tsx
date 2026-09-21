import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Gender, type Livestock, type LivestockStatus } from '../db/db';
import { useAppStore } from '../store/useAppStore';

const inputCls =
  'w-full h-12 rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-100 outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function EditLivestock() {
  const { id } = useParams();
  const livestockId = Number(id);
  const navigate = useNavigate();
  const showToast = useAppStore((s) => s.showToast);

  const pens = useLiveQuery(() => db.pens.toArray(), []);
  const herd = useLiveQuery(() => db.livestock.toArray(), []);

  const [animal, setAnimal] = useState<Livestock | null>(null);
  const [loading, setLoading] = useState(true);

  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('F');
  const [penId, setPenId] = useState(0);
  const [rfid, setRfid] = useState('');
  const [status, setStatus] = useState<LivestockStatus>('ACTIVE');
  const [sireId, setSireId] = useState('');
  const [damId, setDamId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void db.livestock.get(livestockId).then((row) => {
      if (cancelled) return;
      if (row) {
        setAnimal(row);
        setBreed(row.breed);
        setBirthDate(row.birth_date);
        setGender(row.gender);
        setPenId(row.pen_id);
        setRfid(row.rfid_uid);
        setStatus(row.status);
        setSireId(row.sire_id ? String(row.sire_id) : '');
        setDamId(row.dam_id ? String(row.dam_id) : '');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [livestockId]);

  const save = async () => {
    if (!animal) return;
    if (!breed.trim()) {
      showToast('Jenis / ras wajib diisi.', 'error');
      return;
    }
    if (!rfid.trim()) {
      showToast('UID NFC wajib diisi.', 'error');
      return;
    }
    setSaving(true);
    try {
      await db.livestock.update(animal.id, {
        breed: breed.trim(),
        birth_date: birthDate,
        gender,
        pen_id: penId,
        rfid_uid: rfid.trim().toUpperCase(),
        status,
        sire_id: sireId ? Number(sireId) : undefined,
        dam_id: damId ? Number(damId) : undefined,
      });
      showToast('Data ternak diperbarui.', 'success');
      navigate(`/livestock/${animal.id}`, { replace: true });
    } catch (err) {
      const dup = err instanceof Error && err.name === 'ConstraintError';
      showToast(dup ? 'UID NFC sudah dipakai ternak lain.' : 'Gagal menyimpan data.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!animal) return;
    const ok = window.confirm(
      `Hapus ${animal.register_number}? Semua riwayat kesehatan dan karantina ternak ini ikut terhapus.`
    );
    if (!ok) return;
    await db.transaction(
      'rw',
      [db.livestock, db.healthLogs, db.quarantineLogs, db.schedules],
      async () => {
        await db.healthLogs.where('livestock_id').equals(animal.id).delete();
        await db.quarantineLogs.where('livestock_id').equals(animal.id).delete();
        await db.schedules.where('livestock_id').equals(animal.id).delete();
        await db.livestock.toCollection().modify((l) => {
          if (l.sire_id === animal.id) delete l.sire_id;
          if (l.dam_id === animal.id) delete l.dam_id;
        });
        await db.livestock.delete(animal.id);
      }
    );
    showToast('Ternak dihapus.', 'success');
    navigate('/', { replace: true });
  };

  if (loading) {
    return <p className="pt-16 text-center text-sm text-slate-500">Memuat…</p>;
  }

  if (!animal) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <h2 className="text-xl font-extrabold text-slate-900">Ternak tidak ditemukan</h2>
        <Link to="/" className="px-5 h-12 flex items-center rounded-xl bg-brand-600 text-white font-semibold">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const males = (herd ?? []).filter((l) => l.gender === 'M' && l.id !== animal.id);
  const females = (herd ?? []).filter((l) => l.gender === 'F' && l.id !== animal.id);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Link to={`/livestock/${animal.id}`} className="text-sm font-semibold text-brand-700">
        ← Batal
      </Link>
      <h2 className="text-2xl font-extrabold text-slate-900">Edit Data Ternak</h2>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col gap-4">
        <Field label="Nomor Register (tidak dapat diubah)">
          <input value={animal.register_number} disabled className={`${inputCls} bg-slate-100 text-slate-500`} />
        </Field>
        <Field label="Jenis / Ras">
          <input value={breed} onChange={(e) => setBreed(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Tanggal Lahir">
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Jenis Kelamin">
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={inputCls}>
            <option value="F">Betina</option>
            <option value="M">Jantan</option>
          </select>
        </Field>
        <Field label="Kandang">
          <select value={penId} onChange={(e) => setPenId(Number(e.target.value))} className={inputCls}>
            {(pens ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.pen_number}
              </option>
            ))}
          </select>
        </Field>
        <Field label="UID NFC (ubah jika tag diganti)">
          <input value={rfid} onChange={(e) => setRfid(e.target.value)} className={`${inputCls} font-mono`} />
        </Field>
        <Field label="Status">
          {animal.status === 'QUARANTINED' ? (
            <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-3">
              Sedang karantina. Ubah lewat tombol Karantina di halaman profil.
            </p>
          ) : (
            <select value={status} onChange={(e) => setStatus(e.target.value as LivestockStatus)} className={inputCls}>
              <option value="ACTIVE">Aktif</option>
              <option value="SOLD">Terjual</option>
            </select>
          )}
        </Field>
        <Field label="Pejantan (Sire)">
          <select value={sireId} onChange={(e) => setSireId(e.target.value)} className={inputCls}>
            <option value="">Tidak tercatat</option>
            {males.map((l) => (
              <option key={l.id} value={l.id}>
                {l.register_number}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Induk (Dam)">
          <select value={damId} onChange={(e) => setDamId(e.target.value)} className={inputCls}>
            <option value="">Tidak tercatat</option>
            {females.map((l) => (
              <option key={l.id} value={l.id}>
                {l.register_number}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button
        onClick={() => void save()}
        disabled={saving}
        className="h-14 rounded-xl bg-brand-600 text-white font-bold active:bg-brand-700 disabled:opacity-60"
      >
        {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
      </button>
      <button
        onClick={() => void remove()}
        className="h-12 rounded-xl border border-red-300 text-red-700 font-semibold active:bg-red-50"
      >
        Hapus Ternak
      </button>
    </div>
  );
}
