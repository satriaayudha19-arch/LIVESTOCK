import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import { syncAll } from '../services/syncService';
import { formatDateTime, haptic } from '../lib/utils';

export default function Profile() {
  const owner = useLiveQuery(() => db.owners.toArray().then((o) => o[0]), []);
  const pendingSync = useAppStore((s) => s.pendingSync);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const isOnline = useAppStore((s) => s.isOnline);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);

  const livestockCount = useLiveQuery(
    () => db.livestock.filter((l) => l.status !== 'SOLD').count(),
    [],
    0
  );

  const onSync = () => {
    haptic(30);
    void syncAll();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold text-slate-900">Profil</h2>

      {/* Owner card */}
      <div className="rounded-2xl bg-brand-700 text-white p-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl">
            👤
          </div>
          <div className="min-w-0">
            <p className="font-bold text-lg truncate" data-testid="profile-owner-name">
              {owner?.name ?? 'Peternak'}
            </p>
            <p className="text-sm text-brand-100 truncate">{owner?.email ?? '-'}</p>
            <p className="text-sm text-brand-100">{owner?.phone ?? '-'}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm">
          <span className="text-brand-100">Total ternak dikelola</span>
          <span className="font-bold">{livestockCount}</span>
        </div>
      </div>

      {/* Sync panel */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <h3 className="font-bold text-slate-900 mb-3">Sinkronisasi Data</h3>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Status Koneksi</span>
          <span
            className={`text-sm font-bold ${isOnline ? 'text-brand-700' : 'text-red-600'}`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Data Menunggu Sinkron</span>
          <span
            data-testid="profile-pending-count"
            className="text-sm font-bold text-amber-700"
          >
            {pendingSync}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-sm text-slate-500">Sinkron Terakhir</span>
          <span className="text-sm font-semibold text-slate-700">
            {lastSyncedAt ? formatDateTime(lastSyncedAt) : 'Belum pernah'}
          </span>
        </div>

        <button
          data-testid="profile-sync-button"
          onClick={onSync}
          disabled={isSyncing}
          className="mt-3 w-full h-12 rounded-xl bg-brand-600 text-white font-bold active:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className={isSyncing ? 'animate-spin' : ''}>⟳</span>
          {isSyncing ? 'Menyinkronkan…' : 'Sinkronisasi Sekarang'}
        </button>
      </div>

      {/* About */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-500">
        <h3 className="font-bold text-slate-900 mb-2">Tentang Aplikasi</h3>
        <p>JAGO KANDANG Livestock v1.0.0</p>
        <p className="mt-1">
          PWA offline-first untuk manajemen ternak. Data disimpan lokal (IndexedDB)
          dan disinkronkan otomatis saat koneksi tersedia.
        </p>
      </div>
    </div>
  );
}
