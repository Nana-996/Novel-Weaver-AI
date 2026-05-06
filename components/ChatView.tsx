import React, { useState, useRef, useEffect } from 'react';
import type { Message, Project } from '../types';
import { SendIcon, SparklesIcon, PencilIcon, RefreshIcon } from './Icons';
import WelcomeScreen from './WelcomeScreen';
import MarkdownRenderer from './MarkdownRenderer';
import SmartSuggestions from './SmartSuggestions';

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  onEditMessage: (messageId: string, newText: string) => void;
  onRegenerateMessage: (messageId: string, model: string) => Promise<void>;
  streamingText: string | null;
  currentModel: string;
  project?: Project;
}

const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onEditMessage,
  onRegenerateMessage,
  streamingText,
  currentModel,
  project
}) => {
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.style.height = 'auto';
      editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
    }
  }, [editingMessageId, editingText]);

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      const messageToSend = input;
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      await onSendMessage(messageToSend);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editingText.trim()) {
      onEditMessage(editingMessageId, editingText);
    }
    handleCancelEdit();
  };

  const isWelcome = messages.length === 0 && !isLoading;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {isWelcome ? (
        /* ===== WELCOME — Full immersive experience ===== */
        <WelcomeScreen onSend={onSendMessage} isLoading={isLoading} />
      ) : (
        /* ===== CONVERSATION — Creative workspace ===== */
        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-12 py-6 space-y-6 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className="message-appear"
                style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s` }}
              >
                {msg.role === 'user' ? (
                  /* --- Writer's message — subtle, right-aligned intent --- */
                  <div className="flex justify-end">
                    <div className="max-w-xl">
                      <div className="px-4 py-3 rounded-2xl rounded-br-md bg-warm/6 border border-warm/10">
                        <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-parchment">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ) : editingMessageId === msg.id ? (
                  /* --- Editing an AI response --- */
                  <div className="p-4 rounded-xl bg-ink-200/80 border border-ink-400/30">
                    <textarea
                      ref={editInputRef}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full bg-ink-100 p-3 focus:outline-none focus:ring-1 focus:ring-warm/30 rounded-lg resize-none text-parchment font-serif text-sm leading-relaxed"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                    <div className="flex justify-end items-center gap-2 mt-3">
                      <button onClick={handleCancelEdit} className="px-3 py-1.5 rounded-lg bg-ink-300 hover:bg-ink-400 text-parchment-dim text-sm transition-colors">Cancel</button>
                      <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg bg-warm hover:bg-warm-light text-ink text-sm font-medium transition-colors">Save</button>
                    </div>
                  </div>
                ) : (
                  /* --- AI Companion response — full-width, document-like --- */
                  <div className="group">
                    {/* Companion indicator */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-warm/12 to-sage/8 border border-warm/10 flex items-center justify-center">
                        <SparklesIcon className="w-3.5 h-3.5 text-warm/80" />
                      </div>
                      <span className="text-[11px] text-parchment-dim/60 font-medium tracking-wide">Novel Weaver</span>
                      {msg.edited && (
                        <span className="text-[10px] text-sage/60 flex items-center gap-0.5">✓ corrected</span>
                      )}
                    </div>
                    {/* Response content — clean, document-style */}
                    <div className="pl-8">
                      <div className="prose-response">
                        <MarkdownRenderer text={msg.text} />
                      </div>
                      {/* Subtle actions */}
                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => handleStartEdit(msg)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-parchment-faint/60 hover:text-warm hover:bg-warm/5 transition-colors text-[11px]"
                        >
                          <PencilIcon className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => onRegenerateMessage(msg.id, currentModel)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-parchment-faint/60 hover:text-warm hover:bg-warm/5 transition-colors text-[11px]"
                        >
                          <RefreshIcon className="w-3 h-3" />
                          <span>Try again</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming response */}
            {streamingText && (
              <div className="message-appear">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-warm/12 to-sage/8 border border-warm/10 flex items-center justify-center animate-pulse-soft">
                    <SparklesIcon className="w-3.5 h-3.5 text-warm/80" />
                  </div>
                  <span className="text-[11px] text-parchment-dim/60 font-medium tracking-wide">Novel Weaver</span>
                  <span className="text-[10px] text-warm/40 animate-pulse">writing...</span>
                </div>
                <div className="pl-8 prose-response">
                  <MarkdownRenderer text={streamingText} />
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {isLoading && !streamingText && (
              <div className="message-appear">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-warm/12 to-sage/8 border border-warm/10 flex items-center justify-center animate-pulse-soft">
                    <SparklesIcon className="w-3.5 h-3.5 text-warm/80" />
                  </div>
                  <span className="text-[11px] text-parchment-dim/60 font-medium tracking-wide">Novel Weaver</span>
                </div>
                <div className="pl-8">
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 bg-warm/40 rounded-full typing-dot"></div>
                      <div className="h-1.5 w-1.5 bg-warm/40 rounded-full typing-dot"></div>
                      <div className="h-1.5 w-1.5 bg-warm/40 rounded-full typing-dot"></div>
                    </div>
                    <span className="text-parchment-faint/40 text-xs">thinking about your story...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ===== BOTTOM AREA (only when conversation has started) ===== */}
      {!isWelcome && (
        <>
          {/* Smart Suggestions */}
          <div className="flex-shrink-0 px-4 md:px-6 lg:px-12 pt-1">
            <div className="max-w-3xl mx-auto">
              <SmartSuggestions
                project={project}
                onSend={(prompt) => {
                  setInput(prompt);
                  inputRef.current?.focus();
                }}
                isLoading={isLoading}
                hasMessages={messages.length > 0}
              />
            </div>
          </div>

          {/* Composer */}
          <div className="flex-shrink-0 px-4 py-3 md:px-6 lg:px-12 md:pb-4 border-t border-ink-400/8 bg-ink-50/10 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <div className="bg-ink-100/60 backdrop-blur-xl rounded-2xl border border-ink-400/15 hover:border-warm/15 input-warm transition-all shadow-xl shadow-black/20 flex items-end p-1.5">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Discuss your story, ask for changes, or say 'write the next chapter'..."
                  className="flex-1 bg-transparent px-4 py-2.5 focus:outline-none resize-none overflow-hidden text-parchment text-sm min-h-[42px] font-sans placeholder:text-parchment-faint/30 leading-relaxed"
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-warm hover:bg-warm-light disabled:opacity-25 disabled:hover:bg-warm text-ink rounded-xl p-2.5 transition-all duration-200 hover:scale-105 disabled:hover:scale-100 flex-shrink-0"
                  title="Send"
                >
                  <SendIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatView;