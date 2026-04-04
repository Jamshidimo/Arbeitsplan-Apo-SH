import { useState } from 'react';
import { Lock, Calendar } from 'lucide-react';

const APP_PIN = '2025'; // Change this to your pharmacy's PIN

interface Props {
  onUnlock: () => void;
}

export default function PinScreen({ onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === APP_PIN) {
      sessionStorage.setItem('apoplan_unlocked', 'true');
      onUnlock();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-emerald-500 rounded-xl p-3">
            <Calendar size={32} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">ApoPlan</h1>
        <p className="text-sm text-slate-500 mb-6">Apotheke Steinhölzli</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="PIN eingeben"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoFocus
              className={`w-full pl-10 pr-4 py-3 text-center text-lg tracking-[0.3em] border-2 rounded-xl focus:outline-none transition ${
                error
                  ? 'border-red-400 bg-red-50 animate-shake'
                  : 'border-slate-300 focus:border-emerald-500'
              }`}
            />
          </div>
          {error && <p className="text-sm text-red-500">Falscher PIN</p>}
          <button type="submit"
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 transition">
            Entsperren
          </button>
        </form>
      </div>
    </div>
  );
}
