import React, { useMemo } from 'react';
import type { Project } from '../types';
import { SparklesIcon, LightbulbIcon, BookOpenIcon } from './Icons';

interface SmartSuggestionsProps {
    project: Project | undefined;
    onSend: (text: string) => void;
    isLoading: boolean;
    hasMessages: boolean;
}

interface Suggestion {
    label: string;
    prompt: string;
    icon: 'sparkle' | 'bulb' | 'book';
    priority: number; // lower = more important
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ project, onSend, isLoading, hasMessages }) => {
    const suggestions = useMemo((): Suggestion[] => {
        if (!project || isLoading) return [];

        const { notes, manuscript, messages } = project;
        const hasIdea = notes.idea.trim().length > 0;
        const hasPlot = notes.plot.trim().length > 0;
        const hasCharacters = notes.characters.trim().length > 0;
        const hasOutline = notes.outline.trim().length > 0;
        const hasChapters = manuscript.length > 0;
        const messageCount = messages.length;

        const all: Suggestion[] = [];

        // === GETTING STARTED — gentle nudges ===
        if (!hasIdea && !hasPlot && messageCount === 0) {
            all.push(
                { label: "Help me develop this into a novel", prompt: "I have a story idea but it's pretty rough. Can you help me develop it into something I could actually write? Here's what I have so far: ", icon: 'bulb', priority: 1 },
                { label: "Write me a story", prompt: "I want to write a novel but I'm not sure what to write about yet. Can you suggest 3 unique story ideas? For each, give me a one-line hook. Once I pick one, let's start developing and writing it.", icon: 'sparkle', priority: 2 },
            );
        }

        // === BUILDING THE FOUNDATION ===
        if (hasIdea && !hasPlot) {
            all.push(
                { label: "What happens in this story?", prompt: "Based on my story idea, can you help me figure out the main plot? I need a clear beginning, middle, and end — the big beats of the story. Once we have the structure, let's start writing.", icon: 'sparkle', priority: 1 },
                { label: "Write me an opening scene", prompt: "Before we plan everything out — can you write a short opening scene based on my idea? I want to see what this story could feel like on the page. Just a few paragraphs to get a taste.", icon: 'book', priority: 2 },
            );
        }

        if ((hasIdea || hasPlot) && !hasCharacters) {
            all.push(
                { label: "Who are the characters?", prompt: "Help me flesh out the characters for this story. Who are the main people, what drives them, and how do they relate to each other?", icon: 'sparkle', priority: 2 },
            );
        }

        if (hasPlot && hasCharacters && !hasOutline) {
            all.push(
                { label: "Let's plan the chapters", prompt: "I think I'm ready to plan out the chapters. Can you create a chapter-by-chapter outline based on my plot and characters?", icon: 'book', priority: 2 },
            );
        }

        // === READY TO WRITE ===
        if (hasPlot && !hasChapters) {
            all.push(
                { label: "Let's start writing Chapter 1", prompt: "Let's start writing! Write Chapter 1 based on everything we've planned. Open with a hook that pulls the reader in. Make it vivid and immersive.", icon: 'book', priority: 1 },
            );
        }

        if (hasChapters) {
            const nextChapter = manuscript.length + 1;
            all.push(
                { label: `Write Chapter ${nextChapter}`, prompt: `Write Chapter ${nextChapter}. Continue naturally from where Chapter ${manuscript.length} left off.`, icon: 'book', priority: 1 },
                { label: "How's my last chapter?", prompt: `Be my honest editor: review the last chapter. What's working well? What could be stronger? Give me specific suggestions I can use.`, icon: 'sparkle', priority: 3 },
            );
        }

        // === ONGOING SUPPORT ===
        if (messageCount > 0) {
            all.push(
                { label: "Write a scene from this", prompt: "Based on what we've discussed, write a short scene that captures the current moment in the story. Focus on making it vivid — I want to see and feel what's happening.", icon: 'book', priority: 3 },
            );
        }

        if (messageCount > 2 && hasPlot) {
            all.push(
                { label: "Any plot holes?", prompt: "As my editor, look over everything so far. Are there any inconsistencies, plot holes, or loose threads I should fix?", icon: 'bulb', priority: 5 },
            );
        }

        if (messageCount > 4) {
            all.push(
                { label: "Add a twist", prompt: "Suggest a surprising but earned plot twist that would make the story more compelling. Explain how to foreshadow it earlier.", icon: 'sparkle', priority: 7 },
            );
        }

        // Sort by priority and take top 4
        return all.sort((a, b) => a.priority - b.priority).slice(0, 4);
    }, [project, isLoading, hasMessages]);

    if (suggestions.length === 0) return null;

    const iconMap = {
        sparkle: <SparklesIcon className="w-3 h-3" />,
        bulb: <LightbulbIcon className="w-3 h-3" />,
        book: <BookOpenIcon className="w-3 h-3" />,
    };

    return (
        <div className="flex flex-wrap gap-2 px-1 pb-2 animate-fade-in">
            {suggestions.map((s, i) => (
                <button
                    key={i}
                    onClick={() => onSend(s.prompt)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-ink-100/50 border border-ink-400/15 hover:border-warm/25 hover:bg-warm/5 text-parchment-dim hover:text-warm-light text-xs transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                    <span className="text-parchment-faint group-hover:text-warm transition-colors">{iconMap[s.icon]}</span>
                    {s.label}
                </button>
            ))}
        </div>
    );
};

export default SmartSuggestions;
