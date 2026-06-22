import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Settings, ExportFormat } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">{title}</h3>
    {children}
  </div>
);

const Label = ({ text, hint }: { text: string; hint?: string }) => (
  <div>
    <label className="block text-sm font-medium text-parchment">{text}</label>
    {hint && <p className="text-xs text-parchment-faint mt-0.5">{hint}</p>}
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [local, setLocal] = useState<Settings>(settings);

  useEffect(() => {
    if (isOpen) {
      setLocal(settings);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onSave(local);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-ink-300 hover:bg-ink-400 text-parchment-dim transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gold hover:bg-gold-light text-ink font-medium transition-colors text-sm">Save</button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* AI Engine Info */}
        <Section title="AI Engine">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-ink-200/50 border border-gold/10">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🚀</span>
                <span className="text-sm font-medium text-parchment">NVIDIA Nemotron 120B</span>
              </div>
              <p className="text-xs text-parchment-faint leading-relaxed">
                Powered by <strong className="text-parchment-dim">NVIDIA Nemotron 3 Super 120B</strong> — a powerful cloud AI model.
                Your API calls are securely proxied through our server. Just start writing.
              </p>
            </div>
            <p className="text-xs text-parchment-faint">✅ Cloud AI is ready to use</p>
          </div>
        </Section>

        {/* Writing Preferences */}
        <Section title="Writing Preferences">
          <div className="space-y-3">
            <div>
              <Label text="Writing Style" hint="How should the AI write?" />
              <input
                type="text"
                value={local.ai.writingStyle}
                onChange={e => setLocal(s => ({ ...s, ai: { ...s.ai, writingStyle: e.target.value } }))}
                placeholder="e.g., Fast-paced and dialogue-heavy"
                className="mt-1.5 w-full bg-ink-200 border border-ink-400/30 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
            <div>
              <Label text="Tone Preference" hint="What mood should the story have?" />
              <input
                type="text"
                value={local.ai.tonePreference}
                onChange={e => setLocal(s => ({ ...s, ai: { ...s.ai, tonePreference: e.target.value } }))}
                placeholder="e.g., Dark and gritty with moments of humor"
                className="mt-1.5 w-full bg-ink-200 border border-ink-400/30 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
            <div>
              <Label text="Chapter Length (words)" />
              <input
                type="number"
                value={local.ai.defaultChapterLength}
                onChange={e => setLocal(s => ({ ...s, ai: { ...s.ai, defaultChapterLength: parseInt(e.target.value, 10) || 1500 } }))}
                step="100"
                className="mt-1.5 w-32 bg-ink-200 border border-ink-400/30 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>
          </div>
        </Section>

        {/* Advanced sliders */}
        <Section title="Advanced AI Tuning">
          <div className="space-y-4">
            {[
              { label: 'Temperature (Creativity)', value: local.ai.temperature, min: 0, max: 1, step: 0.05, key: 'temperature' as const },
              { label: 'Top-P (Text Diversity)', value: local.ai.topP, min: 0, max: 1, step: 0.01, key: 'topP' as const },
            ].map(slider => (
              <div key={slider.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-parchment-dim">{slider.label}</span>
                  <span className="text-parchment-faint">{slider.value}</span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={slider.value}
                  onChange={e => setLocal(s => ({ ...s, ai: { ...s.ai, [slider.key]: parseFloat(e.target.value) } }))}
                  className="w-full h-1.5 bg-ink-400 rounded-full appearance-none cursor-pointer accent-gold"
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Export */}
        <Section title="Export">
          <div>
            <Label text="Default Format" />
            <select
              value={local.export.defaultFormat}
              onChange={e => setLocal(s => ({ ...s, export: { ...s.export, defaultFormat: e.target.value as ExportFormat } }))}
              className="mt-1.5 w-40 bg-ink-200 border border-ink-400/30 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold/30 transition-colors appearance-none"
            >
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="txt">TXT</option>
            </select>
          </div>
        </Section>
      </div>
    </Modal>
  );
};

export default SettingsModal;