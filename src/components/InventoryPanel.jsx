import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createInventoryMovement,
  createMaterial,
  deleteMaterial,
  getInventory,
  getInventoryMovements,
  getInventorySummary,
  getLowStock,
  importInventory,
  searchInventory,
  updateMaterial,
} from "../api/kynkaApi";


const EMPTY_MATERIAL = {
  code: "",
  name: "",
  quantity: 0,
  unit: "un",
  minimum_quantity: 0,
};


export default function InventoryPanel() {
  const [materials, setMaterials] = useState([]);

  const [summary, setSummary] = useState({
    total_materials: 0,
    below_minimum: 0,
    zero_stock: 0,
  });

  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importResult, setImportResult] = useState(null);

  const [materialModal, setMaterialModal] = useState(null);
  const [movementModal, setMovementModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const fileInputRef = useRef(null);


  async function refreshSummary() {
    const data = await getInventorySummary();
    setSummary(data);
  }


  async function loadInventory() {
    setLoading(true);
    setError("");

    try {
      const [inventoryData, summaryData] =
        await Promise.all([
          getInventory(),
          getInventorySummary(),
        ]);

      setMaterials(inventoryData);
      setSummary(summaryData);

    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Erro ao carregar o estoque."
      ));

    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadInventory();
  }, []);


  async function refreshCurrentView() {
    try {
      await refreshSummary();

      if (showLowStock) {
        const data = await getLowStock();
        setMaterials(data);
        return;
      }

      if (search.trim()) {
        const data = await searchInventory(search.trim());
        setMaterials(data);
        return;
      }

      const data = await getInventory();
      setMaterials(data);

    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Erro ao atualizar o estoque."
      ));
    }
  }


  async function handleSearch(event) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      setShowLowStock(false);
      await loadInventory();
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setShowLowStock(false);

    try {
      const data = await searchInventory(query);
      setMaterials(data);

    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Erro ao pesquisar materiais."
      ));

    } finally {
      setLoading(false);
    }
  }


  async function handleLowStock() {
    setLoading(true);
    setError("");
    setSuccess("");
    setSearch("");

    try {
      const data = await getLowStock();

      setMaterials(data);
      setShowLowStock(true);

    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Erro ao consultar estoque mínimo."
      ));

    } finally {
      setLoading(false);
    }
  }


  async function handleShowAll() {
    setSearch("");
    setShowLowStock(false);
    setImportResult(null);
    setSuccess("");

    await loadInventory();
  }


  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const result = await importInventory(file);

      setImportResult(result);

      await loadInventory();

    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Erro ao importar a planilha."
      ));

    } finally {
      setImporting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }


  function openCreateMaterial() {
    setError("");
    setSuccess("");

    setMaterialModal({
      mode: "create",
      material: { ...EMPTY_MATERIAL },
    });
  }


  function openEditMaterial(material) {
    setError("");
    setSuccess("");

    setMaterialModal({
      mode: "edit",
      material: { ...material },
    });
  }


  function openMovement(material, type) {
    setError("");
    setSuccess("");

    setMovementModal({
      material,
      type,
    });
  }


  async function openHistory(material) {
    setError("");
    setSuccess("");

    setHistoryModal({
      material,
      loading: true,
      movements: [],
      error: "",
    });

    try {
      const movements = await getInventoryMovements(
        material.code
      );

      setHistoryModal({
        material,
        loading: false,
        movements,
        error: "",
      });

    } catch (requestError) {
      setHistoryModal({
        material,
        loading: false,
        movements: [],
        error: getErrorMessage(
          requestError,
          "Erro ao carregar o histórico."
        ),
      });
    }
  }


  const title = useMemo(() => {
    if (showLowStock) {
      return "Materiais abaixo do mínimo";
    }

    if (search.trim()) {
      return `Resultado da pesquisa: ${search}`;
    }

    return "Todos os materiais";

  }, [
    showLowStock,
    search,
  ]);


  return (
    <section className="inventory-panel">
      <div className="inventory-header">
        <div>
          <span className="page-eyebrow">
            Gestão empresarial
          </span>

          <h2>Estoque</h2>

          <p>
            Gerencie materiais, movimentações
            e níveis de estoque da empresa.
          </p>
        </div>

        <div className="inventory-actions">
          <button
            className="primary-button"
            type="button"
            onClick={openCreateMaterial}
          >
            + Novo material
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            hidden
          />

          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={importing}
          >
            {importing
              ? "Importando..."
              : "Importar planilha"}
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={handleShowAll}
            disabled={loading}
          >
            Atualizar
          </button>
        </div>
      </div>


      <div className="inventory-summary">
        <SummaryCard
          label="Materiais"
          value={summary.total_materials}
        />

        <SummaryCard
          label="Abaixo do mínimo"
          value={summary.below_minimum}
          attention={summary.below_minimum > 0}
        />

        <SummaryCard
          label="Sem estoque"
          value={summary.zero_stock}
          attention={summary.zero_stock > 0}
        />
      </div>


      {success && (
        <div className="inventory-success">
          {success}
        </div>
      )}


      {importResult && (
        <div className="inventory-success">
          <strong>
            Planilha importada com sucesso.
          </strong>

          <span>
            {importResult.imported} importados ·{" "}
            {importResult.skipped} ignorados
          </span>

          {importResult.errors?.length > 0 && (
            <div>
              {importResult.errors.map(
                (importError, index) => (
                  <div key={index}>
                    {importError}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}


      {error && (
        <div className="inventory-error">
          {error}
        </div>
      )}


      <div className="inventory-toolbar">
        <form
          className="inventory-search"
          onSubmit={handleSearch}
        >
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Pesquisar por código ou material..."
          />

          <button
            type="submit"
            disabled={loading}
          >
            Pesquisar
          </button>
        </form>


        <div className="inventory-filter-buttons">
          <button
            type="button"
            className={
              showLowStock
                ? "filter-button active"
                : "filter-button"
            }
            onClick={handleLowStock}
          >
            Abaixo do mínimo
          </button>

          <button
            type="button"
            className={
              !showLowStock && !search
                ? "filter-button active"
                : "filter-button"
            }
            onClick={handleShowAll}
          >
            Todos
          </button>
        </div>
      </div>


      <div className="inventory-table-card">
        <div className="inventory-table-header">
          <h3>{title}</h3>

          <span>
            {materials.length} registro
            {materials.length === 1 ? "" : "s"}
          </span>
        </div>


        {loading ? (
          <div className="inventory-empty">
            Carregando estoque...
          </div>

        ) : materials.length === 0 ? (
          <div className="inventory-empty">
            Nenhum material encontrado.
          </div>

        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Material</th>
                  <th>Quantidade</th>
                  <th>Unidade</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {materials.map((material) => (
                  <tr key={material.code}>
                    <td className="material-code">
                      {material.code}
                    </td>

                    <td>
                      {material.name}
                    </td>

                    <td>
                      {formatNumber(material.quantity)}
                    </td>

                    <td>
                      {material.unit}
                    </td>

                    <td>
                      {formatNumber(
                        material.minimum_quantity
                      )}
                    </td>

                    <td>
                      <StockStatus material={material} />
                    </td>

                    <td>
                      <MaterialActions
                        material={material}
                        onEntry={() =>
                          openMovement(material, "entry")
                        }
                        onExit={() =>
                          openMovement(material, "exit")
                        }
                        onAdjustment={() =>
                          openMovement(
                            material,
                            "adjustment"
                          )
                        }
                        onEdit={() =>
                          openEditMaterial(material)
                        }
                        onHistory={() =>
                          openHistory(material)
                        }
                        onDelete={() =>
                          setDeleteModal(material)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {materialModal && (
        <MaterialModal
          data={materialModal}
          onClose={() =>
            setMaterialModal(null)
          }
          onSaved={async (message) => {
            setMaterialModal(null);
            setSuccess(message);
            setError("");
            await refreshCurrentView();
          }}
        />
      )}


      {movementModal && (
        <MovementModal
          data={movementModal}
          onClose={() =>
            setMovementModal(null)
          }
          onSaved={async (message) => {
            setMovementModal(null);
            setSuccess(message);
            setError("");
            await refreshCurrentView();
          }}
        />
      )}


      {historyModal && (
        <HistoryModal
          data={historyModal}
          onClose={() =>
            setHistoryModal(null)
          }
        />
      )}


      {deleteModal && (
        <DeleteModal
          material={deleteModal}
          onClose={() =>
            setDeleteModal(null)
          }
          onDeleted={async () => {
            setDeleteModal(null);
            setSuccess(
              `Material ${deleteModal.code} excluído com sucesso.`
            );
            setError("");
            await refreshCurrentView();
          }}
        />
      )}
    </section>
  );
}


function MaterialActions({
  onEntry,
  onExit,
  onAdjustment,
  onEdit,
  onHistory,
  onDelete,
}) {
  const [open, setOpen] = useState(false);

  function execute(action) {
    setOpen(false);
    action();
  }

  return (
    <div className="material-actions-menu">
      <button
        type="button"
        className="material-menu-button"
        onClick={() => setOpen(!open)}
        aria-label="Ações do material"
      >
        •••
      </button>

      {open && (
        <div className="material-menu-dropdown">
          <button
            type="button"
            onClick={() => execute(onEntry)}
          >
            Entrada
          </button>

          <button
            type="button"
            onClick={() => execute(onExit)}
          >
            Saída
          </button>

          <button
            type="button"
            onClick={() => execute(onAdjustment)}
          >
            Ajustar estoque
          </button>

          <button
            type="button"
            onClick={() => execute(onEdit)}
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => execute(onHistory)}
          >
            Histórico
          </button>

          <button
            type="button"
            className="danger-menu-item"
            onClick={() => execute(onDelete)}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}


function MaterialModal({
  data,
  onClose,
  onSaved,
}) {
  const editing = data.mode === "edit";

  const [form, setForm] = useState({
    code: data.material.code ?? "",
    name: data.material.name ?? "",
    quantity: data.material.quantity ?? 0,
    unit: data.material.unit ?? "un",
    minimum_quantity:
      data.material.minimum_quantity ?? 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  function change(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }


  async function submit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      if (editing) {
        await updateMaterial(
          data.material.code,
          {
            name: form.name.trim(),
            unit: form.unit.trim() || "un",
            minimum_quantity:
              Number(form.minimum_quantity),
          }
        );

        await onSaved(
          "Material atualizado com sucesso."
        );

      } else {
        await createMaterial({
          code: form.code.trim(),
          name: form.name.trim(),
          quantity: Number(form.quantity),
          unit: form.unit.trim() || "un",
          minimum_quantity:
            Number(form.minimum_quantity),
        });

        await onSaved(
          "Material cadastrado com sucesso."
        );
      }

    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Não foi possível salvar o material."
      ));

    } finally {
      setSaving(false);
    }
  }


  return (
    <ModalShell
      title={
        editing
          ? "Editar material"
          : "Novo material"
      }
      onClose={onClose}
    >
      <form
        className="inventory-modal-form"
        onSubmit={submit}
      >
        <label>
          Código
          <input
            value={form.code}
            onChange={(event) =>
              change("code", event.target.value)
            }
            disabled={editing}
            required
          />
        </label>

        <label>
          Material
          <input
            value={form.name}
            onChange={(event) =>
              change("name", event.target.value)
            }
            required
          />
        </label>

        <div className="inventory-form-row">
          {!editing && (
            <label>
              Quantidade inicial
              <input
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(event) =>
                  change(
                    "quantity",
                    event.target.value
                  )
                }
                required
              />
            </label>
          )}

          <label>
            Unidade
            <input
              value={form.unit}
              onChange={(event) =>
                change("unit", event.target.value)
              }
              required
            />
          </label>

          <label>
            Estoque mínimo
            <input
              type="number"
              min="0"
              step="any"
              value={form.minimum_quantity}
              onChange={(event) =>
                change(
                  "minimum_quantity",
                  event.target.value
                )
              }
              required
            />
          </label>
        </div>

        {editing && (
          <p className="inventory-modal-hint">
            O saldo atual é alterado somente pelas
            operações de entrada, saída ou ajuste.
          </p>
        )}

        {error && (
          <div className="inventory-error">
            {error}
          </div>
        )}

        <ModalButtons
          onClose={onClose}
          saving={saving}
          saveLabel={
            editing
              ? "Salvar alterações"
              : "Cadastrar material"
          }
        />
      </form>
    </ModalShell>
  );
}


function MovementModal({
  data,
  onClose,
  onSaved,
}) {
  const { material, type } = data;

  const [quantity, setQuantity] = useState(
    type === "adjustment"
      ? material.quantity
      : ""
  );

  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  const config = {
    entry: {
      title: "Entrada de estoque",
      quantityLabel: "Quantidade de entrada",
      button: "Registrar entrada",
    },
    exit: {
      title: "Saída de estoque",
      quantityLabel: "Quantidade de saída",
      button: "Registrar saída",
    },
    adjustment: {
      title: "Ajustar estoque",
      quantityLabel: "Novo saldo",
      button: "Salvar ajuste",
    },
  }[type];


  async function submit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      await createInventoryMovement(
        material.code,
        {
          type,
          quantity: Number(quantity),
          reason: reason.trim(),
        }
      );

      const messages = {
        entry: "Entrada registrada com sucesso.",
        exit: "Saída registrada com sucesso.",
        adjustment:
          "Estoque ajustado com sucesso.",
      };

      await onSaved(messages[type]);

    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Não foi possível registrar a movimentação."
      ));

    } finally {
      setSaving(false);
    }
  }


  return (
    <ModalShell
      title={config.title}
      onClose={onClose}
    >
      <div className="movement-material-card">
        <strong>{material.name}</strong>
        <span>{material.code}</span>

        <div>
          Saldo atual:{" "}
          <b>
            {formatNumber(material.quantity)}{" "}
            {material.unit}
          </b>
        </div>
      </div>

      <form
        className="inventory-modal-form"
        onSubmit={submit}
      >
        <label>
          {config.quantityLabel}
          <input
            type="number"
            min={
              type === "adjustment"
                ? "0"
                : "0.000001"
            }
            step="any"
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
            required
            autoFocus
          />
        </label>

        <label>
          Motivo / observação
          <textarea
            value={reason}
            onChange={(event) =>
              setReason(event.target.value)
            }
            rows="3"
            placeholder={
              type === "entry"
                ? "Ex.: Compra do fornecedor"
                : type === "exit"
                  ? "Ex.: Material utilizado na obra"
                  : "Ex.: Contagem física"
            }
          />
        </label>

        {error && (
          <div className="inventory-error">
            {error}
          </div>
        )}

        <ModalButtons
          onClose={onClose}
          saving={saving}
          saveLabel={config.button}
        />
      </form>
    </ModalShell>
  );
}


function HistoryModal({
  data,
  onClose,
}) {
  return (
    <ModalShell
      title="Histórico de movimentações"
      onClose={onClose}
      wide
    >
      <div className="movement-material-card">
        <strong>{data.material.name}</strong>
        <span>{data.material.code}</span>
      </div>

      {data.loading ? (
        <div className="inventory-empty">
          Carregando histórico...
        </div>

      ) : data.error ? (
        <div className="inventory-error">
          {data.error}
        </div>

      ) : data.movements.length === 0 ? (
        <div className="inventory-empty">
          Nenhuma movimentação registrada.
        </div>

      ) : (
        <div className="inventory-history-wrapper">
          <table className="inventory-history-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Anterior</th>
                <th>Novo saldo</th>
                <th>Motivo</th>
              </tr>
            </thead>

            <tbody>
              {data.movements.map((movement) => (
                <tr key={movement.id}>
                  <td>
                    {formatDate(movement.created_at)}
                  </td>

                  <td>
                    <MovementBadge
                      type={movement.type}
                    />
                  </td>

                  <td>
                    {formatNumber(
                      movement.quantity
                    )}
                  </td>

                  <td>
                    {formatNumber(
                      movement.previous_quantity
                    )}
                  </td>

                  <td>
                    {formatNumber(
                      movement.new_quantity
                    )}
                  </td>

                  <td>
                    {movement.reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="inventory-modal-buttons">
        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </ModalShell>
  );
}


function DeleteModal({
  material,
  onClose,
  onDeleted,
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");


  async function remove() {
    setDeleting(true);
    setError("");

    try {
      await deleteMaterial(material.code);
      await onDeleted();

    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Não foi possível excluir o material."
      ));

    } finally {
      setDeleting(false);
    }
  }


  return (
    <ModalShell
      title="Excluir material"
      onClose={onClose}
    >
      <div className="inventory-delete-warning">
        <strong>
          Tem certeza que deseja excluir?
        </strong>

        <p>
          {material.code} — {material.name}
        </p>

        <p>
          O material e seu histórico de
          movimentações serão removidos.
        </p>
      </div>

      {error && (
        <div className="inventory-error">
          {error}
        </div>
      )}

      <div className="inventory-modal-buttons">
        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
          disabled={deleting}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="danger-button"
          onClick={remove}
          disabled={deleting}
        >
          {deleting
            ? "Excluindo..."
            : "Excluir material"}
        </button>
      </div>
    </ModalShell>
  );
}


function ModalShell({
  title,
  children,
  onClose,
  wide = false,
}) {
  return (
    <div
      className="inventory-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={
          wide
            ? "inventory-modal inventory-modal-wide"
            : "inventory-modal"
        }
      >
        <div className="inventory-modal-header">
          <h3>{title}</h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}


function ModalButtons({
  onClose,
  saving,
  saveLabel,
}) {
  return (
    <div className="inventory-modal-buttons">
      <button
        type="button"
        className="secondary-button"
        onClick={onClose}
        disabled={saving}
      >
        Cancelar
      </button>

      <button
        type="submit"
        className="primary-button"
        disabled={saving}
      >
        {saving
          ? "Salvando..."
          : saveLabel}
      </button>
    </div>
  );
}


function SummaryCard({
  label,
  value,
  attention = false,
}) {
  return (
    <div
      className={
        attention
          ? "summary-card attention"
          : "summary-card"
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


function StockStatus({
  material,
}) {
  if (material.quantity <= 0) {
    return (
      <span className="stock-status zero">
        Sem estoque
      </span>
    );
  }

  if (material.below_minimum) {
    return (
      <span className="stock-status low">
        Abaixo do mínimo
      </span>
    );
  }

  return (
    <span className="stock-status ok">
      Normal
    </span>
  );
}


function MovementBadge({
  type,
}) {
  const labels = {
    entry: "Entrada",
    exit: "Saída",
    adjustment: "Ajuste",
  };

  return (
    <span
      className={`movement-badge ${type}`}
    >
      {labels[type] ?? type}
    </span>
  );
}


function formatNumber(value) {
  return new Intl.NumberFormat(
    "pt-PT",
    {
      maximumFractionDigits: 3,
    }
  ).format(value);
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-PT",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(new Date(value));
}


function getErrorMessage(
  error,
  fallback
) {
  return error instanceof Error
    ? error.message
    : fallback;
}