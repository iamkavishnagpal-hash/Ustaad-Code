import React, { useState } from 'react';
import { Keyboard, Check, AlertCircle } from 'lucide-react';

interface HotkeyInputProps {
  value: string;
  onChange: (hotkey: string) => void;
  error?: string;
}

export const HotkeyInput: React.FC<HotkeyInputProps> = ({ value, onChange, error }) => {
  const [recording, setRecording] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore standalone modifier presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Win');

    let key = e.key.toUpperCase();
    if (key === ' ') key = 'Space';
    parts.push(key);

    const shortcutStr = parts.join('+');
    onChange(shortcutStr);
    setRecording(false);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider">
        Global Activation Hotkey
      </label>
      <div className="relative">
        <input
          type="text"
          readOnly
          value={recording ? 'Press shortcut keys on your keyboard...' : value || 'None (Click to record)'}
          onFocus={() => setRecording(true)}
          onBlur={() => setRecording(false)}
          onKeyDown={recording ? handleKeyDown : undefined}
          className={`w-full bg-[#0E1422] border rounded-lg px-3.5 py-2.5 text-sm font-mono cursor-pointer transition-colors focus:outline-none ${
            recording
              ? 'border-accent ring-2 ring-accent/30 text-accent font-semibold'
              : error
              ? 'border-danger/50 text-textPrimary'
              : 'border-surfaceBorder hover:border-slate-600 text-textPrimary'
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-textMuted">
          <Keyboard size={16} />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-danger flex items-center gap-1.5 mt-1">
          <AlertCircle size={13} /> {error}
        </p>
      ) : (
        <p className="text-xs text-textMuted">
          Keystroke is captured globally anywhere across Windows when application is running.
        </p>
      )}
    </div>
  );
};
