import React, { useState } from 'react';
import type { StoryNotes } from '../types';
import { LightbulbIcon, UsersIcon, ListBulletIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, DocumentIcon } from './Icons';

interface StoryPanelProps {
    notes: StoryNotes;
    onNotesChange: (field: keyof StoryNotes, value: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    wordCount: number;
    hasMessages: boolean;
}

type Section = 'idea' | 'characters' | 'plot' | 'outline';

const sectionConfig: { key: Section; label: string; icon: React.ReactNode; placeholder: string; emptyHint: string }[] = [
    {
        key: 'idea',
        label: 'Idea',
        icon: <LightbulbIcon className="w-3.5 h-3.5" />,
        placeholder: 'The core premise of your novel...\n\nJot this down as you develop it with the AI.',
        emptyHint: 'Talk to the AI, then capture your core idea here.',
    },
    {
        key: 'characters',
        label: 'Characters',
        icon: <UsersIcon className="w-3.5 h-3.5" />,
        placeholder: 'Main characters — names, traits, motivations, relationships...',
        emptyHint: 'Track your characters as the story develops.',
    },
    {
        key: 'plot',
        label: 'Plot',
        icon: <DocumentIcon className="w-3.5 h-3.5" />,
        placeholder: 'The main story arc — beginning, middle, end...',
        emptyHint: 'Build your plot here — the AI uses this to write consistently.',
    },
    {
        key: 'outline',
        label: 'Outline',
        icon: <ListBulletIcon className="w-3.5 h-3.5" />,
        placeholder: 'Chapter-by-chapter plan...\n\nChapter 1: ...\nChapter 2: ...',
        emptyHint: 'Plan chapters here — the AI writes from this roadmap.',
    },
];

const StoryPanel: React.FC<StoryPanelProps> = ({ notes, onNotesChange, isOpen, onToggle, wordCount, hasMessages }) => {
    const [activeSection, setActiveSection] = useState<Section>('idea');
    const activeConfig = sectionConfig.find(s => s.key === activeSection)!;
    const filledSections = sectionConfig.filter(s => notes[s.key]?.trim()).length;

    // Collapsed — show toggle on right edge
    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                className="hidden md:flex flex-col items-center justify-center w-10 border-l border-ink-400/12 hover:bg-ink-200/30 transition-colors group"
                title="Story Memory"
            >
                <ChevronLeftIcon className="w-3.5 h-3.5 text-parchment-faint group-hover:text-warm transition-colors" />
                <span
                    className="mt-2 text-[9px] text-parchment-faint/60 group-hover:text-parchment-dim tracking-widest uppercase font-medium transition-colors"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                    Memory
                </span>
                {filledSections > 0 && (
                    <span className="mt-2 w-4 h-4 rounded-full bg-warm/10 text-warm text-[9px] flex items-center justify-center font-bold">
                        {filledSections}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="hidden md:flex w-72 lg:w-80 flex-col border-l border-ink-400/12 bg-ink-50/30 animate-slide-left">
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ink-400/12">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-warm/8 flex items-center justify-center">
                        <SparklesIcon className="w-3 h-3 text-warm/70" />
                    </div>
                    <span className="text-xs font-medium text-parchment-dim tracking-tight">Story Memory</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                        {sectionConfig.map((s) => (
                            <div
                                key={s.key}
                                className={`w-1 h-1 rounded-full transition-colors ${notes[s.key]?.trim() ? 'bg-sage' : 'bg-ink-400/20'}`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={onToggle}
                        className="p-1 rounded-md hover:bg-ink-300/40 text-parchment-faint hover:text-parchment-dim transition-colors"
                    >
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Section tabs — compact, inline */}
            <div className="flex border-b border-ink-400/10 px-1">
                {sectionConfig.map((section) => {
                    const hasContent = notes[section.key]?.trim();
                    return (
                        <button
                            key={section.key}
                            onClick={() => setActiveSection(section.key)}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-all relative ${
                                activeSection === section.key
                                    ? 'text-warm'
                                    : hasContent
                                        ? 'text-sage/80 hover:text-sage'
                                        : 'text-parchment-faint/50 hover:text-parchment-dim'
                            }`}
                        >
                            {section.icon}
                            <span className="hidden lg:inline">{section.label}</span>
                            {activeSection === section.key && (
                                <div className="absolute bottom-0 left-2 right-2 h-px bg-warm/50" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 p-3">
                {notes[activeSection]?.trim() || hasMessages ? (
                    <>
                        <label className="text-[10px] text-parchment-faint/60 font-medium mb-1.5 flex items-center gap-1.5">
                            {activeConfig.icon}
                            {activeConfig.label}
                            {notes[activeSection]?.trim() && (
                                <span className="ml-auto text-sage/50">✓</span>
                            )}
                        </label>
                        <textarea
                            value={notes[activeSection] || ''}
                            onChange={(e) => onNotesChange(activeSection, e.target.value)}
                            placeholder={activeConfig.placeholder}
                            className="flex-1 w-full bg-ink-100/30 border border-ink-400/8 rounded-lg p-3 resize-none focus:outline-none focus:border-warm/20 text-parchment/80 placeholder:text-parchment-faint/25 text-xs leading-relaxed font-serif scrollbar-thin transition-all"
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-8 h-8 rounded-lg bg-ink-200/30 flex items-center justify-center mb-2">
                            {activeConfig.icon}
                        </div>
                        <p className="text-[11px] text-parchment-faint/40 leading-relaxed">
                            {activeConfig.emptyHint}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-ink-400/8">
                <p className="text-[10px] text-parchment-faint/30 leading-relaxed">
                    The AI uses these notes to write chapters that stay true to your story.
                </p>
            </div>
        </div>
    );
};

export default StoryPanel;
