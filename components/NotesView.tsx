import React from 'react';

interface NotesViewProps {
  content: string;
  onContentChange: (newContent: string) => void;
  onSave: () => void;
  placeholder: string;
  title: string;
}

const NotesView: React.FC<NotesViewProps> = ({ content, onContentChange, onSave, placeholder, title }) => {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 bg-base dark:bg-dark-base">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Changes are saved automatically when you switch tabs or stop typing.</p>
        </div>
        <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onBlur={onSave}
            placeholder={placeholder}
            className="w-full h-full flex-1 bg-surface dark:bg-dark-surface p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-text-primary dark:text-dark-text-primary leading-relaxed"
        />
    </div>
  );
};

export default NotesView;
