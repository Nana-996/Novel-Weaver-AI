import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatView from './components/ChatView';
import StoryPanel from './components/StoryPanel';
import ManuscriptOverlay from './components/ManuscriptOverlay';
import ProjectsModal from './components/ProjectsModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import PricingModal from './components/PricingModal';
import UsageBanner from './components/UsageBanner';
import { SparklesIcon, BookOpenIcon, FolderIcon, SettingsIcon, PlusIcon, DownloadIcon, PenIcon } from './components/Icons';
import type { Project, Message, Chapter, Settings, ExportFormat, StoryNotes } from './types';
import { createChat, extractStoryNotes } from './services/geminiService';
import { useHistoryState } from './hooks/useHistoryState';
import type { OpenRouterChat } from './services/geminiService';
import { isSupabaseConfigured, onAuthStateChange, getSession, getUserProfile, getAccessToken } from './services/authService';
import type { UserProfile } from './services/authService';
import { loadProjectsFromLocal, saveProjectsToLocal, syncProjects, debouncedCloudSave, deleteProjectFromCloud } from './services/projectService';
import { getUsageToday } from './services/usageService';
import type { UsageInfo } from './services/usageService';

export type ThinkingPhase = 'preparing' | 'connecting' | 'waiting' | 'streaming' | 'retrying' | 'stalled' | null;
export interface ThinkingStatus {
  phase: ThinkingPhase;
  model: string;
  startedAt: number;
  lastTokenAt: number | null;
  wordCount: number;
  retryCount: number;
}

declare const docx: any;
declare const jspdf: any;

const DEFAULT_SETTINGS: Settings = {
  ai: {
    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    writingStyle: "A balance of descriptive prose and engaging dialogue.",
    tonePreference: "A slightly serious tone with moments of levity.",
    defaultChapterLength: 1500,
  },
  export: {
    defaultFormat: 'pdf',
  }
};

const createEmptyNotes = (): StoryNotes => ({
  idea: '',
  plot: '',
  characters: '',
  outline: '',
});

const getInitialSettings = (): Settings => {
  try {
    const savedSettings = localStorage.getItem('novel-weaver-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.ai) {
        parsed.ai.model = 'nvidia/nemotron-3-ultra-550b-a55b:free';
        delete parsed.ai.provider;
      }
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        ai: { ...DEFAULT_SETTINGS.ai, ...parsed.ai },
        export: { ...DEFAULT_SETTINGS.export, ...parsed.export },
      };
    }
  } catch (error) {
    console.error("Failed to load settings", error);
  }
  return DEFAULT_SETTINGS;
};

const getInitialProjects = (): Project[] => {
  const projects = loadProjectsFromLocal();
  if (projects.length > 0) return projects;
  return [
    {
      id: `proj-${Date.now()}`,
      title: 'My New Story',
      createdAt: Date.now(),
      messages: [],
      manuscript: [],
      wordCount: 0,
      notes: createEmptyNotes(),
    }
  ];
};

const App: React.FC = () => {
  // --- Auth State ---
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured()); // If no Supabase, skip auth
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [initialSyncDone, setInitialSyncDone] = useState(false);

  // --- Project State ---
  const initialProjectsList = getInitialProjects();
  const {
    state: projects,
    set: setProjects,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<Project[]>(initialProjectsList);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    try {
      const lastProjectId = localStorage.getItem('novel-weaver-last-project');
      if (lastProjectId && initialProjectsList.some(p => p.id === lastProjectId)) {
        return lastProjectId;
      }
    } catch (e) {
      console.error(e);
    }
    return initialProjectsList[0]?.id || null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isProjectsModalOpen, setProjectsModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isManuscriptOpen, setManuscriptOpen] = useState(false);
  const [isStoryPanelOpen, setStoryPanelOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(getInitialSettings);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus | null>(null);
  const [isExtractingNotes, setIsExtractingNotes] = useState(false);
  const thinkingRef = useRef<ThinkingStatus | null>(null);
  const stallTimerRef = useRef<number | null>(null);

  const chatRef = useRef<OpenRouterChat | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;
  const notesSaveTimeoutRef = useRef<number | null>(null);

  const [editingTitle, setEditingTitle] = useState('');
  useEffect(() => {
    setEditingTitle(activeProject?.title || '');
  }, [activeProject?.title]);

  // ============================================================
  // Auth initialization
  // ============================================================
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthReady(true);
      return;
    }

    // Check existing session
    getSession().then(async (session) => {
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        setUserProfile(profile);

        // Sync projects from cloud
        const synced = await syncProjects(session.user.id, loadProjectsFromLocal());
        if (synced.length > 0) {
          setProjects(synced);
          if (!synced.find(p => p.id === activeProjectId)) {
            setActiveProjectId(synced[0].id);
          }
        }
        setInitialSyncDone(true);

        // Load usage
        const usageInfo = await getUsageToday(session.user.id, profile?.tier || 'free');
        setUsage(usageInfo);
      } else {
        setShowAuthModal(true);
      }
      setAuthReady(true);
    });

    // Listen for auth changes
    const unsubscribe = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getUserProfile(session.user.id);
        setUserProfile(profile);
        setShowAuthModal(false);

        // Sync on sign-in
        const synced = await syncProjects(session.user.id, loadProjectsFromLocal());
        if (synced.length > 0) {
          setProjects(synced);
        }
        setInitialSyncDone(true);

        const usageInfo = await getUsageToday(session.user.id, profile?.tier || 'free');
        setUsage(usageInfo);
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setUsage(null);
        setInitialSyncDone(false);
        setShowAuthModal(true);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle Paystack callback (check URL for payment reference)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('trxref');

    if (reference && userProfile) {
      // Verify payment
      getAccessToken().then(token => {
        if (!token) return;

        fetch('/api/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reference }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              // Update profile tier
              setUserProfile(prev => prev ? { ...prev, tier: data.tier } : null);
              // Clean URL
              window.history.replaceState({}, '', window.location.pathname);
              alert(`🎉 Welcome to the ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)} plan! Enjoy your upgraded features.`);
            }
          })
          .catch(console.error);
      });
    }
  }, [userProfile?.id]);

  // Auto-save to localStorage + cloud sync
  useEffect(() => {
    saveProjectsToLocal(projects);
    if (activeProjectId) {
      localStorage.setItem('novel-weaver-last-project', activeProjectId);
    }

    // Debounced cloud sync for the active project
    if (userProfile && activeProject) {
      debouncedCloudSave(activeProject, userProfile.id);
    }
  }, [projects, activeProjectId]);

  useEffect(() => {
    localStorage.setItem('novel-weaver-settings', JSON.stringify(settings));
  }, [settings]);

  // Refresh usage after sending a message
  const refreshUsage = useCallback(async () => {
    if (userProfile) {
      const usageInfo = await getUsageToday(userProfile.id, userProfile.tier);
      setUsage(usageInfo);
    }
  }, [userProfile]);

  // Init chat when project or settings change
  useEffect(() => {
    if (activeProject) {
      try {
        const MAX_HISTORY = 20;
        const recentMessages = activeProject.messages.slice(-MAX_HISTORY);
        chatRef.current = createChat({
          history: recentMessages.map(m => ({
            role: m.role,
            parts: [{
              text: m.edited
                ? `[User-corrected response — treat as canonical]\n\n${m.text}`
                : m.text
            }],
          })),
          settings: settings.ai,
        });
      } catch (error) {
        console.error("Could not initialize AI chat.", error);
      }
    }
  }, [activeProject, settings.ai]);

  const createNewProject = useCallback((callback?: (p: Project) => void) => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      title: 'My New Story',
      createdAt: Date.now(),
      messages: [],
      manuscript: [],
      wordCount: 0,
      notes: createEmptyNotes(),
    };
    if (callback) {
      callback(newProject);
    } else {
      setProjects([...projects, newProject]);
      setActiveProjectId(newProject.id);
    }
    return newProject;
  }, [projects, setProjects]);

  // Export functions
  const exportAsTxt = (project: Project) => {
    const title = `${project.title}\n\nWord Count: ${project.wordCount}\n\n---\n\n`;
    const content = project.manuscript.map(c => `${c.title}\n\n${c.content}`).join('\n\n---\n\n');
    const blob = new Blob([title + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPdf = (project: Project) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(project.title, 105, 140, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Word Count: ${project.wordCount}`, 105, 150, { align: 'center' });
    let y = 0;
    project.manuscript.forEach(chapter => {
      doc.addPage();
      y = 20;
      doc.setFontSize(18);
      doc.text(chapter.title, 105, y, { align: 'center' });
      y += 20;
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(chapter.content, 180);
      lines.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 15, y);
        y += 7;
      });
    });
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i - 1}`, 105, 290, { align: 'center' });
    }
    doc.save(`${project.title.replace(/\s+/g, '_')}.pdf`);
  };

  const exportAsDocx = (project: Project) => {
    const { Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType, HeadingLevel } = docx;
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: project.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `Word Count: ${project.wordCount}`, alignment: AlignmentType.CENTER }),
          ...project.manuscript.flatMap(chapter => [
            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
            ...chapter.content.split('\n').filter(line => line.trim() !== '').map(line => new Paragraph({ text: line })),
          ]),
        ],
      }],
    });
    Packer.toBlob(doc).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleExport = useCallback(() => {
    if (!activeProject || activeProject.manuscript.length === 0) {
      alert("Your manuscript is empty — start writing chapters first!");
      return;
    }

    // Tier-based export restrictions
    const tier = userProfile?.tier || 'free';
    if (tier === 'free') {
      // Free users can only export TXT
      exportAsTxt(activeProject);
      return;
    }

    const format = prompt("Export as: TXT, PDF, or DOCX?", settings.export.defaultFormat.toUpperCase());
    switch (format?.toLowerCase()) {
      case 'txt': exportAsTxt(activeProject); break;
      case 'pdf': exportAsPdf(activeProject); break;
      case 'docx': exportAsDocx(activeProject); break;
    }
  }, [activeProject, settings.export.defaultFormat, userProfile?.tier]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'z': e.preventDefault(); e.shiftKey ? redo() : undo(); break;
          case 'n': e.preventDefault(); createNewProject(); break;
          case 'e': e.preventDefault(); handleExport(); break;
          case 'm': e.preventDefault(); setManuscriptOpen(o => !o); break;
          case ',': e.preventDefault(); setSettingsModalOpen(true); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleExport, createNewProject]);

  const handleDeleteProject = (projectId: string) => {
    if (!window.confirm("Delete this story permanently?")) return;
    const remaining = projects.filter(p => p.id !== projectId);
    if (projectId === activeProjectId) {
      if (remaining.length > 0) {
        const idx = Math.max(0, projects.findIndex(p => p.id === projectId) - 1);
        setActiveProjectId(remaining[Math.min(idx, remaining.length - 1)].id);
      } else {
        createNewProject((p) => { setProjects([p]); setActiveProjectId(p.id); });
        return;
      }
    }
    setProjects(remaining);
    // Also delete from cloud
    if (userProfile) {
      deleteProjectFromCloud(projectId).catch(console.error);
    }
  };

  // Rebuild manuscript from messages
  const rebuildManuscript = useCallback((projectsToUpdate: Project[], currentProjectId: string | null): Project[] => {
    return projectsToUpdate.map(p => {
      if (p.id !== currentProjectId) return p;
      const newManuscriptMap = new Map<string, Chapter>();

      p.messages.forEach(message => {
        if (message.role === 'model') {
          const cleanText = message.text
            .replace(/\[Author's Notes.*?\[User Prompt\]:\n?/gs, '')
            .replace(/\[AI Character Notes\][\s\S]*?(?=\[AI Plot Notes\]|$)/gi, '')
            .replace(/\[AI Plot Notes\][\s\S]*?(?=\[Author's Notes\]|$)/gi, '');
          
          const lines = cleanText.split('\n');
          let currentChapterTitle = '';
          let currentChapterContent: string[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const cleanLine = line.trim();
            const chapterMatch = cleanLine.match(/^(?:#+\s*)?(Chapter\s+\d+)(.*)$/i);

            if (chapterMatch) {
              if (currentChapterTitle && currentChapterContent.length > 0) {
                newManuscriptMap.set(currentChapterTitle.toLowerCase(), {
                  title: currentChapterTitle,
                  content: currentChapterContent.join('\n').trim()
                });
              }
              const numPart = chapterMatch[1].trim();
              const titlePart = chapterMatch[2].replace(/^[:\-\s]+/, '').trim();
              currentChapterTitle = titlePart ? `${numPart}: ${titlePart}` : numPart;
              currentChapterContent = [];
            } else if (currentChapterTitle) {
              if (cleanLine.startsWith('[AI Character Notes]') ||
                  cleanLine.startsWith('[AI Plot Notes]') ||
                  cleanLine.startsWith("[Author's Notes]") ||
                  cleanLine.startsWith('[User Prompt]')) {
                newManuscriptMap.set(currentChapterTitle.toLowerCase(), {
                  title: currentChapterTitle,
                  content: currentChapterContent.join('\n').trim()
                });
                currentChapterTitle = '';
                currentChapterContent = [];
              } else {
                currentChapterContent.push(line);
              }
            }
          }

          if (currentChapterTitle && currentChapterContent.length > 0) {
            newManuscriptMap.set(currentChapterTitle.toLowerCase(), {
              title: currentChapterTitle,
              content: currentChapterContent.join('\n').trim()
            });
          }
        }
      });

      const newManuscript = Array.from(newManuscriptMap.values());
      const newWordCount = newManuscript.reduce((sum, chap) => sum + (chap.content.match(/\S+/g) || []).length, 0);
      return { ...p, manuscript: newManuscript, wordCount: newWordCount };
    });
  }, []);

  const handleEditMessage = (messageId: string, newText: string) => {
    if (!activeProjectId) return;
    const updated = projects.map(p =>
      p.id === activeProjectId
        ? { ...p, messages: p.messages.map(m => m.id === messageId ? { ...m, text: newText, edited: true } : m) }
        : p
    );
    setProjects(rebuildManuscript(updated, activeProjectId));
  };

  const handleDeleteMessagePair = (messageId: string) => {
    if (!activeProjectId) return;
    const currentProject = projects.find(p => p.id === activeProjectId);
    if (!currentProject) return;

    const msgIndex = currentProject.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    let startIndex = msgIndex;
    let deleteCount = 1;

    const msg = currentProject.messages[msgIndex];
    if (msg.role === 'model') {
      if (msgIndex > 0 && currentProject.messages[msgIndex - 1].role === 'user') {
        startIndex = msgIndex - 1;
        deleteCount = 2;
      }
    } else {
      if (msgIndex < currentProject.messages.length - 1 && currentProject.messages[msgIndex + 1].role === 'model') {
        deleteCount = 2;
      }
    }

    if (!window.confirm("Delete this response and its corresponding prompt?")) return;

    const updatedMessages = [...currentProject.messages];
    updatedMessages.splice(startIndex, deleteCount);

    const updatedProjects = projects.map(p =>
      p.id === activeProjectId ? { ...p, messages: updatedMessages } : p
    );
    setProjects(rebuildManuscript(updatedProjects, activeProjectId));
  };

  const handleRegenerateMessage = async (messageId: string, model: string) => {
    if (!activeProject || !chatRef.current) return;
    const msgIndex = activeProject.messages.findIndex(m => m.id === messageId);
    if (msgIndex <= 0) return;
    const userMessage = activeProject.messages[msgIndex - 1];
    if (userMessage.role !== 'user') return;

    setIsLoading(true);
    setStreamingText('');
    abortRef.current = new AbortController();
    const status: ThinkingStatus = { phase: 'preparing', model, startedAt: Date.now(), lastTokenAt: null, wordCount: 0, retryCount: 0 };
    thinkingRef.current = status;
    setThinkingStatus({ ...status });

    let newChat;
    try {
      newChat = createChat({
        history: activeProject.messages.slice(0, msgIndex - 1).map(m => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
        settings: { ...settings.ai, model },
      });
    } catch (error) {
      console.error("Could not init AI chat.", error);
      setIsLoading(false);
      setStreamingText(null);
      return;
    }

    let storyContext = buildStoryContext(activeProject);

    try {
      if (thinkingRef.current) { thinkingRef.current.phase = 'connecting'; setThinkingStatus({ ...thinkingRef.current }); }
      const stream = await newChat.sendMessageStream({ message: storyContext + userMessage.text, abortSignal: abortRef.current?.signal });
      if (thinkingRef.current) { thinkingRef.current.phase = 'waiting'; setThinkingStatus({ ...thinkingRef.current }); }
      startStallDetection();
      let fullResponse = '';
      for await (const chunk of stream) {
        if (abortRef.current?.signal.aborted) break;
        fullResponse += chunk.text;
        setStreamingText(fullResponse);
        if (thinkingRef.current) {
          thinkingRef.current.phase = 'streaming';
          thinkingRef.current.lastTokenAt = Date.now();
          thinkingRef.current.wordCount = (fullResponse.match(/\S+/g) || []).length;
          setThinkingStatus({ ...thinkingRef.current });
        }
      }

      const updatedMessages = [...activeProject.messages];
      updatedMessages[msgIndex] = { id: messageId, role: 'model', text: fullResponse };

      const updatedProjects = projects.map(p =>
        p.id === activeProjectId ? { ...p, messages: updatedMessages } : p
      );
      const finalProjects = rebuildManuscript(updatedProjects, activeProjectId);
      setProjects(finalProjects);

      const updatedProject = finalProjects.find(p => p.id === activeProjectId);
      if (updatedProject && activeProjectId) {
        triggerStoryExtraction(updatedProject.messages, activeProjectId, updatedProject.notes);
      }

      // Refresh usage
      refreshUsage();
    } catch (error: any) {
      const updatedMessages = [...activeProject.messages];
      updatedMessages[msgIndex] = { id: messageId, role: 'model', text: `Error: ${error.message}` };
      setProjects(projects.map(p => p.id === activeProjectId ? { ...p, messages: updatedMessages } : p));
    } finally {
      abortRef.current = null;
      thinkingRef.current = null;
      clearStallDetection();
      setThinkingStatus(null);
      setIsLoading(false);
      setStreamingText(null);
    }
  };

  // Build comprehensive story context
  const buildStoryContext = (project: Project): string => {
    const { notes, manuscript, messages } = project;
    const parts: string[] = [];

    parts.push(`[STORY MEMORY — You MUST use this to maintain perfect consistency. Never contradict anything here.]`);

    if (notes.idea.trim()) {
      parts.push(`\n<story_idea>\n${notes.idea}\n</story_idea>`);
    }
    if (notes.plot.trim()) {
      parts.push(`\n<plot_summary>\n${notes.plot}\n</plot_summary>`);
    }
    if (notes.characters.trim()) {
      parts.push(`\n<characters>\n${notes.characters}\n</characters>`);
    }
    if (notes.outline.trim()) {
      parts.push(`\n<chapter_outline>\n${notes.outline}\n</chapter_outline>`);
    }

    if (manuscript.length > 0) {
      const manuscriptSummary = manuscript.map((ch, i) => {
        if (i >= manuscript.length - 2) {
          return `${ch.title}:\n${ch.content}`;
        }
        const preview = ch.content.substring(0, 200).trim();
        return `${ch.title}: ${preview}...`;
      }).join('\n\n');
      parts.push(`\n<manuscript_progress>\nChapters written so far (${manuscript.length} total, ${project.wordCount} words):\n\n${manuscriptSummary}\n</manuscript_progress>`);
    }

    const editedMessages = messages.filter(m => m.role === 'model' && m.edited);
    if (editedMessages.length > 0) {
      const corrections = editedMessages.slice(-5).map(m => {
        const preview = m.text.substring(0, 300).trim();
        return `- "${preview}${m.text.length > 300 ? '...' : ''}"`;
      }).join('\n');
      parts.push(`\n<user_corrections>\nThe user has corrected these responses. Follow the corrected versions as canonical truth:\n${corrections}\n</user_corrections>`);
    }

    const MAX_RECENT_MESSAGES = 20;
    if (messages.length > MAX_RECENT_MESSAGES) {
      const olderMessages = messages.slice(0, messages.length - MAX_RECENT_MESSAGES);
      const keyPoints: string[] = [];
      olderMessages.forEach(m => {
        if (m.role === 'user') {
          const short = m.text.substring(0, 150).trim();
          keyPoints.push(`User: ${short}${m.text.length > 150 ? '...' : ''}`);
        } else if (m.role === 'model' && !m.text.startsWith('Error:')) {
          const short = m.text.substring(0, 150).trim();
          keyPoints.push(`AI: ${short}${m.text.length > 150 ? '...' : ''}`);
        }
      });
      if (keyPoints.length > 0) {
        parts.push(`\n<earlier_conversation_summary>\nHere is what was discussed earlier in this conversation (${olderMessages.length} messages summarized):\n${keyPoints.join('\n')}\n</earlier_conversation_summary>`);
      }
    }

    if (parts.length <= 1) return '';

    parts.push(`\n[User Message]:`);
    return parts.join('\n');
  };

  // Trigger Story Memory auto-extraction after AI responses
  const triggerStoryExtraction = useCallback(async (projectMessages: Array<{ role: 'user' | 'model'; text: string }>, projectId: string, currentNotes: StoryNotes) => {
    setIsExtractingNotes(true);
    try {
      const updates = await extractStoryNotes(projectMessages, currentNotes);
      if (updates) {
        console.log('[StoryExtraction] Updating Story Memory with new info');
        setProjects(prev => prev.map(p =>
          p.id === projectId
            ? { ...p, notes: { idea: updates.idea, characters: updates.characters, plot: updates.plot, outline: updates.outline } }
            : p
        ));
      }
    } catch (error) {
      console.warn('[StoryExtraction] Extraction failed:', error);
    } finally {
      setIsExtractingNotes(false);
    }
  }, [setProjects]);

  const handleSendMessage = async (text: string) => {
    if (!activeProject || !chatRef.current) return;

    // Check usage before sending
    if (usage?.isAtLimit) {
      setShowPricingModal(true);
      return;
    }

    const userMessage: Message = { id: `msg-${Date.now()}`, role: 'user', text };

    let currentProjects = projects.map(p =>
      p.id === activeProjectId ? { ...p, messages: [...p.messages, userMessage] } : p
    );
    setProjects(currentProjects, false, true);

    setIsLoading(true);
    setStreamingText('');
    abortRef.current = new AbortController();
    const status: ThinkingStatus = { phase: 'preparing', model: settings.ai.model, startedAt: Date.now(), lastTokenAt: null, wordCount: 0, retryCount: 0 };
    thinkingRef.current = status;
    setThinkingStatus({ ...status });

    const storyContext = buildStoryContext(activeProject);

    try {
      if (thinkingRef.current) { thinkingRef.current.phase = 'connecting'; setThinkingStatus({ ...thinkingRef.current }); }
      const stream = await chatRef.current.sendMessageStream({ message: storyContext + text, abortSignal: abortRef.current?.signal });
      if (thinkingRef.current) { thinkingRef.current.phase = 'waiting'; setThinkingStatus({ ...thinkingRef.current }); }
      startStallDetection();
      let fullResponse = '';
      for await (const chunk of stream) {
        if (abortRef.current?.signal.aborted) break;
        fullResponse += chunk.text;
        setStreamingText(fullResponse);
        if (thinkingRef.current) {
          thinkingRef.current.phase = 'streaming';
          thinkingRef.current.lastTokenAt = Date.now();
          thinkingRef.current.wordCount = (fullResponse.match(/\S+/g) || []).length;
          setThinkingStatus({ ...thinkingRef.current });
        }
      }
      if (fullResponse.trim()) {
        const modelMessage: Message = { id: `msg-${Date.now() + 1}`, role: 'model', text: fullResponse };
        currentProjects = currentProjects.map(p =>
          p.id === activeProjectId ? { ...p, messages: [...p.messages, modelMessage] } : p
        );
        const finalProjects = rebuildManuscript(currentProjects, activeProjectId);
        setProjects(finalProjects);

        const updatedProject = finalProjects.find(p => p.id === activeProjectId);
        if (updatedProject && activeProjectId) {
          triggerStoryExtraction(updatedProject.messages, activeProjectId, updatedProject.notes);
        }
      }

      // Refresh usage after message
      refreshUsage();
    } catch (error: any) {
      const errorMessage: Message = { id: `msg-${Date.now() + 1}`, role: 'model', text: `Error: ${error.message}` };
      currentProjects = currentProjects.map(p =>
        p.id === activeProjectId ? { ...p, messages: [...p.messages, errorMessage] } : p
      );
      setProjects(currentProjects);
    } finally {
      abortRef.current = null;
      thinkingRef.current = null;
      clearStallDetection();
      setThinkingStatus(null);
      setIsLoading(false);
      setStreamingText(null);
    }
  };

  // Stall detection — marks status as 'stalled' if no tokens for 20s
  const startStallDetection = () => {
    clearStallDetection();
    stallTimerRef.current = window.setInterval(() => {
      if (thinkingRef.current && thinkingRef.current.phase !== 'stalled') {
        const lastActivity = thinkingRef.current.lastTokenAt || thinkingRef.current.startedAt;
        if (Date.now() - lastActivity > 20000) {
          thinkingRef.current.phase = 'stalled';
          setThinkingStatus({ ...thinkingRef.current });
        }
      }
    }, 2000);
  };

  const clearStallDetection = () => {
    if (stallTimerRef.current) {
      clearInterval(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  const handleTitleBlur = () => {
    if (activeProject && editingTitle.trim() && editingTitle !== activeProject.title) {
      setProjects(projects.map(p => p.id === activeProjectId ? { ...p, title: editingTitle } : p));
    } else {
      setEditingTitle(activeProject?.title || '');
    }
  };

  const handleNotesChange = (field: keyof StoryNotes, value: string) => {
    if (!activeProjectId) return;
    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);

    setProjects(
      projects.map(p => p.id === activeProjectId ? { ...p, notes: { ...p.notes, [field]: value } } : p),
      false, true
    );

    notesSaveTimeoutRef.current = window.setTimeout(() => {
      setProjects(projects.map(p => p.id === activeProjectId ? { ...p, notes: { ...p.notes, [field]: value } } : p));
    }, 1500);
  };

  // Determine story progress for the footer
  const getProgressLabel = (): string => {
    if (!activeProject) return '';
    const { notes, manuscript, messages } = activeProject;
    if (messages.length === 0) return 'Ready to write';
    if (!notes.idea.trim() && !notes.plot.trim()) return 'Exploring your idea';
    if (notes.idea.trim() && !notes.plot.trim()) return 'Developing the story';
    if (notes.plot.trim() && manuscript.length === 0) return 'Building toward Chapter 1';
    if (manuscript.length > 0 && manuscript.length < 5) return `Writing — ${manuscript.length} ${manuscript.length === 1 ? 'chapter' : 'chapters'} drafted`;
    if (manuscript.length >= 5) return `Growing the manuscript — ${manuscript.length} chapters`;
    return 'In progress';
  };

  // --- Loading state ---
  if (!authReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ink">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-ink-200 border border-ink-400 flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <SparklesIcon className="w-6 h-6 text-warm" />
          </div>
          <p className="text-parchment-dim text-sm">Loading Novel Weaver...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-ink bg-noise bg-ambient overflow-hidden overflow-x-hidden">
      {/* ===== TOP BAR ===== */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2.5 border-b border-ink-400/8 bg-ink flex-shrink-0 z-20">
        {/* Left: Brand + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-ink-200 border border-ink-400 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-warm" />
            </div>
            <span className="font-display text-sm font-semibold text-parchment tracking-tight hidden sm:block">Novel Weaver</span>
          </div>
          <span className="text-ink-400/40 hidden sm:block">·</span>
          <input
            type="text"
            value={editingTitle}
            onChange={e => setEditingTitle(e.target.value)}
            onBlur={handleTitleBlur}
            disabled={!activeProject}
            className="bg-transparent text-sm font-medium text-parchment/80 focus:text-parchment focus:outline-none focus:ring-1 focus:ring-warm/20 rounded px-2 py-1 min-w-0 truncate max-w-[200px] md:max-w-[300px] transition-colors"
            id="project-title-input"
          />
        </div>

        {/* Right: Actions + User Menu */}
        <div className="flex items-center gap-1">
          {activeProject && activeProject.manuscript.length > 0 && (
            <button
              onClick={() => setManuscriptOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-parchment-dim hover:text-warm hover:bg-warm/5 transition-all"
              title="Read your manuscript (Ctrl+M)"
              id="btn-manuscript"
            >
              <BookOpenIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Read</span>
              <span className="text-[10px] bg-warm/15 text-warm px-1.5 py-0.5 rounded-full font-medium">
                {activeProject.manuscript.length}
              </span>
            </button>
          )}

          <div className="w-px h-5 bg-ink-400/15 mx-1 hidden sm:block" />

          <button
            onClick={() => setProjectsModalOpen(true)}
            className="p-2 rounded-lg text-parchment-faint hover:text-parchment-dim hover:bg-ink-300/30 transition-colors"
            title="My Stories"
            id="btn-projects"
          >
            <FolderIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 rounded-lg text-parchment-faint hover:text-parchment-dim hover:bg-ink-300/30 transition-colors"
            title="Settings (Ctrl+,)"
            id="btn-settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {activeProject && (
            <button
              onClick={() => setStoryPanelOpen(o => !o)}
              className={`p-2 rounded-lg transition-colors md:hidden ${
                isStoryPanelOpen
                  ? 'text-warm bg-warm/10'
                  : 'text-parchment-faint hover:text-parchment-dim hover:bg-ink-300/30'
              }`}
              title="Story Memory"
              id="btn-mobile-story-panel"
            >
              <PenIcon className="w-4 h-4" />
            </button>
          )}

          {/* User Menu (when authenticated) */}
          {userProfile && (
            <>
              <div className="w-px h-5 bg-ink-400/15 mx-1" />
              <UserMenu
                profile={userProfile}
                usage={usage}
                onSignOut={() => {
                  setUserProfile(null);
                  setUsage(null);
                  setShowAuthModal(true);
                }}
                onOpenPricing={() => setShowPricingModal(true)}
              />
            </>
          )}

          {/* Sign In button (when not authenticated and Supabase is configured) */}
          {!userProfile && isSupabaseConfigured() && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="ml-2 px-3 py-1.5 rounded-xl text-sm text-warm border border-warm/20 hover:bg-warm/5 transition-all font-medium"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeProject ? (
            <>
              {/* Usage banner (shown above chat when near/at limit) */}
              {!isLoading && activeProject.messages.length > 0 && (
                <div className="flex-shrink-0 px-4 md:px-6 lg:px-12 pt-2">
                  <UsageBanner usage={usage} onUpgrade={() => setShowPricingModal(true)} />
                </div>
              )}
              <ChatView
                messages={activeProject.messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onEditMessage={handleEditMessage}
                onRegenerateMessage={handleRegenerateMessage}
                onDeleteMessagePair={handleDeleteMessagePair}
                onStopGenerating={() => {
                  abortRef.current?.abort();
                  abortRef.current = null;
                  thinkingRef.current = null;
                  clearStallDetection();
                  setThinkingStatus(null);
                  setIsLoading(false);
                  setStreamingText(null);
                }}
                streamingText={streamingText}
                thinkingStatus={thinkingStatus}
                currentModel={settings.ai.model}
                project={activeProject}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-parchment-faint text-sm">Loading your story...</p>
            </div>
          )}
        </main>

        {/* Story Memory panel */}
        {activeProject && (
          <StoryPanel
            notes={activeProject.notes}
            onNotesChange={handleNotesChange}
            isOpen={isStoryPanelOpen}
            onToggle={() => setStoryPanelOpen(o => !o)}
            wordCount={activeProject.wordCount}
            hasMessages={activeProject.messages.length > 0}
            isExtracting={isExtractingNotes}
          />
        )}
      </div>

      {/* ===== BOTTOM STATUS BAR ===== */}
      <footer className="flex items-center justify-between px-4 md:px-6 py-1.5 border-t border-ink-400/6 bg-transparent text-[10px] text-parchment-faint/40 flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-warm/40">✦</span>
          <span>{getProgressLabel()}</span>
          {/* Online/Offline indicator */}
          {userProfile && (
            <span className="flex items-center gap-1 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage/60" />
              <span>synced</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {activeProject && activeProject.wordCount > 0 && (
            <span>{activeProject.wordCount.toLocaleString()} words</span>
          )}
          {activeProject && activeProject.manuscript.length > 0 && (
            <span>{activeProject.manuscript.length} {activeProject.manuscript.length === 1 ? 'chapter' : 'chapters'}</span>
          )}
          {usage && usage.messagesLimit !== Infinity && (
            <span className={usage.isNearLimit ? 'text-amber-500/60' : ''}>
              {usage.messagesUsed}/{usage.messagesLimit} msgs
            </span>
          )}
          <button
            onClick={handleExport}
            className="text-parchment-faint/40 hover:text-parchment-dim transition-colors"
            title="Export (Ctrl+E)"
            id="btn-export"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* ===== OVERLAYS ===== */}
      {activeProject && (
        <ManuscriptOverlay
          project={activeProject}
          isOpen={isManuscriptOpen}
          onClose={() => setManuscriptOpen(false)}
          onExport={handleExport}
        />
      )}

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSwitchProject={(id) => {
          setActiveProjectId(id);
          setProjectsModalOpen(false);
        }}
        onDeleteProject={handleDeleteProject}
        onNewProject={() => {
          createNewProject();
          setProjectsModalOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSave={(s) => {
          setSettings(s);
          setSettingsModalOpen(false);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={() => setShowAuthModal(false)}
      />

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentTier={userProfile?.tier || 'free'}
        userProfile={userProfile}
        onTierChanged={(newTier) => {
          setUserProfile(prev => prev ? { ...prev, tier: newTier as UserProfile['tier'] } : null);
          setShowPricingModal(false);
        }}
      />
    </div>
  );
};

export default App;