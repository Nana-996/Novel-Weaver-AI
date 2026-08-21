import React, { useState } from 'react';
import type { Project } from '../types';
import { XIcon, DownloadIcon, BookOpenIcon } from './Icons';

interface ManuscriptOverlayProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    onExport: () => void;
}

const ManuscriptOverlay: React.FC<ManuscriptOverlayProps> = ({ project, isOpen, onClose, onExport }) => {
    const [copyText, setCopyText] = useState('Copy All');

    if (!isOpen) return null;

    const handleCopy = () => {
        const text = project.manuscript.map(c => `${c.title}\n\n${c.content}`).join('\n\n---\n\n');
        navigator.clipboard.writeText(text).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy All'), 2000);
        });
    };

    const isEmpty = project.manuscript.length === 0;

    return (
        <div className="fixed inset-0 z-50 overlay-enter" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-ink/90" />

            {/* Content */}
            <div
                className="absolute inset-0 overflow-y-auto scrollbar-thin overlay-content-enter"
                onClick={e => e.stopPropagation()}
            >
                {/* Top bar */}
                <div 
                    className="sticky top-0 z-10 glass border-b border-ink-400/30"
                    style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
                >
                    <div className="max-w-4xl mx-auto flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <BookOpenIcon className="w-5 h-5 text-gold flex-shrink-0" />
                            <div className="min-w-0">
                                <h2 className="font-display text-sm sm:text-lg text-warm-gradient font-semibold truncate">Manuscript</h2>
                                <span className="text-[10px] sm:text-xs text-parchment-faint block sm:inline truncate">
                                    {project.wordCount.toLocaleString()} words · {project.manuscript.length} ch
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                                onClick={handleCopy}
                                disabled={isEmpty}
                                className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-ink-300/50 hover:bg-ink-400/50 text-parchment-dim hover:text-parchment disabled:opacity-30 transition-colors"
                            >
                                {copyText}
                            </button>
                            <button
                                onClick={onExport}
                                disabled={isEmpty}
                                className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 disabled:opacity-30 transition-colors flex items-center gap-1"
                            >
                                <DownloadIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                                <span>Export</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-1.5 sm:p-2 rounded-xl hover:bg-ink-300/50 text-parchment-dim hover:text-parchment transition-colors ml-1"
                                title="Close Manuscript"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Manuscript Content */}
                <div 
                    className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-12"
                    style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
                >
                    {isEmpty ? (
                        <div className="text-center py-16 sm:py-20 px-4">
                            <BookOpenIcon className="w-12 h-12 sm:w-16 sm:h-16 text-parchment-faint/30 mx-auto mb-4" />
                            <h3 className="text-lg sm:text-xl font-display text-parchment-dim mb-2">Your story will live here</h3>
                            <p className="text-parchment-faint text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                                As we write chapters together in conversation, they'll appear here beautifully formatted and ready to read. ✨
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-10 sm:space-y-16">
                            {/* Title page */}
                            <div className="text-center pb-8 sm:pb-12 border-b border-ink-400/20">
                                <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-semibold text-gold-gradient mb-3 sm:mb-4 px-2">
                                    {project.title}
                                </h1>
                                <p className="text-parchment-dim text-xs sm:text-sm">
                                    {project.wordCount.toLocaleString()} words · {project.manuscript.length} chapters
                                </p>
                            </div>

                            {/* Chapters */}
                            {project.manuscript.map((chapter, index) => (
                                <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                    <h2 className="text-xl sm:text-2xl md:text-3xl font-display text-warm/80 mb-4 sm:mb-6 pb-2.5 sm:pb-3 border-b border-warm/10">
                                        {chapter.title}
                                    </h2>
                                    <div className="font-serif text-parchment/85 leading-[1.85] text-sm sm:text-base whitespace-pre-wrap">
                                        {chapter.content}
                                    </div>
                                </div>
                            ))}

                            {/* End mark */}
                            <div className="text-center py-8">
                                <span className="text-warm/30 text-2xl font-display">✦</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManuscriptOverlay;
