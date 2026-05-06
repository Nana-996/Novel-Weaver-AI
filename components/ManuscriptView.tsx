import React, { useState } from 'react';
import type { Project } from '../types';

interface ManuscriptViewProps {
  project: Project | null;
}

const ManuscriptView: React.FC<ManuscriptViewProps> = ({ project }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy to Clipboard');

  const handleCopy = () => {
    if (!project) return;
    const manuscriptText = project.manuscript.map(c => `${c.title}\n\n${c.content}`).join('\n\n\n');
    navigator.clipboard.writeText(manuscriptText).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy to Clipboard'), 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
        setCopyButtonText('Failed to copy');
        setTimeout(() => setCopyButtonText('Copy to Clipboard'), 2000);
    });
  };
  
  if (!project || project.manuscript.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Your Manuscript is Empty</h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Start writing in the chat view, and your chapters will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 bg-base dark:bg-dark-base">
        <div className="max-w-3xl mx-auto bg-surface dark:bg-dark-surface p-8 rounded-lg shadow-lg relative">
             <button
                onClick={handleCopy}
                className="absolute top-4 right-4 px-3 py-1.5 text-sm rounded-md bg-bubble-user dark:bg-dark-bubble-user hover:bg-opacity-80 transition-colors border border-border-color dark:border-dark-border-color"
             >
                {copyButtonText}
             </button>
             <h1 className="text-4xl font-bold mb-2 text-center text-text-primary dark:text-dark-text-primary">{project.title}</h1>
             <p className="text-center text-text-secondary dark:text-dark-text-secondary mb-12">Word Count: {project.wordCount}</p>
            {project.manuscript.map((chapter, index) => (
                <div key={index} className="mb-8">
                <h2 className="text-3xl font-semibold mb-4 border-b border-bubble-user dark:border-dark-bubble-user pb-2 text-ai-accent">{chapter.title}</h2>
                <div className="prose prose-invert max-w-none text-text-primary dark:text-dark-text-primary leading-relaxed whitespace-pre-wrap">
                    {chapter.content}
                </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ManuscriptView;