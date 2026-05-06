export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  edited?: boolean;
}

export interface Chapter {
  title: string;
  content: string;
}

export interface StoryNotes {
  idea: string;        // The user's original idea
  plot: string;        // Plot summary / story bible
  characters: string;  // Character notes
  outline: string;     // Chapter outline
}

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
  manuscript: Chapter[];
  wordCount: number;
  notes: StoryNotes;
}

export type ExportFormat = 'txt' | 'pdf' | 'docx';

export interface Settings {
  ai: {
    model: string;
    temperature: number;
    topK: number;
    topP: number;
    writingStyle: string;
    tonePreference: string;
    defaultChapterLength: number;
  };
  export: {
    defaultFormat: ExportFormat;
  };
}