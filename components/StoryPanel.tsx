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
    isExtracting?: boolean;
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

const StoryPanel: React.FC<StoryPanelProps> = ({ notes, onNotesChange, isOpen, onToggle, wordCount, hasMessages, isExtracting }) => {
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
                {isExtracting && (
                    <span className="mt-2 w-4 h-4 rounded-full bg-sage/20 flex items-center justify-center animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-sage/60" />
                    </span>
                )}
            </button>
        );
    }

    return (
        <>
            {/* Mobile Backdrop */}
            <div 
                className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in" 
                onClick={onToggle}
            />

            <div 
                className="fixed inset-y-0 right-0 z-40 md:relative flex w-full sm:w-80 md:w-72 lg:w-80 flex-col border-l border-ink-400/12 bg-ink md:bg-ink-50/30 shadow-2xl md:shadow-none animate-slide-left"
                style={{
                    paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
                    paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 md:px-3.5 md:py-2.5 border-b border-ink-400/12">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 md:w-5 md:h-5 rounded-md bg-warm/10 flex items-center justify-center">
                            <SparklesIcon className="w-3.5 h-3.5 md:w-3 md:h-3 text-warm" />
                        </div>
                        <span className="text-sm md:text-xs font-semibold md:font-medium text-parchment-dim tracking-tight">Story Memory</span>
                        {isExtracting && (
                            <span className="flex items-center gap-1 text-[10px] text-sage/80 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
                                Syncing…
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {sectionConfig.map((s) => (
                                <div
                                    key={s.key}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${notes[s.key]?.trim() ? 'bg-sage' : 'bg-ink-400/20'}`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-1.5 rounded-lg hover:bg-ink-300/40 text-parchment-faint hover:text-parchment transition-colors"
                            title="Close Memory Panel"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Section tabs — clean, touch-friendly */}
                <div className="flex border-b border-ink-400/10 px-2 py-1 gap-1 overflow-x-auto no-scrollbar">
                    {sectionConfig.map((section) => {
                        const hasContent = notes[section.key]?.trim();
                        return (
                            <button
                                key={section.key}
                                onClick={() => setActiveSection(section.key)}
                                className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all relative ${
                                    activeSection === section.key
                                        ? 'text-warm bg-warm/10 font-semibold'
                                        : hasContent
                                            ? 'text-sage/90 hover:text-sage hover:bg-ink-200/40'
                                            : 'text-parchment-faint/60 hover:text-parchment-dim hover:bg-ink-200/20'
                                }`}
                            >
                                {section.icon}
                                <span>{section.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4">
                    {notes[activeSection]?.trim() || hasMessages ? (
                        <>
                            <label className="text-xs text-parchment-faint font-medium mb-1.5 flex items-center gap-1.5">
                                {activeConfig.icon}
                                <span>{activeConfig.label}</span>
                                {notes[activeSection]?.trim() && (
                                    <span className="ml-auto text-sage font-bold text-xs">✓ captured</span>
                                )}
                            </label>
                            <textarea
                                value={notes[activeSection] || ''}
                                onChange={(e) => onNotesChange(activeSection, e.target.value)}
                                placeholder={activeConfig.placeholder}
                                className="flex-1 w-full bg-ink-100/40 border border-ink-400/10 rounded-xl p-3.5 resize-none focus:outline-none focus:border-warm/30 text-parchment/90 placeholder:text-parchment-faint/25 text-xs sm:text-sm leading-relaxed font-serif scrollbar-thin transition-all"
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-10 h-10 rounded-xl bg-ink-200/40 flex items-center justify-center mb-2.5 text-warm/70">
                                {activeConfig.icon}
                            </div>
                            <p className="text-xs text-parchment-faint/60 leading-relaxed max-w-xs">
                                {activeConfig.emptyHint}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2.5 border-t border-ink-400/8 bg-ink-100/20">
                    <p className="text-[11px] text-parchment-faint/40 leading-relaxed">
                        {isExtracting
                            ? '✨ Extracting story details from your conversation…'
                            : 'The AI reads these notes before every response to stay consistent with your story.'
                        }
                    </p>
                </div>
            </div>
        </>
    );
};

export default StoryPanel;
