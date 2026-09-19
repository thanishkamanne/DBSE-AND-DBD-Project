import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Shield,
  Car,
  Moon,
  Home,
  CheckCircle2
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';

export function SafetyChecklistModal({ isOpen, onClose }) {
  const [activeCategory, setActiveCategory] = useState('transit');
  const [checkedItems, setCheckedItems] = useState({});

  const categories = [
    { id: 'transit', label: 'Rideshare & Taxi', icon: Car },
    { id: 'night', label: 'Night Walk', icon: Moon },
    { id: 'home', label: 'Solo Living', icon: Home },
  ];

  const checklistData = {
    transit: [
      { id: 't1', text: 'Verify vehicle license plate against app record before boarding' },
      { id: 't2', text: 'Ask driver "Who are you picking up?" to confirm your name' },
      { id: 't3', text: 'Check child locks on back door are disengaged' },
      { id: 't4', text: 'Turn on real-time location sharing with primary trusted contact' },
      { id: 't5', text: 'Sit in the back seat on passenger side for maximum visibility and exit room' },
    ],
    night: [
      { id: 'n1', text: 'Keep smartphone in hand with Quick Exit or Secret SOS primed' },
      { id: 'n2', text: 'Avoid wearing headphones in both ears — maintain situational awareness' },
      { id: 'n3', text: 'Start a 15-minute Safety Timer before entering isolated streets' },
      { id: 'n4', text: 'Stick to well-lit commercial transit corridors over dark shortcuts' },
      { id: 'n5', text: 'Note nearest 24/7 safe havens (police stations, open pharmacies)' },
    ],
    home: [
      { id: 'h1', text: 'Ensure deadbolts and window locks are checked at dusk' },
      { id: 'h2', text: 'Keep emergency contact speed dials configured on device' },
      { id: 'h3', text: 'Test personal siren alert sound once a month' },
      { id: 'h4', text: 'Keep high-output flashlight and emergency kit near doorway' },
    ],
  };

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentList = checklistData[activeCategory] || [];
  const completedCount = currentList.filter((item) => checkedItems[item.id]).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Safety Protocols & Checklist"
      description="Field-tested actionable steps and precautions for high-risk scenarios."
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Category Selector Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Progress Counter */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700">
            Checklist Items ({completedCount} / {currentList.length})
          </span>
          {completedCount === currentList.length && currentList.length > 0 && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All Verified
            </span>
          )}
        </div>

        {/* Checklist items */}
        <div className="space-y-2">
          {currentList.map((item) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleCheck(item.id)}
                className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-slate-300 text-transparent'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-slate-400' : 'font-medium'}`}>
                  {item.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
