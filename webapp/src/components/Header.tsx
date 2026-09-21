import { useAppStore } from '../store/useAppStore';
import { syncAll } from '../services/syncService';
import { haptic } from '../lib/utils';

export default function Header() {
  const isOnline = useAppStore((s) => s.isOnline);
  const pendingSync = useAppStore((s) => s.pendingSync);
  const isSyncing = useAppStore((s) => s.isSyncing);

  const onSync = () => {
    haptic(30);
    void syncAll();
  };

  return (
    <header
      className="sticky top-0 z-30 bg-brand-700 text-white shadow-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-lg shrink-0">
            🐄
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight truncate">
              Jago Kandang
            </h1>
            <p className="text-[11px] text-brand-100 leading-tight">
              Livestock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Online / Offline badge */}
          <span
            data-testid="online-status-badge"
            className={`flex items-center gap-1.5 px-2.5 h-8 rounded-full text-xs font-semibold ${
              isOnline ? 'bg-white text-brand-700' : 'bg-red-500 text-white'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-brand-600' : 'bg-white animate-pulse'
              }`}
            />
            {isOnline ? 'Online' : 'Offline'}
          </span>

          {/* Sync now button + pending badge */}
          <button
            data-testid="header-sync-button"
            onClick={onSync}
            disabled={isSyncing}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/15 active:bg-white/30 disabled:opacity-60"
            aria-label="Sinkronisasi"
          >
            <span className={`text-lg ${isSyncing ? 'animate-spin' : ''}`}>⟳</span>
            {pendingSync > 0 && (
              <span
                data-testid="pending-sync-count"
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-amber-400 text-brand-900 text-[11px] font-bold flex items-center justify-center"
              >
                {pendingSync}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
