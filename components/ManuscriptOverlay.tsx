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
                <div className="sticky top-0 z-10 glass border-b border-ink-400/30">
                    <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <BookOpenIcon className="w-5 h-5 text-gold" />
                            <h2 className="font-display text-lg text-warm-gradient">Your Manuscript</h2>
                            <span className="text-xs text-parchment-faint bg-ink-300/50 px-2 py-0.5 rounded-full">
                                {project.wordCount} words · {project.manuscript.length} chapters
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                disabled={isEmpty}
                                className="px-3 py-1.5 text-sm rounded-lg bg-ink-300/50 hover:bg-ink-400/50 text-parchment-dim hover:text-parchment disabled:opacity-30 transition-colors"
                            >
                                {copyText}
                            </button>
                            <button
                                onClick={onExport}
                                disabled={isEmpty}
                                className="px-3 py-1.5 text-sm rounded-lg bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 disabled:opacity-30 transition-colors flex items-center gap-1.5"
                            >
                                <DownloadIcon className="w-4 h-4" /> Export
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-ink-300/50 text-parchment-dim hover:text-parchment transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Manuscript Content */}
                <div className="max-w-3xl mx-auto px-6 py-12">
                    {isEmpty ? (
                        <div className="text-center py-20">
                            <BookOpenIcon className="w-16 h-16 text-parchment-faint/30 mx-auto mb-4" />
                            <h3 className="text-xl font-display text-parchment-dim mb-2">Your story will live here</h3>
                            <p className="text-parchment-faint text-sm max-w-md mx-auto">
                                As we write chapters together in conversation, they'll appear here beautifully formatted and ready to read. ✨
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-16">
                            {/* Title page */}
                            <div className="text-center pb-12 border-b border-ink-400/20">
                                <h1 className="text-4xl md:text-5xl font-display font-semibold text-gold-gradient mb-4">
                                    {project.title}
                                </h1>
                                <p className="text-parchment-dim text-sm">
                                    {project.wordCount.toLocaleString()} words · {project.manuscript.length} chapters
                                </p>
                            </div>

                            {/* Chapters */}
                            {project.manuscript.map((chapter, index) => (
                                <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                    <h2 className="text-2xl md:text-3xl font-display text-warm/80 mb-6 pb-3 border-b border-warm/10">
                                        {chapter.title}
                                    </h2>
                                    <div className="font-serif text-parchment/85 leading-[1.9] text-base whitespace-pre-wrap">
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
