import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { getRequest, postRequest, deleteRequest } from '../api/api';
import { Conversation, Message } from '../types';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

// Simple Markdown Parser
function simpleMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950 p-4 rounded-xl text-slate-300 font-mono text-sm my-3 overflow-x-auto border border-slate-800">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-900 px-1.5 py-0.5 rounded text-accent font-mono text-sm">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\n)\*(?![ \n])([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/^[ \t]*[*-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/((<li>.*<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>')
    .replace(/\n\n+/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br />')
    .replace(/^(.+)$/, '<p>$1</p>');
}

export const Assistant: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your CloudNotes AI assistant 🤖 Ask me anything about your notes and I'll search through them to answer.",
    },
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const list = await getRequest('/assistant/conversations');
      setConversations(list || []);
    } catch (error) {
      console.error('Failed to load conversations', error);
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, []);

  // Fetch active conversation messages
  useEffect(() => {
    if (activeId) {
      getRequest(`/assistant/conversations/${activeId}`).then((data) => {
        setMessages(data.messages || []);
      });
    }
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', loading: true },
    ]);
    setLoading(true);

    try {
      const data = await postRequest('/assistant/ask', {
        question,
        limit: 5,
        conversation_id: activeId || undefined,
      });

      if (!activeId && data.conversation_id) {
        setActiveId(data.conversation_id);
        loadConversations();
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
          model: data.model,
          loading: false,
        };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '⚠️ Sorry, I could not connect with the AI service. Please verify your connection.',
          loading: false,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveId(null);
    setInput('');
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm your CloudNotes AI assistant 🤖 Ask me anything about your notes and I'll search through them to answer.",
      },
    ]);
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();

    const result = await Swal.fire({
      title: 'Delete Chat?',
      text: 'This conversation will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Yes, delete',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    });

    if (result.isConfirmed) {
      try {
        await deleteRequest(`/assistant/conversations/${id}`);
        if (activeId === id) handleNewChat();
        loadConversations();
        toast.success('Conversation deleted');
      } catch {
        toast.error('Failed to delete conversation');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl border border-border bg-surface overflow-hidden shadow-light-card dark:shadow-none animate-in fade-in duration-300">
      {/* Sidebar - Recent Chats */}
      <div className="w-72 border-r border-border flex flex-col bg-background/30">
        <div className="p-4 border-b border-border">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all shadow-md shadow-accent/15 flex items-center justify-center gap-2"
          >
            <i className="ti ti-plus" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarLoading ? (
            <div className="text-center py-8 text-xs text-text-secondary">Loading discussions...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-secondary">No recent discussions</div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-accent/10 border-accent/20 text-accent font-semibold'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <i className="ti ti-message-2 text-lg shrink-0" />
                    <span className="text-sm truncate pr-1">{conv.title || 'Untitled Chat'}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 rounded transition-all"
                  >
                    <i className="ti ti-trash text-sm" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 flex flex-col bg-surface">
        {/* Stream Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-text-primary">
              {activeId ? conversations.find((c) => c.id === activeId)?.title || 'Discussion' : 'New AI Session'}
            </h3>
            <p className="text-xs text-text-secondary">
              {activeId ? 'Active session' : 'Ask questions referencing your imported notes'}
            </p>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs font-mono">
            <i className="ti ti-bolt text-sm animate-pulse" />
            CloudNotes AI
          </span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                    isUser
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-accent/10 text-accent border-accent/20'
                  }`}
                >
                  <i className={`ti ${isUser ? 'ti-user' : 'ti-robot'} text-xl`} />
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[70%] space-y-2`}>
                  {msg.loading ? (
                    <div className="bg-background/50 border border-border/80 px-4 py-3 rounded-2xl flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  ) : (
                    <>
                      <div
                        className={`px-4.5 py-3 rounded-2xl border text-sm leading-relaxed ${
                          isUser
                            ? 'bg-accent/10 border-accent/20 text-text-primary rounded-tr-none'
                            : 'bg-background/40 border-border/70 text-text-primary rounded-tl-none font-serif'
                        }`}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(isUser ? msg.content : simpleMarkdown(msg.content)) }}
                      />

                      {/* Render note sources */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {msg.sources.map((src, sIdx) => {
                            const name = src.metadata?.title || `Note #${src.note_id}`;
                            return <SourceChip key={sIdx} name={name} text={src.chunk_text} />;
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-background/10">
          <div className="flex items-end gap-3 max-w-4xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask me a question about your uploaded notes..."
              rows={2}
              className="flex-grow bg-background border border-border focus:border-accent rounded-2xl px-4 py-3 text-sm focus:outline-none resize-none pr-14"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-3 bottom-3 w-10 h-10 bg-accent hover:bg-accent-hover disabled:bg-accent/40 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-accent/15"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <i className="ti ti-send" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Expandable source block chip
const SourceChip: React.FC<{ name: string; text: string }> = ({ name, text }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col items-start">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-background border border-border hover:border-accent/40 text-text-secondary hover:text-accent font-mono text-[0.72rem] transition-all"
      >
        <i className="ti ti-file-text text-xs" />
        {name}
        <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'} text-[0.6rem]`} />
      </button>

      {expanded && (
        <div className="mt-1.5 p-3 rounded-xl bg-background/60 border border-border text-xs text-text-secondary max-w-md whitespace-pre-wrap leading-relaxed shadow-sm font-sans">
          {text}
        </div>
      )}
    </div>
  );
};

