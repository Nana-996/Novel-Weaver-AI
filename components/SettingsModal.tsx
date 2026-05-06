import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Settings, ExportFormat } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [local, setLocal] = useState<Settings>(settings);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocal(settings);
      setApiKey(localStorage.getItem('novel-weaver-gemini-key') || '');
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    // Save API key to localStorage
    if (apiKey.trim()) {
      localStorage.setItem('novel-weaver-gemini-key', apiKey.trim());
    } else {
      localStorage.removeItem('novel-weaver-gemini-key');
    }
    onSave(local);
  };

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
        {/* API Key — most important, shown first */}
        <Section title="API Key">
          <div>
            <Label
              text="API Key"
              hint="Works with Agent Router or Google AI Studio keys."
            />
            <div className="flex gap-2 mt-1.5">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Paste your API key here..."
                  className="w-full bg-ink-200 border border-ink-400/30 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold/30 transition-colors pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-parchment-faint hover:text-parchment-dim transition-colors px-1.5 py-0.5 rounded"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-gold hover:text-gold-light transition-colors underline underline-offset-2"
            >
              Get your free API key from Google AI Studio or Agent Router →
            </a>
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

        {/* AI Model */}
        <Section title="AI Model">
          <div>
            <Label text="Writing Partner" hint="All models are free. Flash is recommended for writing." />
            <select
              value={local.ai.model}
              onChange={e => setLocal(s => ({ ...s, ai: { ...s.ai, model: e.target.value } }))}
              className="mt-1.5 w-full bg-ink-200 border border-ink-400/30 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold/30 transition-colors appearance-none"
            >
              <option value="claude-opus-4-6">🧠 Claude Opus 4.6 — Advanced Model</option>
              <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash — Fast & capable (recommended)</option>
              <option value="gemini-2.0-flash-lite">🪶 Gemini 2.0 Flash Lite — Lightweight & quick</option>
              <option value="gemini-1.5-flash">⚡ Gemini 1.5 Flash — Reliable workhorse</option>
              <option value="gemini-1.5-pro">🧠 Gemini 1.5 Pro — Most capable (lower limits)</option>
            </select>
          </div>

          {/* Advanced sliders */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-parchment-faint hover:text-parchment-dim transition-colors select-none">
              Advanced AI Tuning ▸
            </summary>
            <div className="mt-3 space-y-4 pl-2 border-l border-ink-400/20">
              {[
                { label: 'Temperature (Creativity)', value: local.ai.temperature, min: 0, max: 1, step: 0.05, key: 'temperature' as const },
                { label: 'Top-K (Response Diversity)', value: local.ai.topK, min: 1, max: 100, step: 1, key: 'topK' as const },
                { label: 'Top-P (Text Creativity)', value: local.ai.topP, min: 0, max: 1, step: 0.01, key: 'topP' as const },
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
          </details>
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