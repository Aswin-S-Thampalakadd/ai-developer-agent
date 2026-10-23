import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Code2,
  Plus,
  Send,
  Square,
  User,
  Sparkles,
  PanelLeft,
  FolderOpen,
} from "lucide-react";
import "./App.css";
import WorkspacePanel from "./WorkspacePanel";

const initialMessage = {
  role: "assistant",
  content:
    "Hello! I'm your AI Developer Agent. I can help you write code, debug errors, explain code, and design software. What would you like to build today?",
};

function App() {
  const [messages, setMessages] = useState([initialMessage]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("Checking...");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWorkspace, setShowWorkspace] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/api/health")
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Backend unavailable");
        }

        setModel(
          data.modelAvailable ? data.model : `${data.model} (not downloaded)`
        );
      })
      .catch(() => setModel("Disconnected"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text = prompt) {
    const content = text.trim();

    if (!content || loading) return;

    const previousMessages = messages.filter(
      (message) => message.role === "user" || message.role === "assistant"
    );

    const updatedMessages = [...messages, { role: "user", content }];

    setMessages(updatedMessages);
    setPrompt("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          history: previousMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate a response.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.message || "The model returned an empty response.",
        },
      ]);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function startNewChat() {
    if (loading) return;

    setMessages([initialMessage]);
    setPrompt("");
    setError("");
    setShowWorkspace(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <Code2 size={21} />
            </div>

            <div>
              <h2>DevAgent</h2>
              <span>Local AI workspace</span>
            </div>
          </div>

          <button
            className="new-chat"
            onClick={startNewChat}
            disabled={loading}
          >
            <Plus size={17} />
            New chat
          </button>

          <div className="sidebar-section">
            <span className="section-label">WORKSPACE</span>

            <button
              className="workspace-item"
              onClick={() => setShowWorkspace(true)}
            >
              <FolderOpen size={16} />
              <span>Project Explorer</span>
            </button>

            <button
              className="workspace-item"
              onClick={() => setShowWorkspace(false)}
            >
              <Bot size={16} />
              <span>AI Assistant</span>
            </button>
          </div>

          <div className="sidebar-bottom">
            <div className="status-indicator">
              <span
                className={`status-dot ${
                  model === "Disconnected" ? "offline" : ""
                }`}
              />

              <div>
                <strong>Ollama</strong>
                <span>{model}</span>
              </div>
            </div>
          </div>
        </aside>
      )}

      <main className="main-panel">
        <header className="topbar">
          <button
            className="icon-button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle sidebar"
          >
            <PanelLeft size={19} />
          </button>

          <div className="breadcrumb">
            <span>DevAgent</span>
            <span className="breadcrumb-divider">/</span>
            <strong>
              {showWorkspace ? "Project Explorer" : "New conversation"}
            </strong>
          </div>

          <div className="local-badge">
            <span
              className={`status-dot ${
                model === "Disconnected" ? "offline" : ""
              }`}
            />
            Local model
          </div>
        </header>

        {showWorkspace ? (
          <div className="workspace-page">
            <WorkspacePanel />
          </div>
        ) : (
          <section className="chat-area">
            <div className="messages">
              {messages.length === 1 && (
                <div className="welcome">
                  <div className="welcome-icon">
                    <Sparkles size={27} />
                  </div>

                  <h1>What are we building today?</h1>

                  <p>
                    Describe your coding task. Your local AI assistant will help
                    you work through it.
                  </p>

                  <div className="suggestions">
                    {[
                      "Create a React login page",
                      "Explain Node.js middleware",
                      "Debug a PostgreSQL query",
                      "Design a REST API",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        className="suggestion"
                        onClick={() => sendMessage(suggestion)}
                        disabled={loading}
                      >
                        <Code2 size={16} />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => {
                if (index === 0 && message.role === "assistant") {
                  return null;
                }

                return (
                  <article
                    className={`message ${message.role}`}
                    key={`${index}-${message.role}`}
                  >
                    <div className="message-avatar">
                      {message.role === "assistant" ? (
                        <Bot size={18} />
                      ) : (
                        <User size={18} />
                      )}
                    </div>

                    <div className="message-body">
                      <span className="message-author">
                        {message.role === "assistant" ? "DevAgent" : "You"}
                      </span>

                      <div className="message-content">{message.content}</div>
                    </div>
                  </article>
                );
              })}

              {loading && (
                <div className="message assistant">
                  <div className="message-avatar">
                    <Bot size={18} />
                  </div>

                  <div className="message-body">
                    <span className="message-author">DevAgent</span>

                    <div className="thinking">
                      <span />
                      <span />
                      <span />
                      <small>Thinking with Ollama...</small>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <strong>Request failed</strong>
                  <p>{error}</p>
                  <button onClick={() => setError("")}>Dismiss</button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="composer-wrap">
              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
              >
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask DevAgent to write, explain, or debug code..."
                  rows={2}
                  disabled={loading}
                />

                <div className="composer-footer">
                  <span>
                    <Code2 size={14} />
                    Qwen via Ollama
                    <span className="keyboard-hint">
                      Enter to send · Shift+Enter for new line
                    </span>
                  </span>

                  <button
                    className="send-button"
                    type="submit"
                    disabled={!prompt.trim() || loading}
                    aria-label="Send message"
                  >
                    {loading ? <Square size={16} /> : <Send size={17} />}
                    {loading ? "Working..." : "Send"}
                  </button>
                </div>
              </form>

              <p className="disclaimer">
                Local AI can make mistakes. Review generated code before using
                it.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
