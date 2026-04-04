import type { DayConfig } from '../types';
import { DAY_NAMES_LONG } from '../constants';

interface Props {
  configs: DayConfig[];
  onChange: (configs: DayConfig[]) => void;
}

export default function DayConfigManager({ configs, onChange }: Props) {
  function update(dayOfWeek: number, patch: Partial<DayConfig>) {
    onChange(configs.map(c => c.dayOfWeek === dayOfWeek ? { ...c, ...patch } : c));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Soll-Vorgaben pro Wochentag</h2>
      <div className="grid gap-3">
        {configs.map(config => (
          <div key={config.dayOfWeek} className={`bg-white rounded-lg shadow-sm border border-slate-200 p-4 transition ${!config.isOpen ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-700">{DAY_NAMES_LONG[config.dayOfWeek]}</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={config.isOpen}
                  onChange={e => update(config.dayOfWeek, { isOpen: e.target.checked })}
                  className="accent-emerald-500" />
                Geoeffnet
              </label>
            </div>
            {config.isOpen && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Oeffnung</label>
                  <input type="time" value={config.openTime}
                    onChange={e => update(config.dayOfWeek, { openTime: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Schliessung</label>
                  <input type="time" value={config.closeTime}
                    onChange={e => update(config.dayOfWeek, { closeTime: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min. Apotheker</label>
                  <input type="number" min={0} max={10} value={config.minApotheker}
                    onChange={e => update(config.dayOfWeek, { minApotheker: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min. Assistenten</label>
                  <input type="number" min={0} max={10} value={config.minAssistent}
                    onChange={e => update(config.dayOfWeek, { minAssistent: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
