import React, { useState, useRef } from 'react';
import { SparklesIcon, SendIcon } from './Icons';

interface WelcomeScreenProps {
    onSend: (message: string) => Promise<void>;
    isLoading: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSend, isLoading }) => {
    const [input, setInput] = useState('');
    const [showNudges, setShowNudges] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = async () => {
        if (input.trim() && !isLoading) {
            const msg = input;
            setInput('');
            if (inputRef.current) inputRef.current.style.height = 'auto';
            await onSend(msg);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNudge = (prompt: string) => {
        setInput(prompt);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const nudges = [
        { emoji: "💡", text: "I have a character", prompt: "I have a character in mind but I don't have their story yet. Can you help me build a plot around them and eventually write their story? Here's what I know: " },
        { emoji: "🌍", text: "I have a world", prompt: "I've been imagining a world for a novel. Can you help me find a story in it, develop the characters, and start writing? Here's the world: " },
        { emoji: "✨", text: "A \"what if\" idea", prompt: "I have a 'what if' concept. It's rough, but I want to turn it into a full novel. Help me develop it and start writing. What if " },
        { emoji: "📖", text: "Write me a story", prompt: "I want to write a novel but I'm totally blank. Can you suggest 3 unique story ideas? For each one, give me a hook and tell me why it would be fun to write. Once I pick one, let's start building it and writing chapters." },
    ];

    return (
        <div className="h-full flex flex-col items-center justify-center px-6 animate-fade-in relative">
            {/* Atmospheric ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-warm/[0.03] blur-[100px]" />
                <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] rounded-full bg-sage/[0.02] blur-[80px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">
                {/* Companion presence */}
                <div className="relative mb-4 flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warm/15 to-sage/10 border border-warm/15 flex items-center justify-center shadow-lg shadow-warm/5">
                        <SparklesIcon className="w-6 h-6 text-warm" />
                    </div>
                    <div className="absolute -inset-4 rounded-3xl bg-warm/5 blur-2xl -z-10" />
                </div>

                {/* Greeting */}
                <h1 className="text-2xl md:text-3xl font-display font-semibold text-parchment mb-1.5 leading-tight tracking-tight text-center flex-shrink-0">
                    Let's write your novel
                </h1>
                <p className="text-parchment-dim/70 text-sm mb-6 text-center flex-shrink-0">
                    Start with a rough idea — I'll help you develop it, plan it, and write it with you.
                </p>

                {/* The Hero Input — this IS the main action */}
                <div className="w-full mb-4 flex-shrink-0">
                    <div className="bg-ink-100/60 backdrop-blur-xl rounded-2xl border border-ink-400/20 hover:border-warm/20 input-warm transition-all shadow-2xl shadow-black/20">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. I want to write a mystery about a detective who discovers her missing sister is alive and living under a false identity..."
                            className="w-full bg-transparent px-5 pt-4 pb-2 focus:outline-none resize-none text-parchment text-sm min-h-[72px] max-h-[140px] font-serif placeholder:text-parchment-faint/30 leading-relaxed overflow-y-auto scrollbar-thin"
                            rows={2}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
                            }}
                        />
                        <div className="flex items-center justify-between px-4 pb-3">
                            <p className="text-[11px] text-parchment-faint/30">
                                I'll help you build a plot, develop characters, and start writing chapters.
                            </p>
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="bg-warm hover:bg-warm-light disabled:opacity-25 disabled:hover:bg-warm text-ink rounded-xl px-4 py-2 transition-all duration-200 hover:scale-105 disabled:hover:scale-100 flex items-center gap-2 text-sm font-medium"
                            >
                                <span className="hidden sm:inline">{isLoading ? 'Thinking...' : 'Start writing'}</span>
                                <SendIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Nudge area */}
                <div className="flex-shrink-0">
                    {!showNudges ? (
                        <button
                            onClick={() => setShowNudges(true)}
                            className="text-parchment-faint/50 text-xs hover:text-parchment-dim transition-colors duration-300 group"
                        >
                            <span className="border-b border-dashed border-parchment-faint/30 group-hover:border-parchment-dim/50 pb-0.5">
                                Not sure what to write? I can help
                            </span>
                        </button>
                    ) : (
                        <div className="animate-slide-up">
                            <div className="flex gap-2 justify-center flex-wrap">
                                {nudges.map((nudge, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleNudge(nudge.prompt)}
                                        className="px-3 py-1.5 rounded-xl bg-ink-200/40 border border-ink-400/15 hover:border-warm/20 hover:bg-ink-200/60 transition-all duration-300 group flex items-center gap-1.5"
                                    >
                                        <span className="text-sm leading-none">{nudge.emoji}</span>
                                        <span className="text-[11px] text-parchment-dim group-hover:text-parchment transition-colors whitespace-nowrap">
                                            {nudge.text}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;