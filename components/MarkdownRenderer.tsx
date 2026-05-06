import React from 'react';

interface MarkdownRendererProps {
    text: string;
    className?: string;
}

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: headings, bold, italic, bold-italic, code blocks, inline code,
 * unordered lists, ordered lists, horizontal rules, and paragraphs.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text, className = '' }) => {
    const renderInline = (line: string): React.ReactNode[] => {
        const nodes: React.ReactNode[] = [];
        // Regex for inline formatting: bold-italic, bold, italic, inline code
        const inlineRegex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+?)`)/g;
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = inlineRegex.exec(line)) !== null) {
            // Push text before match
            if (match.index > lastIndex) {
                nodes.push(line.slice(lastIndex, match.index));
            }

            if (match[2]) {
                // Bold-italic ***text***
                nodes.push(<strong key={key}><em>{match[2]}</em></strong>);
            } else if (match[3]) {
                // Bold **text**
                nodes.push(<strong key={key} className="font-semibold text-parchment">{match[3]}</strong>);
            } else if (match[4]) {
                // Italic *text*
                nodes.push(<em key={key} className="italic text-parchment/80">{match[4]}</em>);
            } else if (match[5]) {
                // Inline code `text`
                nodes.push(
                    <code key={key} className="px-1.5 py-0.5 rounded bg-ink-300/60 text-gold-light text-[0.85em] font-mono">
                        {match[5]}
                    </code>
                );
            }

            lastIndex = match.index + match[0].length;
            key++;
        }

        // Push remaining text
        if (lastIndex < line.length) {
            nodes.push(line.slice(lastIndex));
        }

        return nodes.length > 0 ? nodes : [line];
    };

    const renderMarkdown = (): React.ReactNode[] => {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Code block ```
            if (line.trim().startsWith('```')) {
                const lang = line.trim().slice(3).trim();
                const codeLines: string[] = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                i++; // skip closing ```
                elements.push(
                    <div key={elements.length} className="my-3 rounded-lg overflow-hidden border border-ink-400/30">
                        {lang && (
                            <div className="px-3 py-1.5 bg-ink-300/60 text-[10px] text-parchment-faint uppercase tracking-wider font-sans font-medium">
                                {lang}
                            </div>
                        )}
                        <pre className="px-4 py-3 bg-ink-200/60 overflow-x-auto text-sm font-mono leading-relaxed text-parchment/85">
                            <code>{codeLines.join('\n')}</code>
                        </pre>
                    </div>
                );
                continue;
            }

            // Empty line
            if (line.trim() === '') {
                i++;
                continue;
            }

            // Headings
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const content = headingMatch[2];
                const headingClasses: Record<number, string> = {
                    1: 'text-lg font-bold text-parchment mt-4 mb-2 font-sans',
                    2: 'text-base font-bold text-parchment mt-3 mb-1.5 font-sans',
                    3: 'text-sm font-semibold text-parchment mt-2 mb-1 font-sans',
                    4: 'text-sm font-semibold text-parchment-dim mt-2 mb-1 font-sans',
                    5: 'text-xs font-semibold text-parchment-dim mt-1 mb-0.5 font-sans',
                    6: 'text-xs font-medium text-parchment-faint mt-1 mb-0.5 font-sans',
                };
                elements.push(
                    <div key={elements.length} className={headingClasses[level] || headingClasses[3]}>
                        {renderInline(content)}
                    </div>
                );
                i++;
                continue;
            }

            // Horizontal rule
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
                elements.push(
                    <hr key={elements.length} className="my-3 border-t border-ink-400/20" />
                );
                i++;
                continue;
            }

            // Unordered list
            if (/^[\s]*[-*+]\s/.test(line)) {
                const listItems: React.ReactNode[] = [];
                while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
                    const itemText = lines[i].replace(/^[\s]*[-*+]\s/, '');
                    listItems.push(
                        <li key={listItems.length} className="flex items-start gap-2">
                            <span className="text-gold/60 mt-1.5 text-[6px]">●</span>
                            <span>{renderInline(itemText)}</span>
                        </li>
                    );
                    i++;
                }
                elements.push(
                    <ul key={elements.length} className="my-2 space-y-1 text-sm leading-relaxed">
                        {listItems}
                    </ul>
                );
                continue;
            }

            // Ordered list
            if (/^[\s]*\d+[.)]\s/.test(line)) {
                const listItems: React.ReactNode[] = [];
                let num = 1;
                while (i < lines.length && /^[\s]*\d+[.)]\s/.test(lines[i])) {
                    const itemText = lines[i].replace(/^[\s]*\d+[.)]\s/, '');
                    listItems.push(
                        <li key={listItems.length} className="flex items-start gap-2">
                            <span className="text-gold/60 text-xs min-w-[1.2em] text-right font-mono">{num}.</span>
                            <span>{renderInline(itemText)}</span>
                        </li>
                    );
                    num++;
                    i++;
                }
                elements.push(
                    <ol key={elements.length} className="my-2 space-y-1 text-sm leading-relaxed">
                        {listItems}
                    </ol>
                );
                continue;
            }

            // Blockquote
            if (line.trim().startsWith('>')) {
                const quoteLines: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith('>')) {
                    quoteLines.push(lines[i].replace(/^>\s?/, ''));
                    i++;
                }
                elements.push(
                    <blockquote key={elements.length} className="my-2 pl-3 border-l-2 border-gold/30 text-parchment-dim italic text-sm leading-relaxed">
                        {quoteLines.map((ql, qi) => (
                            <span key={qi}>{renderInline(ql)}{qi < quoteLines.length - 1 ? <br /> : null}</span>
                        ))}
                    </blockquote>
                );
                continue;
            }

            // Regular paragraph
            elements.push(
                <p key={elements.length} className="my-1.5 text-sm leading-relaxed">
                    {renderInline(line)}
                </p>
            );
            i++;
        }

        return elements;
    };

    return (
        <div className={`markdown-content font-serif ${className}`}>
            {renderMarkdown()}
        </div>
    );
};

export default MarkdownRenderer;
