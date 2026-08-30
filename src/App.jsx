import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./App.css";

import {
  checkHealth,
  sendMessage,
} from "./api/kynkaApi";

import ChatMessage from "./components/ChatMessage";
import Dashboard from "./components/Dashboard";
import DocumentsPanel from "./components/DocumentsPanel";
import InventoryPanel from "./components/InventoryPanel";
import ProjectsPanel from "./components/ProjectsPanel";
import QuoteImportsPanel from "./components/QuoteImportsPanel";
import SuppliersPanel from "./components/SuppliersPanel";
import StatusBadge from "./components/StatusBadge";


const initialMessages = [
  {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "Olá! Eu sou a Kynka. Como posso ajudar?",
  },
];


const navigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "DB",
  },
  {
    id: "chat",
    label: "Chat",
    icon: "AI",
  },
  {
    id: "inventory",
    label: "Estoque",
    icon: "ST",
  },
  {
    id: "projects",
    label: "Projetos",
    icon: "PR",
  },
  {
    id: "quotes",
    label: "Cotações",
    icon: "CT",
  },
  {
    id: "suppliers",
    label: "Fornecedores",
    icon: "FN",
  },
  {
    id: "documents",
    label: "Documentos",
    icon: "DC",
  },
];


export default function App() {
  const [activePage, setActivePage] =
    useState("dashboard");

  const [messages, setMessages] =
    useState(initialMessages);

  const [input, setInput] =
    useState("");

  const [sessionId, setSessionId] =
    useState(null);

  const [online, setOnline] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const messagesEndRef =
    useRef(null);


  useEffect(() => {
    async function verifyBackend() {
      try {
        await checkHealth();
        setOnline(true);
      } catch {
        setOnline(false);
      }
    }

    verifyBackend();

    const interval = setInterval(
      verifyBackend,
      10000
    );

    return () =>
      clearInterval(interval);
  }, []);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);


  function navigate(page) {
    setActivePage(page);
    setSidebarOpen(false);
  }


  async function handleSubmit(event) {
    event.preventDefault();

    const text = input.trim();

    if (!text || loading) {
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const response =
        await sendMessage(
          text,
          sessionId
        );

      setSessionId(
        response.session_id
      );

      setOnline(true);

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          response.result ??
          (
            response.success
              ? "Tarefa concluída."
              : "Não foi possível concluir a tarefa."
          ),
        error: response.error,
        mode: response.mode,
        capability:
          response.capability,
        steps: response.steps,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

    } catch (error) {
      setOnline(false);

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          error:
            error instanceof Error
              ? error.message
              : "Erro ao comunicar com a Kynka.",
        },
      ]);

    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="app-shell">
      <aside
        className={
          sidebarOpen
            ? "sidebar open"
            : "sidebar"
        }
      >
        <div className="sidebar-brand">
          <div className="logo">
            K
          </div>

          <div>
            <h1>KYNKA</h1>

            <span>
              Agentic Platform
            </span>
          </div>
        </div>


        <div className="sidebar-section-label">
          Plataforma
        </div>


        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                activePage === item.id
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
              onClick={() =>
                navigate(item.id)
              }
            >
              <span className="sidebar-icon">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </button>
          ))}
        </nav>


        <div className="sidebar-section-label future">
          Próximos módulos
        </div>


        <div className="future-modules">
          <div>Financeiro</div>
          <div>Clientes</div>
          <div>Integrações</div>
        </div>


        <div className="sidebar-footer">
          <StatusBadge
            online={online}
          />
        </div>
      </aside>


      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}


      <div className="workspace">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            ☰
          </button>


          <div>
            <span className="topbar-label">
              Kynka
            </span>

            <strong>
              {getPageTitle(activePage)}
            </strong>
          </div>


          <div className="topbar-right">
            {sessionId && (
              <span
                className="session"
                title={sessionId}
              >
                Sessão ativa
              </span>
            )}

            <div className="topbar-status">
              <StatusBadge
                online={online}
              />
            </div>
          </div>
        </header>


        <main
          className={
            activePage === "chat"
              ? "workspace-content chat-page"
              : "workspace-content"
          }
        >

          {/* =================================================
              DASHBOARD
              ================================================= */}

          {activePage === "dashboard" && (
            <Dashboard
              online={online}
              onNavigate={navigate}
            />
          )}


          {/* =================================================
              CHAT
              ================================================= */}

          {activePage === "chat" && (
            <section className="chat">
              <div className="chat-header">
                <div>
                  <span className="page-eyebrow">
                    Assistente
                  </span>

                  <h2>Kynka Agent</h2>

                  <p>
                    Converse com a plataforma,
                    consulte dados e execute tarefas.
                  </p>
                </div>
              </div>


              <div className="messages">
                {messages.map(
                  (message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                    />
                  )
                )}


                {loading && (
                  <div className="message-row assistant">
                    <div className="message-content">
                      <div className="message-author">
                        Kynka
                      </div>

                      <div className="message-bubble typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}


                <div
                  ref={messagesEndRef}
                />
              </div>


              <form
                className="composer"
                onSubmit={handleSubmit}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  placeholder={
                    online
                      ? "Digite uma mensagem para a Kynka..."
                      : "Backend offline..."
                  }
                  disabled={loading}
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={
                    !input.trim()
                    || loading
                  }
                >
                  Enviar
                </button>
              </form>
            </section>
          )}


          {/* =================================================
              ESTOQUE
              ================================================= */}

          {activePage === "inventory" && (
            <InventoryPanel />
          )}


          {/* =================================================
              PROJETOS
              ================================================= */}

          {activePage === "projects" && (
            <ProjectsPanel />
          )}


          {/* =================================================
              FORNECEDORES
              ================================================= */}

          {activePage === "suppliers" && (
            <SuppliersPanel />
          )}
          {activePage === "quotes" && (
            <QuoteImportsPanel />
          )}

          {activePage === "documents" && (
            <DocumentsPanel />
          )}

        </main>
      </div>
    </div>
  );
}


function getPageTitle(page) {
  const titles = {
    dashboard: "Dashboard",
    chat: "Chat",
    inventory: "Estoque",
    projects: "Projetos",
    suppliers: "Fornecedores",
    quotes: "Cotações",
    documents: "Documentos",
  };

  return titles[page] ?? "Kynka";
}