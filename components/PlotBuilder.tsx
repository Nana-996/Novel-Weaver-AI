import React, { useState } from 'react';
import { SparklesIcon, SaveIcon } from './Icons';

interface PlotBuilderProps {
    content: string;
    onContentChange: (newContent: string) => void;
    onSave: () => void;
    onGenerateAiResponse: (concept: string) => Promise<string>;
    onGenerateCharacters: () => void;
    onGenerateChapters: (count: number) => void;
    isGenerating: boolean;
}

const PlotBuilder: React.FC<PlotBuilderProps> = ({
    content,
    onContentChange,
    onSave,
    onGenerateAiResponse,
    onGenerateCharacters,
    onGenerateChapters,
    isGenerating
}) => {
    const [conceptInput, setConceptInput] = useState('');
    const [showConceptInput, setShowConceptInput] = useState(content.trim() === '');
    const [activeTab, setActiveTab] = useState<'editor' | 'concept'>('editor');
    const [chapterCount, setChapterCount] = useState<number>(10);

    const handleDevelop = async () => {
        if (!conceptInput.trim()) return;
        const response = await onGenerateAiResponse(conceptInput);
        if (response) {
            onContentChange(response);
            setShowConceptInput(false);
            setActiveTab('editor');
        }
    };

    return (
        <div className="flex-1 flex flex-col p-6 bg-transparent h-full overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 animate-slide-up">
                <div>
                    <h2 className="text-3xl font-display font-medium text-text-primary dark:text-dark-text-primary">Story Architecture</h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary mt-1 font-serif italic">The blueprint of your masterpiece.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-white hover:text-primary text-white rounded-xl shadow-lg shadow-primary/20 transition-all duration-300"
                        title="Save Changes"
                    >
                        <SaveIcon className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                {/* Left Panel: Concept & Refinement */}
                <div className="flex-1 flex flex-col min-h-0 bg-transparent rounded-xl border border-border-color dark:border-dark-border-color/50 relative overflow-hidden group">
                    <div className="flex items-center border-b border-border-color dark:border-dark-border-color/50 bg-white/5 dark:bg-black/5 backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab('editor')}
                            className={`px-6 py-4 text-sm font-sans tracking-wide transition-all ${activeTab === 'editor' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                        >
                            Story Bible (Final)
                        </button>
                        <button
                            onClick={() => setActiveTab('concept')}
                            className={`px-6 py-4 text-sm font-sans tracking-wide transition-all ${activeTab === 'concept' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                        >
                            Concept Draft
                        </button>
                    </div>

                    <div className="flex-1 p-0 overflow-hidden flex flex-col relative">
                        {activeTab === 'concept' ? (
                            <div className="flex flex-col h-full animate-fade-in p-6">
                                <label className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-3 block font-sans">
                                    Rough Idea
                                </label>
                                <textarea
                                    value={conceptInput}
                                    onChange={(e) => setConceptInput(e.target.value)}
                                    placeholder="e.g. A clockmaker in 1890 London discovers one of his automatons has a soul..."
                                    className="flex-1 w-full bg-base dark:bg-dark-base/50 p-6 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary mb-4 border border-border-color dark:border-dark-border-color/50 font-serif leading-relaxed text-lg"
                                />
                                <button
                                    onClick={handleDevelop}
                                    disabled={isGenerating || !conceptInput.trim()}
                                    className="self-end flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-white hover:text-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? 'Weaving...' : 'Weave Plot'} <SparklesIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full animate-fade-in">
                                <textarea
                                    value={content}
                                    onChange={(e) => onContentChange(e.target.value)}
                                    placeholder="The canonical truth of your world goes here..."
                                    className="flex-1 w-full bg-transparent p-8 resize-none focus:outline-none focus:ring-0 border-none leading-loose font-serif text-lg text-text-primary dark:text-dark-text-primary overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20"
                                />
                                {content.trim() === '' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                        <p className="text-center italic font-serif text-text-secondary">"Every great story begins with a single thread."<br /><span className="text-sm font-sans not-italic mt-2 block opacity-70">Start writing or use the Concept Draft tab.</span></p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Actions & Status */}
                <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto">
                    <div className="bg-surface dark:bg-dark-surface p-5 rounded-xl border border-border-color dark:border-dark-border-color shadow-sm">
                        <h3 className="font-semibold text-text-primary dark:text-dark-text-primary mb-4 flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-accent" />
                            Next Steps
                        </h3>
                        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6 leading-relaxed">
                            Once you are satisfied with your Story Bible, generate the cast and chapter outline to begin writing.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={onGenerateCharacters}
                                disabled={isGenerating || !content.trim()}
                                className="w-full py-3 px-4 bg-tertiary/10 hover:bg-tertiary/20 text-text-primary dark:text-dark-text-primary border border-tertiary/30 rounded-lg transition-all text-sm font-medium flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>Generate Characters</span>
                                <span className="text-tertiary group-hover:translate-x-1 transition-transform">→</span>
                            </button>

                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-sm text-text-secondary dark:text-dark-text-secondary">Chapters:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={chapterCount}
                                    onChange={(e) => setChapterCount(Math.max(1, parseInt(e.target.value) || 10))}
                                    className="w-16 bg-base dark:bg-dark-base border border-border-color dark:border-dark-border-color rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <button
                                onClick={() => onGenerateChapters(chapterCount)}
                                disabled={isGenerating || !content.trim()}
                                className="w-full py-3 px-4 bg-tertiary/10 hover:bg-tertiary/20 text-text-primary dark:text-dark-text-primary border border-tertiary/30 rounded-lg transition-all text-sm font-medium flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>Generate Outline Matches</span>
                                <span className="text-tertiary group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Tip</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
                            The AI uses the "Story Bible" content as the ground truth. Improvements here will ripple through your entire novel's consistency.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlotBuilder;
