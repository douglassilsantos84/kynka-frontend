import { useEffect, useMemo, useRef, useState } from "react";

import {
  askDocuments,
  deleteDocument,
  getDocument,
  getDocumentStats,
  getDocuments,
  reindexDocument,
  searchDocuments,
  uploadDocument,
} from "../api/kynkaApi";


export default function DocumentsPanel() {
  const fileRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [semanticQuery, setSemanticQuery] = useState("");

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");

  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  async function load() {
    try {
      const [docs, summary] = await Promise.all([
        getDocuments({
          category: category || null,
          search: searchText || null,
        }),
        getDocumentStats(),
      ]);

      setDocuments(docs);
      setStats(summary);

      if (
        selected
        && !docs.some(
          (item) => item.id === selected.id
        )
      ) {
        setSelected(null);
      }
    } catch (err) {
      setError(messageOf(err));
    }
  }


  useEffect(() => {
    load();
  }, []);


  async function handleUpload(event) {
    event.preventDefault();

    const file = fileRef.current?.files?.[0];

    if (!file) {
      setError("Selecione um documento.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await uploadDocument(
        file,
        {
          title: uploadTitle.trim() || null,
          category: uploadCategory || null,
        }
      );

      setSuccess(
        `Documento #${result.id} indexado com sucesso.`
      );

      setUploadTitle("");
      setUploadCategory("");

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      await load();
      setSelected(result);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }


  async function handleFilter(event) {
    event?.preventDefault();

    setBusy(true);
    setError("");

    try {
      const docs = await getDocuments({
        category: category || null,
        search: searchText || null,
      });

      setDocuments(docs);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }


  async function openDocument(documentId) {
    setBusy(true);
    setError("");

    try {
      const document = await getDocument(
        documentId
      );

      setSelected(document);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }


  async function handleReindex(documentId) {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const document = await reindexDocument(
        documentId
      );

      setSelected(document);

      setSuccess(
        `Documento #${documentId} reindexado.`
      );

      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }


  async function handleDelete(documentId) {
    const confirmed = window.confirm(
      "Remover este documento da biblioteca?"
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await deleteDocument(documentId);

      setSelected(null);
      setAnswer(null);

      setSuccess(
        `Documento #${documentId} removido.`
      );

      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }


  async function handleSearch(event) {
    event?.preventDefault();

    const query = semanticQuery.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const results = await searchDocuments(
        query,
        selected ? [selected.id] : null
      );

      setSearchResults(results);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }


  async function handleAsk(event) {
    event.preventDefault();

    const text = question.trim();

    if (!text) {
      return;
    }

    setChatBusy(true);
    setError("");
    setAnswer(null);

    try {
      const result = await askDocuments(
        text,
        selected ? [selected.id] : null
      );

      setAnswer(result);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setChatBusy(false);
    }
  }


  const categories = useMemo(() => {
    const values = new Set(
      documents
        .map((item) => item.category)
        .filter(Boolean)
    );

    Object.keys(
      stats?.categories || {}
    ).forEach((item) => values.add(item));

    return Array.from(values).sort();
  }, [documents, stats]);


  return (
    <section className="documents-page">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Etapa 22
          </span>

          <h2>
            Documentos & conhecimento
          </h2>

          <p>
            Biblioteca documental, extração,
            indexação RAG e respostas com fontes.
          </p>
        </div>
      </div>


      {error && (
        <div className="inventory-error">
          {error}
        </div>
      )}

      {success && (
        <div className="inventory-success">
          {success}
        </div>
      )}


      <div className="documents-kpis">
        <Metric
          label="Documentos"
          value={stats?.documents ?? 0}
        />

        <Metric
          label="Trechos indexados"
          value={stats?.chunks ?? 0}
        />

        <Metric
          label="Categorias"
          value={
            Object.keys(
              stats?.categories || {}
            ).length
          }
        />

        <Metric
          label="Formatos"
          value={
            stats?.supported_formats?.length
            ?? 5
          }
        />
      </div>


      <div className="documents-layout">
        <div className="documents-column">
          <form
            className="document-upload-card"
            onSubmit={handleUpload}
          >
            <div className="document-section-title">
              <div>
                <h3>
                  Adicionar documento
                </h3>

                <p>
                  PDF, Excel, Word, CSV ou TXT.
                </p>
              </div>

              <span className="document-rag-pill">
                RAG
              </span>
            </div>

            <label>
              Arquivo
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xlsx,.docx,.csv,.txt"
              />
            </label>

            <div className="document-form-grid">
              <label>
                Título opcional
                <input
                  value={uploadTitle}
                  onChange={(event) =>
                    setUploadTitle(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Contrato fornecedor"
                />
              </label>

              <label>
                Categoria
                <select
                  value={uploadCategory}
                  onChange={(event) =>
                    setUploadCategory(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Detectar automaticamente
                  </option>

                  <option value="cotacao">
                    Cotação
                  </option>

                  <option value="fatura">
                    Fatura
                  </option>

                  <option value="contrato">
                    Contrato
                  </option>

                  <option value="projeto">
                    Projeto
                  </option>

                  <option value="manual">
                    Manual
                  </option>

                  <option value="geral">
                    Geral
                  </option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={busy}
            >
              {busy
                ? "Processando..."
                : "Enviar e indexar"}
            </button>
          </form>


          <div className="document-library-card">
            <div className="document-section-title">
              <div>
                <h3>
                  Biblioteca
                </h3>

                <p>
                  {documents.length}
                  {" "}
                  documento(s) visível(is).
                </p>
              </div>
            </div>

            <form
              className="document-filter-bar"
              onSubmit={handleFilter}
            >
              <input
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="Nome ou conteúdo..."
              />

              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Todas as categorias
                </option>

                {categories.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {categoryLabel(item)}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="secondary-button"
              >
                Filtrar
              </button>
            </form>


            <div className="document-list">
              {documents.length === 0 ? (
                <div className="document-empty">
                  Nenhum documento na biblioteca.
                </div>
              ) : (
                documents.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      selected?.id === item.id
                        ? "document-row active"
                        : "document-row"
                    }
                    onClick={() =>
                      openDocument(item.id)
                    }
                  >
                    <div className="document-file-icon">
                      {item.file_type
                        ?.toUpperCase()
                        ?.slice(0, 4)}
                    </div>

                    <div className="document-row-main">
                      <strong>
                        {item.title
                          || item.original_name}
                      </strong>

                      <span>
                        {item.original_name}
                      </span>

                      <small>
                        {formatBytes(
                          item.size_bytes
                        )}
                        {" · "}
                        {formatDate(
                          item.created_at
                        )}
                      </small>
                    </div>

                    <div className="document-row-meta">
                      <span className="document-category">
                        {categoryLabel(
                          item.category
                        )}
                      </span>

                      <small>
                        #{item.id}
                      </small>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>


        <div className="documents-column">
          <div className="document-chat-card">
            <div className="document-section-title">
              <div>
                <h3>
                  Pergunte aos documentos
                </h3>

                <p>
                  {selected
                    ? `Escopo: ${selected.title || selected.original_name}`
                    : "Escopo: toda a biblioteca"}
                </p>
              </div>

              {selected && (
                <button
                  type="button"
                  className="document-clear-scope"
                  onClick={() => {
                    setSelected(null);
                    setAnswer(null);
                    setSearchResults([]);
                  }}
                >
                  Toda biblioteca
                </button>
              )}
            </div>

            <form
              className="document-question-form"
              onSubmit={handleAsk}
            >
              <textarea
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                placeholder="Ex.: Qual é o prazo desta proposta? Compare os valores e cite as fontes."
              />

              <button
                type="submit"
                className="primary-button"
                disabled={chatBusy}
              >
                {chatBusy
                  ? "Consultando..."
                  : "Perguntar à Kynka"}
              </button>
            </form>


            {answer && (
              <div className="document-answer">
                <div className="document-answer-head">
                  <strong>
                    Resposta fundamentada
                  </strong>

                  <span>
                    {answer.mode}
                  </span>
                </div>

                <p>
                  {answer.answer}
                </p>

                <div className="document-sources">
                  <strong>
                    Fontes utilizadas
                  </strong>

                  {answer.sources?.map(
                    (source, index) => (
                      <button
                        key={`${source.document_id}-${source.chunk_index}-${index}`}
                        type="button"
                        className="document-source"
                        onClick={() =>
                          openDocument(
                            source.document_id
                          )
                        }
                      >
                        <span>
                          Fonte {index + 1}
                          {" · "}
                          {source.document_name}
                        </span>

                        <small>
                          trecho
                          {" "}
                          {source.chunk_index}
                          {" · "}
                          score
                          {" "}
                          {Number(
                            source.score
                          ).toFixed(3)}
                        </small>

                        <p>
                          {source.excerpt}
                        </p>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>


          {selected && (
            <div className="document-detail-card">
              <div className="document-section-title">
                <div>
                  <h3>
                    {selected.title
                      || selected.original_name}
                  </h3>

                  <p>
                    Documento #{selected.id}
                    {" · "}
                    {categoryLabel(
                      selected.category
                    )}
                  </p>
                </div>

                <div className="document-detail-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      handleReindex(
                        selected.id
                      )
                    }
                    disabled={busy}
                  >
                    Reindexar
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      handleDelete(
                        selected.id
                      )
                    }
                    disabled={busy}
                  >
                    Remover
                  </button>
                </div>
              </div>

              <Metadata
                metadata={selected.metadata}
              />

              <details className="document-text-preview">
                <summary>
                  Texto extraído
                </summary>

                <pre>
                  {selected.extracted_text}
                </pre>
              </details>
            </div>
          )}


          <div className="document-semantic-search">
            <div className="document-section-title">
              <div>
                <h3>
                  Busca semântica
                </h3>

                <p>
                  Mostra os trechos mais relevantes
                  para uma consulta independente dos
                  filtros da biblioteca.
                </p>
              </div>
            </div>

            <form
              className="document-filter-bar"
              onSubmit={handleSearch}
            >
              <input
                value={semanticQuery}
                onChange={(event) =>
                  setSemanticQuery(
                    event.target.value
                  )
                }
                placeholder="Ex.: Disjuntor C16"
                aria-label="Consulta da busca semântica"
              />

              <button
                type="submit"
                className="secondary-button"
                disabled={
                  busy
                  || !semanticQuery.trim()
                }
              >
                {busy
                  ? "Buscando..."
                  : "Buscar trechos"}
              </button>
            </form>

            {searchResults.length === 0 ? (
              <div className="document-empty compact">
                Faça uma busca para inspecionar
                o retrieval do RAG.
              </div>
            ) : (
              <div className="semantic-results">
                {searchResults.map(
                  (item, index) => (
                    <button
                      key={`${item.document_id}-${item.chunk_index}-${index}`}
                      type="button"
                      className="semantic-result"
                      onClick={() =>
                        openDocument(
                          item.document_id
                        )
                      }
                    >
                      <div>
                        <strong>
                          {item.document_name}
                        </strong>

                        <span>
                          score
                          {" "}
                          {Number(
                            item.score
                          ).toFixed(3)}
                        </span>
                      </div>

                      <p>
                        {item.content}
                      </p>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


function Metric({ label, value }) {
  return (
    <div className="document-kpi">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}


function Metadata({ metadata }) {
  if (!metadata) {
    return null;
  }

  const entries = [
    ["Fornecedor", metadata.supplier],
    ["NIF", metadata.nifs],
    ["E-mails", metadata.emails],
    ["Data do documento", metadata.document_date],
    ["Datas encontradas", metadata.dates],
    ["Prazo de entrega", metadata.delivery_time],
    ["Validade da proposta", metadata.proposal_validity],
    ["Condições de pagamento", metadata.payment_terms],
    ["Valores", metadata.euro_values],
    ["Referências", metadata.references],
  ].filter(
    ([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return Boolean(value);
    }
  );

  if (entries.length === 0) {
    return (
      <div className="document-empty compact">
        Nenhum metadado estruturado detectado.
      </div>
    );
  }

  return (
    <div className="document-metadata-grid">
      {entries.map(([label, values]) => (
        <div key={label}>
          <span>
            {label}
          </span>

          <strong>
            {Array.isArray(values)
              ? values
                  .slice(0, 8)
                  .join(" · ")
              : values}
          </strong>
        </div>
      ))}
    </div>
  );
}


function categoryLabel(value) {
  const labels = {
    cotacao: "Cotação",
    fatura: "Fatura",
    contrato: "Contrato",
    projeto: "Projeto",
    manual: "Manual",
    geral: "Geral",
  };

  return labels[value] || value || "Geral";
}


function formatBytes(value) {
  const number = Number(value || 0);

  if (number < 1024) {
    return `${number} B`;
  }

  if (number < 1024 * 1024) {
    return `${(
      number / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    number / (1024 * 1024)
  ).toFixed(1)} MB`;
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "pt-PT",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}


function messageOf(error) {
  return error instanceof Error
    ? error.message
    : "Erro inesperado.";
}
