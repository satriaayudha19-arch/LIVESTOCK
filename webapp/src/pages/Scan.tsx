import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import { haptic } from '../lib/utils';

type ScanState = 'idle' | 'scanning' | 'found' | 'error';

// Extract "LIVESTOCK-0001" from a URI like
// https://jagokandangapp.gloos.id/scan/LIVESTOCK-0001
function extractId(raw: string): string {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? raw;
  } catch {
    // Not a URL — maybe a bare id or ".../scan/ID"
    const parts = raw.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? raw;
  }
}

// Read text from an NDEF record's DataView (handles url + text records).
function decodeRecord(record: NDEFRecord): string | null {
  if (record.recordType === 'url' && record.data) {
    return new TextDecoder().decode(record.data);
  }
  if (record.recordType === 'text' && record.data) {
    // text records prefix a status byte + language code
    const bytes = new Uint8Array(record.data.buffer);
    const langLen = bytes[0] & 0x3f;
    return new TextDecoder(record.encoding || 'utf-8').decode(
      bytes.slice(1 + langLen)
    );
  }
  if (record.data) {
    return new TextDecoder().decode(record.data);
  }
  return null;
}

export default function Scan() {
  const navigate = useNavigate();
  const showToast = useAppStore((s) => s.showToast);
  const [state, setState] = useState<ScanState>('idle');
  const [message, setMessage] = useState('');
  const [manualId, setManualId] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const nfcSupported =
    typeof window !== 'undefined' && 'NDEFReader' in window;

  const lookupAndGo = async (registerNumber: string) => {
    const id = extractId(registerNumber);
    const match = await db.livestock
      .where('register_number')
      .equals(id)
      .first()
      .then((r) => r ?? db.livestock.where('rfid_uid').equals(id).first());

    if (match) {
      haptic([40, 30, 60]);
      setState('found');
      setMessage(`Ditemukan: ${match.register_number}`);
      showToast(`Ternak ${match.register_number} ditemukan!`, 'success');
      setTimeout(() => navigate(`/livestock/${match.id}`), 600);
    } else {
      haptic([80, 40, 80]);
      setState('error');
      setMessage(`ID "${id}" tidak ditemukan di database.`);
      showToast('Ternak tidak ditemukan.', 'error');
    }
  };

  const startScan = async () => {
    if (!nfcSupported) {
      setState('error');
      setMessage('Web NFC tidak didukung di perangkat/browser ini.');
      return;
    }
    try {
      setState('scanning');
      setMessage('Dekatkan ponsel ke tag telinga ternak…');
      haptic(30);

      const reader = new NDEFReader();
      const controller = new AbortController();
      abortRef.current = controller;

      await reader.scan({ signal: controller.signal });

      reader.onreadingerror = () => {
        haptic([80, 40, 80]);
        setState('error');
        setMessage('Gagal membaca tag. Coba lagi.');
      };

      reader.onreading = (event: NDEFReadingEvent) => {
        for (const record of event.message.records) {
          const value = decodeRecord(record);
          if (value) {
            void lookupAndGo(value);
            return;
          }
        }
        // Fall back to the serial number if no readable record.
        if (event.serialNumber) {
          void lookupAndGo(event.serialNumber);
        } else {
          setState('error');
          setMessage('Tag kosong / format tidak dikenali.');
        }
      };
    } catch (err) {
      let msg = 'Terjadi kesalahan saat memindai.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError')
          msg = 'Izin NFC ditolak. Aktifkan izin NFC di pengaturan.';
        else if (err.name === 'NotSupportedError')
          msg = 'Perangkat tidak mendukung NFC.';
        else if (err.name === 'AbortError') return; // user stopped
        else msg = `NFC error: ${err.name}`;
      }
      haptic([80, 40, 80]);
      setState('error');
      setMessage(msg);
    }
  };

  const stopScan = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState('idle');
    setMessage('');
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const onManualSubmit = () => {
    if (!manualId.trim()) return;
    void lookupAndGo(manualId.trim());
  };

  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-slate-900">Pindai NFC</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tempelkan ponsel ke tag telinga ternak
        </p>
      </div>

      {/* Scan target visual */}
      <button
        data-testid="scan-target-button"
        onClick={state === 'scanning' ? stopScan : startScan}
        className="relative flex items-center justify-center w-56 h-56 rounded-full focus:outline-none"
      >
        {state === 'scanning' && (
          <>
            <span className="absolute inset-0 rounded-full bg-brand-400/40 animate-ping-slow" />
            <span className="absolute inset-4 rounded-full bg-brand-400/30 animate-ping-slow [animation-delay:0.6s]" />
          </>
        )}
        <span
          className={`relative z-10 w-40 h-40 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-colors ${
            state === 'error'
              ? 'bg-red-600'
              : state === 'found'
                ? 'bg-brand-600'
                : state === 'scanning'
                  ? 'bg-brand-700'
                  : 'bg-brand-600'
          }`}
        >
          <span className="text-5xl">
            {state === 'found' ? '✓' : state === 'error' ? '✕' : '📡'}
          </span>
          <span className="text-sm font-bold mt-1">
            {state === 'scanning'
              ? 'Memindai…'
              : state === 'found'
                ? 'Ditemukan!'
                : 'Ketuk untuk Pindai'}
          </span>
        </span>
      </button>

      {/* Status message */}
      {message && (
        <div
          data-testid="scan-status-message"
          className={`text-center text-sm font-medium px-4 py-2 rounded-xl max-w-xs ${
            state === 'error'
              ? 'bg-red-50 text-red-700'
              : state === 'found'
                ? 'bg-brand-50 text-brand-700'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {message}
        </div>
      )}

      {/* NFC support notice */}
      {!nfcSupported && (
        <div
          data-testid="nfc-unsupported-notice"
          className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 max-w-xs"
        >
          ℹ️ Pemindai dalam aplikasi hanya tersedia di Chrome Android. Di perangkat lain, tempelkan stiker NFC langsung ke ponsel, atau gunakan input manual di bawah.
        </div>
      )}

      {/* Manual fallback — dev/desktop testing only */}
      <div className="w-full max-w-xs mt-2">
        <p className="text-xs text-slate-400 text-center mb-2">
          — Mode Uji (input manual) —
        </p>
        <div className="flex gap-2">
          <input
            data-testid="manual-id-input"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onManualSubmit()}
            placeholder="mis. LIVESTOCK-0001"
            className="flex-1 h-12 rounded-xl border border-slate-300 px-3 text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-100 outline-none"
          />
          <button
            data-testid="manual-id-submit"
            onClick={onManualSubmit}
            className="h-12 px-4 rounded-xl bg-slate-800 text-white font-semibold text-sm active:bg-slate-700"
          >
            Cari
          </button>
        </div>
      </div>
    </div>
  );
}
