import {
  useEffect,
  useState,
} from "react";

import {
  getCapabilities,
  getInventorySummary,
  getStatus,
} from "../api/kynkaApi";


export default function Dashboard({
  online,
  onNavigate,
}) {
  const [status, setStatus] = useState(null);

  const [summary, setSummary] = useState({
    total_materials: 0,
    below_minimum: 0,
    zero_stock: 0,
  });

  const [capabilities, setCapabilities] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [
        statusData,
        summaryData,
        capabilitiesData,
      ] = await Promise.all([
        getStatus(),
        getInventorySummary(),
        getCapabilities(),
      ]);

      setStatus(statusData);
      setSummary(summaryData);
      setCapabilities(capabilitiesData);

    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro ao carregar o dashboard."
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <section className="dashboard">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Visão geral
          </span>

          <h2>Dashboard</h2>

          <p>
            Estado atual da plataforma Kynka e dos
            recursos empresariais conectados.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading
            ? "Atualizando..."
            : "Atualizar"}
        </button>
      </div>

      {error && (
        <div className="inventory-error">
          {error}
        </div>
      )}

      <div className="dashboard-grid">
        <MetricCard
          label="Backend"
          value={
            online
              ? "Online"
              : "Offline"
          }
          detail="API Kynka"
          state={
            online
              ? "success"
              : "danger"
          }
        />

        <MetricCard
          label="Modelo"
          value={
            status?.model ??
            "—"
          }
          detail="LLM local"
        />

        <MetricCard
          label="Materiais"
          value={summary.total_materials}
          detail="Cadastrados no estoque"
        />

        <MetricCard
          label="Abaixo do mínimo"
          value={summary.below_minimum}
          detail="Requerem atenção"
          state={
            summary.below_minimum > 0
              ? "warning"
              : "success"
          }
        />

        <MetricCard
          label="Sem estoque"
          value={summary.zero_stock}
          detail="Quantidade igual a zero"
          state={
            summary.zero_stock > 0
              ? "danger"
              : "success"
          }
        />

        <MetricCard
          label="Capabilities"
          value={capabilities.length}
          detail="Ferramentas disponíveis"
        />
      </div>

      <div className="dashboard-content-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3>Acesso rápido</h3>

              <p>
                Entre diretamente nos módulos
                operacionais.
              </p>
            </div>
          </div>

          <div className="quick-actions">
            <button
              type="button"
              className="quick-action"
              onClick={() =>
                onNavigate("chat")
              }
            >
              <div className="quick-action-icon">
                AI
              </div>

              <div>
                <strong>
                  Conversar com a Kynka
                </strong>

                <span>
                  Execute tarefas e consulte
                  informações.
                </span>
              </div>

              <span className="quick-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="quick-action"
              onClick={() =>
                onNavigate("inventory")
              }
            >
              <div className="quick-action-icon">
                ST
              </div>

              <div>
                <strong>
                  Consultar estoque
                </strong>

                <span>
                  Materiais, quantidades e
                  estoque mínimo.
                </span>
              </div>

              <span className="quick-arrow">
                →
              </span>
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3>Capabilities</h3>

              <p>
                Recursos disponíveis para o agente.
              </p>
            </div>

            <span className="count-badge">
              {capabilities.length}
            </span>
          </div>

          <div className="capability-list">
            {loading ? (
              <div className="dashboard-empty">
                Carregando...
              </div>
            ) : capabilities.length === 0 ? (
              <div className="dashboard-empty">
                Nenhuma capability encontrada.
              </div>
            ) : (
              capabilities.map(
                (capability) => (
                  <div
                    className="capability-item"
                    key={capability.name}
                  >
                    <div className="capability-dot" />

                    <div>
                      <strong>
                        {capability.name}
                      </strong>

                      <span>
                        {capability.description}
                      </span>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


function MetricCard({
  label,
  value,
  detail,
  state = "default",
}) {
  return (
    <div
      className={
        `metric-card ${state}`
      }
    >
      <div className="metric-label">
        {label}
      </div>

      <div className="metric-value">
        {value}
      </div>

      <div className="metric-detail">
        {detail}
      </div>
    </div>
  );
}

