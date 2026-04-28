import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { all_routes } from "../router/all_routes";
import {
  postAskAssistant,
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
} from "./src/assistantApis";

import Swal from "sweetalert2";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Lightweight Markdown → HTML converter
// ---------------------------------------------------------------------------
function simpleMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\n)\*(?![ \n])([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/^[ \t]*[\*\-] (.+)$/gm, "<li>$1</li>")
    .replace(/((<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br />")
    .replace(/^(.+)$/, "<p>$1</p>");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Source {
  note_id: number;
  chunk_index: number;
  chunk_text: string;
  metadata?: { title?: string; user_id?: number };
}

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  model?: string;
  loading?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

const SourceChip: React.FC<{ source: Source; index: number }> = ({ source }) => {
  const [open, setOpen] = useState(false);
  const title = source.metadata?.title || `Note #${source.note_id}`;

  return (
    <div className="assistant-source-chip">
      <button
        className="btn btn-sm btn-outline-secondary py-0 px-2"
        style={{ fontSize: "0.72rem" }}
        onClick={() => setOpen((o) => !o)}
        title={title}
      >
        <i className="ti ti-file-text me-1" />
        {title}
        <i className={`ti ms-1 ${open ? "ti-chevron-up" : "ti-chevron-down"}`} />
      </button>
      {open && (
        <div
          className="card mt-1 p-2"
          style={{ fontSize: "0.78rem", background: "var(--bs-light)", whiteSpace: "pre-wrap" }}
        >
          {source.chunk_text}
        </div>
      )}
    </div>
  );
};

const BubbleLoader: React.FC = () => (
  <div className="assistant-bubble assistant-bubble--ai d-flex align-items-center gap-1 px-3 py-2">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="assistant-dot"
        style={{ animationDelay: `${i * 0.18}s` }}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const Assistant: React.FC = () => {
  const route = all_routes;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation list
  const refreshConversations = useCallback(async () => {
    try {
      const list = await getConversations();
      setConversations(list);
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load specific conversation
  useEffect(() => {
    if (activeId) {
      getConversation(activeId).then((data) => {
        setMessages(data.messages || []);
      });
    } else {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm your CloudNotes AI assistant 🤖 Ask me anything about your notes and I'll search through them to answer.",
        },
      ]);
    }
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", loading: true },
    ]);
    setLoading(true);

    try {
      const data = await postAskAssistant(question, activeId || undefined);
      
      // If it was a new conversation, update active ID and refresh list
      if (!activeId && data.conversation_id) {
        setActiveId(data.conversation_id);
        refreshConversations();
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
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
          role: "assistant",
          content: "⚠️ Sorry, I couldn't reach the AI service. Please try again.",
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
    setInput("");
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    
    const result = await Swal.fire({
      title: "Delete conversation?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      background: "#fff",
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-light"
      },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      try {
        await deleteConversation(id);
        if (activeId === id) handleNewChat();
        refreshConversations();
        toast.success("Conversation deleted");
      } catch (err) {
        console.error("Delete failed", err);
        toast.error("Failed to delete");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content d-flex p-0" style={{ height: "calc(100vh - 60px)" }}>
        
        {/* ── Sidebar ── */}
        <div className="assistant-sidebar border-end d-flex flex-column bg-light shadow-sm" style={{ width: 280 }}>
          <div className="p-3 border-bottom">
            <button 
              className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={handleNewChat}
            >
              <i className="ti ti-plus" />
              New Chat
            </button>
          </div>
          
          <div className="flex-grow-1 overflow-auto">
            {sidebarLoading ? (
              <div className="p-3 text-center text-muted">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-3 text-center text-muted small">No recent chats</div>
            ) : (
              <div className="list-group list-group-flush">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3 border-0 ${activeId === conv.id ? 'active bg-primary-subtle text-primary border-start border-primary border-4' : ''}`}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setActiveId(conv.id)}
                  >
                    <div className="text-truncate flex-grow-1 me-2" style={{ fontSize: '0.88rem' }}>
                      <i className="ti ti-message-2 me-2" />
                      {conv.title || 'Untitled Chat'}
                    </div>
                    <button 
                      className="btn btn-link btn-sm p-0 text-muted hover-danger"
                      onClick={(e) => handleDeleteChat(e, conv.id)}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-top bg-white">
             <span className="d-flex align-items-center gap-2 px-2 text-muted" style={{ fontSize: "0.72rem" }}>
                <i className="ti ti-brain text-primary" />
                RAG Persistence Active
             </span>
          </div>
        </div>

        {/* ── Main Chat Area ── */}
        <div className="flex-grow-1 d-flex flex-column bg-white">
          
          {/* Header */}
          <div className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
            <div>
              <h5 className="mb-0 fs-16">
                {activeId 
                  ? conversations.find(c => c.id === activeId)?.title || 'AI Chat' 
                  : 'New Assistant Session'
                }
              </h5>
              <div className="text-muted small">
                 {activeId ? 'Continuing conversation' : 'Ask me anything about your notes'}
              </div>
            </div>
            <div className="d-flex gap-2">
               <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                  <i className="ti ti-bolt me-1" />
                  Ollama / Gemma 3
               </span>
            </div>
          </div>

          {/* Chat feed */}
          <div
            className="flex-grow-1 overflow-auto p-4"
            id="assistant-chat-feed"
            style={{ scrollBehavior: "smooth", background: "#fdfdfd" }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`d-flex mb-4 ${msg.role === "user" ? "justify-content-end" : "justify-content-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-3 shadow-sm"
                    style={{ width: 38, height: 38, background: "#7367f0", color: "#fff", fontSize: 20 }}
                  >
                    <i className="ti ti-robot" />
                  </div>
                )}

                <div style={{ maxWidth: "80%" }}>
                  {msg.loading ? (
                    <BubbleLoader />
                  ) : (
                    <>
                      <div
                        className={`assistant-bubble shadow-sm ${msg.role === "user" ? "assistant-bubble--user" : "assistant-bubble--ai"}`}
                        {...(msg.role === "assistant"
                          ? { dangerouslySetInnerHTML: { __html: DOMPurify.sanitize(simpleMarkdown(msg.content)) } }
                          : { children: msg.content }
                        )}
                      />

                      {/* Sources */}
                      {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {msg.sources.map((src, si) => (
                            <SourceChip key={si} source={src} index={si} />
                          ))}
                        </div>
                      )}

                      {msg.model && msg.role === "assistant" && (
                        <div className="text-muted mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.65rem" }}>
                          <i className="ti ti-cpu" />
                          Generated via {msg.model}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {msg.role === "user" && (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ms-3 shadow-sm"
                    style={{ width: 38, height: 38, background: "#ea5455", color: "#fff", fontSize: 20 }}
                  >
                    <i className="ti ti-user" />
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-top bg-white">
            <div className="d-flex align-items-end gap-3 max-width-1000 mx-auto">
              <div className="flex-grow-1 position-relative">
                <textarea
                  id="assistant-input"
                  className="form-control shadow-none border-2"
                  rows={2}
                  placeholder="Ask a question about your notes... (Shift+Enter for newline)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  style={{ resize: "none", paddingRight: 50, borderRadius: 12 }}
                />
              </div>
              <button
                id="assistant-send-btn"
                className="btn btn-primary btn-lg shadow-sm"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{ height: 62, width: 62, borderRadius: 12 }}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="ti ti-send fs-4" />
                )}
              </button>
            </div>
            <div className="text-center mt-2 text-muted" style={{ fontSize: "0.72rem" }}>
              CloudNotes AI can help summarize, answer, or find connections in your notes.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .assistant-sidebar .list-group-item.active {
           background-color: rgba(115, 103, 240, 0.08) !important;
           color: #7367f0 !important;
        }
        .assistant-sidebar .hover-danger:hover {
           color: #ea5455 !important;
        }
        .assistant-bubble {
          padding: 14px 18px;
          border-radius: 18px;
          line-height: 1.6;
          font-size: 0.95rem;
        }
        .assistant-bubble--user {
          background: linear-gradient(135deg, #ea5455 0%, #ff9f43 100%);
          color: #fff;
          border-bottom-right-radius: 4px;
          white-space: pre-wrap;
        }
        .assistant-bubble--ai {
          background: #fff;
          border: 1px solid #ebe9f1;
          color: #5e5873;
          border-bottom-left-radius: 4px;
        }
        .assistant-bubble--ai p { margin: 0 0 0.75em 0; }
        .assistant-bubble--ai p:last-child { margin-bottom: 0; }
        .assistant-bubble--ai ul {
          margin: 0.5em 0 0.75em 0;
          padding-left: 1.5em;
        }
        .assistant-bubble--ai li { margin-bottom: 0.3em; }
        .assistant-bubble--ai code {
          background: #f8f8f8;
          color: #d63384;
          border-radius: 4px;
          padding: 2px 5px;
          font-size: 0.9em;
        }
        .assistant-bubble--ai pre {
          background: #282c34;
          color: #abb2bf;
          border-radius: 8px;
          padding: 15px;
          margin: 1em 0;
          overflow-x: auto;
        }
        .assistant-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #7367f0;
          animation: assistantBounce 0.9s infinite ease-in-out;
        }
        @keyframes assistantBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
        .assistant-source-chip { display: inline-block; }
        .max-width-1000 { max-width: 1000px; }
      `}</style>
    </div>
  );
};

export default Assistant;
