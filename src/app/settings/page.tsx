'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Navbar from '@/components/shared/Navbar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTripStore } from '@/store/useTripStore';
import type { TripPreferences } from '@/types';

const settingsSections = [
  { id: 'profile', label: 'OPERATOR' },
  { id: 'preferences', label: 'FLIGHT PREFS' },
  { id: 'notifications', label: 'ALERTS' },
  { id: 'appearance', label: 'DISPLAY' },
  { id: 'map', label: 'NAV aids' },
  { id: 'privacy', label: 'SECURITY' },
];

const fallbackPreferences: TripPreferences = {
  destinationIdea: '',
  startDate: '',
  endDate: '',
  duration: 5,
  budget: 50000,
  currency: 'INR',
  travelers: 1,
  tripType: 'relaxed',
  pace: 'balanced',
  foodPreferences: ['Vegetarian'],
  transportPreference: 'mixed',
  climatePreference: 'any',
  accessibilityNeeds: [],
  companions: [],
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [darkMode, setDarkMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState(() => 'Traveler');
  const [profileEmail, setProfileEmail] = useState(() => 'guest@zentrip.local');
  const [preferences, setPreferences] = useState<TripPreferences>(() => {
    const store = useTripStore.getState();
    return Object.keys(store.userPreferences).length > 0
      ? { ...fallbackPreferences, ...store.userPreferences }
      : fallbackPreferences;
  });
  const { updateUserPreferences } = useTripStore();

  const handleSave = async () => {
    try {
      setSaving(true);
      updateUserPreferences(preferences);
      toast.success('Configuration committed');
    } finally {
      setSaving(false);
    }
  };

  const updatePref = <K extends keyof TripPreferences>(key: K, value: TripPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFood = (value: string) => {
    setPreferences((prev) => {
      const current = prev.foodPreferences || [];
      return {
        ...prev,
        foodPreferences: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const selectClass = 'h-10 w-full rounded-none bg-[#0D1210] border border-[rgba(124,252,154,0.14)] px-3 font-mono text-xs text-[#D7E4DC] focus:outline-none focus:border-[#7CFC9A]/50';
  const inputClass = 'h-10 bg-[#0D1210] border-[rgba(124,252,154,0.14)] text-[#D7E4DC] rounded-none font-mono text-xs focus:border-[#7CFC9A]/50';
  const labelClass = 'block text-[9px] tracking-[0.25em] text-[#82958A] mb-1.5 font-mono';

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-20 font-mono">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <div className="text-[10px] tracking-[0.25em] text-[#82958A] mb-1">ZENTRIP OPS / SYSTEM CONFIG</div>
              <h1 className="text-2xl font-bold text-[#D7E4DC] tracking-[0.1em]">CONFIG CONSOLE</h1>
            </div>
            <Button onClick={handleSave} disabled={saving}
              className="bg-[#7CFC9A] text-[#07100B] hover:bg-[#7CFC9A]/85 font-mono text-xs tracking-[0.15em] h-10 px-5 rounded-none shadow-glow">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              COMMIT ▸
            </Button>
          </div>
        </motion.div>

        <div className="flex gap-6 flex-col md:flex-row">
          {/* Section rail */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="md:w-56 shrink-0">
            <div className="hud-corner py-2">
              {settingsSections.map((section, i) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-[10px] tracking-[0.2em] transition-all text-left',
                    activeSection === section.id
                      ? 'bg-[#7CFC9A]/10 text-[#7CFC9A] border-l-2 border-[#7CFC9A]'
                      : 'text-[#82958A] hover:text-[#D7E4DC] border-l-2 border-transparent'
                  )}
                >
                  <span className="text-[9px] text-[#6E7F74]">{String(i + 1).padStart(2, '0')}</span>
                  {section.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Panel */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
            <div className="hud-corner p-6 space-y-6">

              {activeSection === 'profile' && (
                <>
                  <div className="text-[9px] tracking-[0.25em] text-[#82958A] border-b border-[rgba(124,252,154,0.12)] pb-2">
                    01 / OPERATOR RECORD
                  </div>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className={labelClass}>CALLSIGN</label>
                      <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>EMAIL FREQUENCY</label>
                      <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className={inputClass} />
                    </div>
                    <p className="text-[9px] tracking-[0.1em] text-[#6E7F74] leading-relaxed">
                      STORED IN THIS BROWSER. NO CLOUD COPY.
                    </p>
                  </div>
                </>
              )}

              {activeSection === 'preferences' && (
                <>
                  <div className="border-b border-[rgba(124,252,154,0.12)] pb-2">
                    <span className="text-[9px] tracking-[0.25em] text-[#82958A]">02 / FLIGHT PREFS</span>
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                      <div>
                        <label className={labelClass}>PACE</label>
                        <select value={preferences.pace} onChange={(e) => updatePref('pace', e.target.value as TripPreferences['pace'])} className={selectClass}>
                          <option value="relaxed">RELAXED</option>
                          <option value="balanced">BALANCED</option>
                          <option value="packed">PACKED</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>BUDGET (₹)</label>
                        <Input value={`₹${preferences.budget}`} onChange={(e) => updatePref('budget', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>TRANSIT MODE</label>
                        <select value={preferences.transportPreference} onChange={(e) => updatePref('transportPreference', e.target.value as TripPreferences['transportPreference'])} className={selectClass}>
                          <option value="flight">FLIGHT</option>
                          <option value="train">TRAIN</option>
                          <option value="bus">BUS</option>
                          <option value="car">CAR</option>
                          <option value="mixed">MIXED</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>MISSION TYPE</label>
                        <select value={preferences.tripType} onChange={(e) => updatePref('tripType', e.target.value as TripPreferences['tripType'])} className={selectClass}>
                          {['relaxed', 'adventurous', 'romantic', 'family', 'solo', 'workcation', 'spiritual', 'luxury', 'budget', 'cultural'].map((option) => (
                            <option key={option} value={option}>{option.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] tracking-[0.25em] text-[#82958A] mb-2">FOOD PREFERENCES</div>
                      <div className="flex flex-wrap gap-2">
                        {['Vegetarian', 'Vegan', 'Halal', 'Seafood', 'Local Cuisine', 'Fine Dining', 'Street Food', 'Kosher'].map((food) => (
                          <button
                            key={food}
                            onClick={() => toggleFood(food)}
                            className={cn(
                              'px-3 py-1.5 text-[10px] tracking-[0.1em] border transition-all',
                              preferences.foodPreferences.includes(food)
                                ? 'border-[#7CFC9A]/50 bg-[#7CFC9A]/10 text-[#7CFC9A]'
                                : 'border-[rgba(124,252,154,0.14)] text-[#82958A] hover:text-[#D7E4DC] hover:border-[rgba(124,252,154,0.3)]'
                            )}
                          >
                            {food.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'notifications' && (
                <>
                  <div className="text-[9px] tracking-[0.25em] text-[#82958A] border-b border-[rgba(124,252,154,0.12)] pb-2">
                    03 / ALERT CHANNELS
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'PLAN UPDATES', desc: 'Ping when the ops board revises your plan' },
                      { label: 'WX ALERTS', desc: 'Weather shifts that affect the itinerary' },
                      { label: 'DEALS', desc: 'Fuel-price drops on routes you watch' },
                      { label: 'WEEKLY BRIEF', desc: 'Destinations worth a filing' },
                    ].map((notif, i) => (
                      <div key={i} className="flex items-center justify-between border border-[rgba(124,252,154,0.1)] px-4 py-3">
                        <div>
                          <div className="text-xs text-[#D7E4DC] tracking-[0.1em]">{notif.label}</div>
                          <div className="text-[10px] text-[#82958A] mt-0.5">{notif.desc}</div>
                        </div>
                        <Switch defaultChecked={i < 2} className="data-[state=checked]:bg-[#7CFC9A]" />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeSection === 'appearance' && (
                <>
                  <div className="text-[9px] tracking-[0.25em] text-[#82958A] border-b border-[rgba(124,252,154,0.12)] pb-2">
                    04 / DISPLAY
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border border-[rgba(124,252,154,0.1)] px-4 py-3">
                      <div>
                        <div className="text-xs text-[#D7E4DC] tracking-[0.1em]">NIGHT RADAR MODE</div>
                        <div className="text-[10px] text-[#82958A] mt-0.5">Mission-control phosphor display</div>
                      </div>
                      <Switch checked={darkMode} onCheckedChange={setDarkMode} className="data-[state=checked]:bg-[#7CFC9A]" />
                    </div>
                    <div className="border border-dashed border-[rgba(124,252,154,0.14)] px-4 py-3 text-[10px] text-[#82958A] leading-relaxed">
                      THE OPS ROOM RUNS DARK. A DAY-MODE PAPER CHART THEME IS ON THE DRAWING BOARD.
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'map' && (
                <>
                  <div className="text-[9px] tracking-[0.25em] text-[#82958A] border-b border-[rgba(124,252,154,0.12)] pb-2">
                    05 / NAV AIDS
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'TILE PROVIDER', value: 'CARTODB DARK' },
                      { label: 'DEFAULT ZOOM', value: 'CITY (12)' },
                      { label: 'CHART STYLE', value: 'PHOSPHOR' },
                      { label: 'TRAFFIC OVERLAY', value: 'OFF' },
                      { label: 'UNITS', value: 'KILOMETERS' },
                    ].map((setting, i) => (
                      <div key={i} className="flex items-center justify-between border border-[rgba(124,252,154,0.1)] px-4 py-3">
                        <span className="text-xs text-[#D7E4DC] tracking-[0.1em]">{setting.label}</span>
                        <span className="text-[10px] text-[#82958A] tracking-[0.15em]">{setting.value}</span>
                      </div>
                    ))}
                    <div className="border border-dashed border-[rgba(124,252,154,0.14)] px-4 py-3 text-[10px] text-[#82958A] leading-relaxed">
                      NAV-aid provider settings ready for future map-script wiring.
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'privacy' && (
                <>
                  <div className="text-[9px] tracking-[0.25em] text-[#82958A] border-b border-[rgba(124,252,154,0.12)] pb-2">
                    06 / SECURITY
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'SHARE TELEMETRY', desc: 'Let anonymized plans improve agent suggestions' },
                      { label: 'PUBLIC MANIFEST', desc: 'Make your crew record visible to other operators' },
                      { label: 'TWO-FACTOR AUTH', desc: 'Extra clearance layer on login' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between border border-[rgba(124,252,154,0.1)] px-4 py-3">
                        <div>
                          <div className="text-xs text-[#D7E4DC] tracking-[0.1em]">{item.label}</div>
                          <div className="text-[10px] text-[#82958A] mt-0.5">{item.desc}</div>
                        </div>
                        <Switch defaultChecked={!i} className="data-[state=checked]:bg-[#7CFC9A]" />
                      </div>
                    ))}
                    <div className="border border-dashed border-[rgba(124,252,154,0.14)] px-4 py-3 text-[10px] text-[#6E7F74] leading-relaxed">
                      ALL TRIP DATA RESIDES IN THIS BROWSER. NOTHING LEAVES THE TERMINAL EXCEPT AGENT REQUESTS.
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
