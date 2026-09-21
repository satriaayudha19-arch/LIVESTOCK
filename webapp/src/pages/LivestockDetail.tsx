import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Livestock } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import {
  ageFromBirth,
  formatDate,
  formatDateTime,
  genderLabel,
  haptic,
  statusLabel,
} from '../lib/utils';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900 text-right">
        {value}
      </span>
    </div>
  );
}

export default function LivestockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lid = Number(id);
  const showToast = useAppStore((s) => s.showToast);
  const refreshPending = useAppStore((s) => s.refreshPending);

  const [showHealth, setShowHealth] = useState(false);
  const [showQuarantine, setShowQuarantine] = useState(false);

  const animal = useLiveQuery(() => db.livestock.get(lid), [lid]);
  const pen = useLiveQuery(
    async () => (animal ? db.pens.get(animal.pen_id) : undefined),
    [animal?.pen_id]
  );
  const sire = useLiveQuery(
    async () => (animal?.sire_id ? db.livestock.get(animal.sire_id) : undefined),
    [animal?.sire_id]
  );
  const dam = useLiveQuery(
    async () => (animal?.dam_id ? db.livestock.get(animal.dam_id) : undefined),
    [animal?.dam_id]
  );
  const healthLogs = useLiveQuery(
    () =>
      db.healthLogs.where('livestock_id').equals(lid).reverse().sortBy('recorded_at'),
    [lid],
    []
  );
  const quarantineLogs = useLiveQuery(
    () => db.quarantineLogs.where('livestock_id').equals(lid).reverse().sortBy('start_date'),
    [lid],
    []
  );

  if (!animal) {
    return (
      <div className="text-center text-slate-400 pt-10" data-testid="detail-not-found">
        Memuat data ternak…
      </div>
    );
  }

  const latestWeight = healthLogs[0]?.weight;

  return (
    <div className="flex flex-col gap-4">
      <button
        data-testid="detail-back-button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="self-start text-sm font-semibold text-brand-700 -ml-1"
      >
        ← Kembali
      </button>

      {/* Hero */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-3xl">
            {animal.gender === 'M' ? '🐂' : '🐄'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 break-words">
              {animal.register_number}
            </h2>
            <p className="text-sm text-slate-500">{animal.breed}</p>
          </div>
          <span
            data-testid="detail-status-badge"
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              animal.status === 'ACTIVE'
                ? 'bg-brand-100 text-brand-700'
                : animal.status === 'QUARANTINED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-200 text-slate-600'
            }`}
          >
            {statusLabel(animal.status)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <h3 className="font-bold text-slate-900 mb-1">Informasi Ternak</h3>
        <Field label="Jenis Kelamin" value={genderLabel(animal.gender)} />
        <Field label="Tanggal Lahir" value={formatDate(animal.birth_date)} />
        <Field label="Umur" value={ageFromBirth(animal.birth_date)} />
        <Field label="RFID / NFC UID" value={animal.rfid_uid} />
        <Field label="Kandang" value={pen?.pen_number ?? '-'} />
        <Field
          label="Berat Terkini"
          value={latestWeight != null ? `${latestWeight} kg` : '-'}
        />
      </div>

      {/* Pedigree */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <h3 className="font-bold text-slate-900 mb-1">Silsilah (Pedigree)</h3>
        <Field label="Pejantan (Sire)" value={sire?.register_number ?? 'Tidak tercatat'} />
        <Field label="Induk (Dam)" value={dam?.register_number ?? 'Tidak tercatat'} />
      </div>

      {/* Weight / health history */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <h3 className="font-bold text-slate-900 mb-2">Riwayat Kesehatan & Berat</h3>
        {healthLogs.length === 0 && (
          <p className="text-sm text-slate-400 py-2">Belum ada catatan.</p>
        )}
        <div className="flex flex-col gap-2">
          {healthLogs.map((h) => (
            <div
              key={h.id}
              data-testid={`health-log-${h.id}`}
              className="rounded-xl bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{h.weight} kg</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{h.temperature}°C</span>
                  {!h.synced && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      belum sinkron
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatDateTime(h.recorded_at)} •{' '}
                {h.is_fertile ? 'Subur' : 'Tidak subur'}
              </p>
              {h.notes && (
                <p className="text-xs text-slate-600 mt-1 italic">"{h.notes}"</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quarantine history */}
      {quarantineLogs.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 mb-2">Riwayat Karantina</h3>
          <div className="flex flex-col gap-2">
            {quarantineLogs.map((q) => (
              <div
                key={q.id}
                data-testid={`quarantine-log-${q.id}`}
                className="rounded-xl bg-red-50 p-3 border border-red-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-700 text-sm">
                    {q.disease_detected}
                  </span>
                  <span className="text-[11px] font-bold text-red-700">
                    {statusLabel(q.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Mulai: {formatDate(q.start_date)}
                  {q.end_date ? ` • Selesai: ${formatDate(q.end_date)}` : ''}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Perawatan: {q.treatment_given}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

            {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          data-testid="open-health-form-button"
          onClick={() => {
            haptic(20);
            setShowHealth(true);
          }}
          className="w-full h-12 rounded-xl bg-brand-600 text-white font-bold active:bg-brand-700"
        >
          + Catat Kesehatan / Berat
        </button>
        <button
          data-testid="open-quarantine-form-button"
          onClick={() => {
            haptic(20);
            setShowQuarantine(true);
          }}
          className={`w-full h-12 rounded-xl font-bold ${
            animal.status === 'QUARANTINED'
              ? 'bg-brand-100 text-brand-700'
              : 'bg-red-600 text-white active:bg-red-700'
          }`}
        >
          {animal.status === 'QUARANTINED'
            ? 'Kelola / Akhiri Karantina'
            : '⚠️ Karantina Ternak'}
        </button>
        <button
          data-testid="open-edit-button"
          onClick={() => navigate(`/livestock/${animal.id}/edit`)}
          className="w-full h-12 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold active:bg-slate-50"
        >
          ✏️ Edit Data Ternak
        </button>
      </div>

      {showHealth && (
        <HealthLogForm
          livestockId={lid}
          onClose={() => setShowHealth(false)}
          onSaved={async () => {
            await refreshPending();
            showToast('Catatan kesehatan disimpan.', 'success');
            setShowHealth(false);
          }}
        />
      )}

      {showQuarantine && (
        <QuarantineForm
          animal={animal}
          onClose={() => setShowQuarantine(false)}
          onSaved={async (msg) => {
            await refreshPending();
            showToast(msg, 'success');
            setShowQuarantine(false);
          }}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Bottom-sheet style modal wrapper
// --------------------------------------------------------------------------
function Sheet({
  title,
  children,
  onClose,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  testId: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        data-testid={testId}
        className="relative w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-extrabold text-slate-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Health log form
// --------------------------------------------------------------------------
function HealthLogForm({
  livestockId,
  onClose,
  onSaved,
}: {
  livestockId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [weight, setWeight] = useState('');
  const [temperature, setTemperature] = useState('38.5');
  const [isFertile, setIsFertile] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!weight) return;
    setSaving(true);
    await db.healthLogs.add({
      livestock_id: livestockId,
      weight: Number(weight),
      temperature: Number(temperature),
      is_fertile: isFertile,
      notes: notes.trim(),
      recorded_at: new Date().toISOString(),
      synced: false,
    } as never);
    haptic(40);
    onSaved();
  };

  return (
    <Sheet title="Catat Kesehatan & Berat" onClose={onClose} testId="health-form-sheet">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-slate-700">Berat (kg)</span>
          <input
            data-testid="health-weight-input"
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="mis. 420"
            className="h-12 rounded-xl border border-slate-300 px-3 text-base focus:border-brand-600 outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-slate-700">Suhu (°C)</span>
          <input
            data-testid="health-temp-input"
            type="number"
            inputMode="decimal"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="h-12 rounded-xl border border-slate-300 px-3 text-base focus:border-brand-600 outline-none"
          />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Status Subur</span>
          <button
            data-testid="health-fertile-toggle"
            onClick={() => setIsFertile((v) => !v)}
            className={`w-14 h-8 rounded-full flex items-center px-1 transition-colors ${
              isFertile ? 'bg-brand-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white shadow" />
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-slate-700">Catatan</span>
          <textarea
            data-testid="health-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Kondisi umum, keluhan, dll."
            className="rounded-xl border border-slate-300 px-3 py-2 text-base focus:border-brand-600 outline-none resize-none"
          />
        </label>

        <button
          data-testid="health-save-button"
          onClick={save}
          disabled={saving || !weight}
          className="h-12 rounded-xl bg-brand-600 text-white font-bold active:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </Sheet>
  );
}

// --------------------------------------------------------------------------
// Quarantine form / toggle
// --------------------------------------------------------------------------
function QuarantineForm({
  animal,
  onClose,
  onSaved,
}: {
  animal: Livestock;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isQuarantined = animal.status === 'QUARANTINED';
  const [disease, setDisease] = useState('');
  const [treatment, setTreatment] = useState('');
  const [saving, setSaving] = useState(false);

  const startQuarantine = async () => {
    if (!disease.trim()) return;
    setSaving(true);
    await db.transaction('rw', db.livestock, db.quarantineLogs, async () => {
      await db.livestock.update(animal.id, { status: 'QUARANTINED' });
      await db.quarantineLogs.add({
        livestock_id: animal.id,
        disease_detected: disease.trim(),
        start_date: new Date().toISOString().slice(0, 10),
        treatment_given: treatment.trim() || 'Observasi',
        status: 'ISOLATED',
        synced: false,
      } as never);
    });
    haptic([40, 30, 40]);
    onSaved('Ternak dipindahkan ke karantina. Lokasi kandang dikunci.');
  };

  const endQuarantine = async (outcome: 'RECOVERED' | 'DECEASED') => {
    setSaving(true);
    const active = await db.quarantineLogs
      .where('livestock_id')
      .equals(animal.id)
      .and((q) => q.status === 'ISOLATED')
      .first();

    await db.transaction('rw', db.livestock, db.quarantineLogs, async () => {
      await db.livestock.update(animal.id, {
        status: outcome === 'RECOVERED' ? 'ACTIVE' : animal.status,
      });
      if (active) {
        await db.quarantineLogs.update(active.id, {
          status: outcome,
          end_date: new Date().toISOString().slice(0, 10),
          synced: false,
        });
      }
    });
    haptic(40);
    onSaved(
      outcome === 'RECOVERED'
        ? 'Karantina selesai — ternak kembali aktif.'
        : 'Status diperbarui.'
    );
  };

  return (
    <Sheet
      title={isQuarantined ? 'Kelola Karantina' : 'Karantina Ternak'}
      onClose={onClose}
      testId="quarantine-form-sheet"
    >
      {isQuarantined ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            Ternak ini sedang dalam karantina. Lokasi kandang terkunci.
          </div>
          <button
            data-testid="quarantine-recover-button"
            onClick={() => endQuarantine('RECOVERED')}
            disabled={saving}
            className="h-12 rounded-xl bg-brand-600 text-white font-bold active:bg-brand-700 disabled:opacity-50"
          >
            ✓ Tandai Sembuh & Aktifkan
          </button>
          <button
            data-testid="quarantine-deceased-button"
            onClick={() => endQuarantine('DECEASED')}
            disabled={saving}
            className="h-12 rounded-xl bg-slate-800 text-white font-bold active:bg-slate-700 disabled:opacity-50"
          >
            Tandai Mati
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-700">
              Penyakit Terdeteksi
            </span>
            <input
              data-testid="quarantine-disease-input"
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              placeholder="mis. Suspek PMK"
              className="h-12 rounded-xl border border-slate-300 px-3 text-base focus:border-brand-600 outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-700">
              Perawatan Diberikan
            </span>
            <textarea
              data-testid="quarantine-treatment-input"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              rows={3}
              placeholder="mis. Antibiotik, isolasi 14 hari"
              className="rounded-xl border border-slate-300 px-3 py-2 text-base focus:border-brand-600 outline-none resize-none"
            />
          </label>
          <button
            data-testid="quarantine-start-button"
            onClick={startQuarantine}
            disabled={saving || !disease.trim()}
            className="h-12 rounded-xl bg-red-600 text-white font-bold active:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : '⚠️ Mulai Karantina'}
          </button>
      </div>
      )}
    </Sheet>
  );
}
