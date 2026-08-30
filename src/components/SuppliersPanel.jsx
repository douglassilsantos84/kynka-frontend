import { useEffect, useMemo, useState } from "react";

import {
  createSupplier,
  getInventory,
  getSupplierMaterials,
  getSuppliers,
  setSupplierActive,
  updateSupplier,
  upsertSupplierMaterial,
  deleteSupplierMaterial,
  getSupplierMaterialHistory,
} from "../api/kynkaApi";

const EMPTY_SUPPLIER = {
  code: "",
  name: "",
  nif: "",
  email: "",
  phone: "",
  notes: "",
};

const EMPTY_CATALOG = {
  material_code: "",
  unit_price: "",
  lead_time_days: 0,
  minimum_order_quantity: 0,
};

export default function SuppliersPanel() {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selected, setSelected] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [supplierModal, setSupplierModal] = useState(null);
  const [catalogModal, setCatalogModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);

  async function loadBase() {
    setLoading(true);
    setError("");
    try {
      const [supplierData, materialData] = await Promise.all([
        getSuppliers(),
        getInventory(),
      ]);
      setSuppliers(supplierData);
      setMaterials(materialData);
      if (selected) {
        const fresh = supplierData.find((item) => item.id === selected.id) ?? null;
        setSelected(fresh);
        if (fresh) {
          setCatalog(await getSupplierMaterials(fresh.id));
        }
      }
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  async function openSupplier(supplier) {
    setSelected(supplier);
    setError("");
    setSuccess("");
    try {
      setCatalog(await getSupplierMaterials(supplier.id));
    } catch (requestError) {
      setError(message(requestError));
    }
  }

  function closeSupplier() {
    setSelected(null);
    setCatalog([]);
    setError("");
    setSuccess("");
  }

  async function saveSupplier(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = supplierModal.form;
      if (supplierModal.mode === "create") {
        await createSupplier(payload);
        setSuccess("Fornecedor cadastrado com sucesso.");
      } else {
        await updateSupplier(supplierModal.supplier.id, payload);
        setSuccess("Fornecedor atualizado com sucesso.");
      }
      setSupplierModal(null);
      await loadBase();
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await setSupplierActive(selected.id, !selected.active);
      setSelected(updated);
      setSuccess(updated.active ? "Fornecedor ativado." : "Fornecedor desativado.");
      await loadBase();
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function saveCatalog(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await upsertSupplierMaterial(selected.id, {
        material_code: catalogModal.material_code,
        unit_price: Number(catalogModal.unit_price),
        lead_time_days: Number(catalogModal.lead_time_days),
        minimum_order_quantity: Number(catalogModal.minimum_order_quantity),
      });
      setCatalog(await getSupplierMaterials(selected.id));
      setCatalogModal(null);
      setSuccess("Preço do fornecedor atualizado.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function removeCatalog(item) {
    if (!selected) return;
    if (!window.confirm(`Remover ${item.material_code} do catálogo deste fornecedor?`)) return;
    setSaving(true);
    setError("");
    try {
      await deleteSupplierMaterial(selected.id, item.material_code);
      setCatalog(await getSupplierMaterials(selected.id));
      setSuccess("Material removido do catálogo.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(item) {
    if (!selected) return;
    try {
      const history = await getSupplierMaterialHistory(selected.id, item.material_code);
      setHistoryModal({ item, history });
    } catch (requestError) {
      setError(message(requestError));
    }
  }

  if (selected) {
    return (
      <section className="suppliers-panel">
        <button className="project-back-button" type="button" onClick={closeSupplier}>
          ← Fornecedores
        </button>
        <div className="suppliers-header">
          <div>
            <span className="page-eyebrow">Compras</span>
            <h2>{selected.name}</h2>
            <p>{selected.code} · {selected.nif || "NIF não informado"}</p>
          </div>
          <div className="supplier-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSupplierModal({
                mode: "edit",
                supplier: selected,
                form: {
                  name: selected.name,
                  nif: selected.nif,
                  email: selected.email,
                  phone: selected.phone,
                  notes: selected.notes,
                },
              })}
            >
              Editar
            </button>
            <button type="button" className="secondary-button" onClick={toggleActive} disabled={saving}>
              {selected.active ? "Desativar" : "Ativar"}
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!selected.active}
              onClick={() => setCatalogModal({ ...EMPTY_CATALOG })}
            >
              + Material / preço
            </button>
          </div>
        </div>

        {success && <div className="inventory-success">{success}</div>}
        {error && <div className="inventory-error">{error}</div>}

        <div className="supplier-detail-grid">
          <Info label="Status" value={selected.active ? "Ativo" : "Inativo"} />
          <Info label="E-mail" value={selected.email || "—"} />
          <Info label="Telefone" value={selected.phone || "—"} />
          <Info label="Materiais" value={catalog.length} />
        </div>

        <div className="supplier-catalog-card">
          <div className="project-planning-header">
            <div>
              <h3>Catálogo e preços</h3>
              <p>Preços, prazo e quantidade mínima por material.</p>
            </div>
            <span>{catalog.length} item(ns)</span>
          </div>

          {catalog.length === 0 ? (
            <div className="projects-empty compact">Nenhum material cadastrado para este fornecedor.</div>
          ) : (
            <div className="project-table-wrapper">
              <table className="project-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Preço unitário</th>
                    <th>Prazo</th>
                    <th>Compra mínima</th>
                    <th>Atualizado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((item) => (
                    <tr key={item.material_code}>
                      <td>
                        <strong>{item.material_name}</strong>
                        <span className="project-material-code">{item.material_code}</span>
                      </td>
                      <td>{money(item.unit_price)} / {item.unit}</td>
                      <td>{item.lead_time_days} dia(s)</td>
                      <td>{number(item.minimum_order_quantity)} {item.unit}</td>
                      <td>{dateTime(item.updated_at)}</td>
                      <td className="supplier-table-actions">
                        <button type="button" className="secondary-button" onClick={() => setCatalogModal({
                          material_code: item.material_code,
                          unit_price: item.unit_price,
                          lead_time_days: item.lead_time_days,
                          minimum_order_quantity: item.minimum_order_quantity,
                        })}>Editar</button>
                        <button type="button" className="secondary-button" onClick={() => openHistory(item)}>Histórico</button>
                        <button type="button" className="secondary-button" onClick={() => removeCatalog(item)}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {supplierModal && (
          <SupplierModal data={supplierModal} setData={setSupplierModal} saving={saving} onSubmit={saveSupplier} onClose={() => setSupplierModal(null)} />
        )}
        {catalogModal && (
          <CatalogModal data={catalogModal} setData={setCatalogModal} materials={materials} saving={saving} onSubmit={saveCatalog} onClose={() => setCatalogModal(null)} />
        )}
        {historyModal && (
          <HistoryModal data={historyModal} onClose={() => setHistoryModal(null)} />
        )}
      </section>
    );
  }

  return (
    <section className="suppliers-panel">
      <div className="suppliers-header">
        <div>
          <span className="page-eyebrow">Compras</span>
          <h2>Fornecedores</h2>
          <p>Cadastre fornecedores e mantenha preços por material.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setSupplierModal({ mode: "create", supplier: null, form: { ...EMPTY_SUPPLIER } })}>
          + Novo fornecedor
        </button>
      </div>

      {success && <div className="inventory-success">{success}</div>}
      {error && <div className="inventory-error">{error}</div>}

      {loading ? (
        <div className="projects-empty">Carregando fornecedores...</div>
      ) : suppliers.length === 0 ? (
        <div className="projects-empty">
          <strong>Nenhum fornecedor cadastrado.</strong>
          <span>Cadastre o primeiro fornecedor para iniciar a comparação de preços.</span>
        </div>
      ) : (
        <div className="suppliers-grid">
          {suppliers.map((supplier) => (
            <article className={`supplier-card ${supplier.active ? "" : "inactive"}`} key={supplier.id}>
              <div className="project-card-top">
                <span className="project-code">{supplier.code}</span>
                <span className={`supplier-status ${supplier.active ? "active" : "inactive"}`}>
                  {supplier.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <h3>{supplier.name}</h3>
              <div className="supplier-card-info">
                <span>NIF<strong>{supplier.nif || "—"}</strong></span>
                <span>E-mail<strong>{supplier.email || "—"}</strong></span>
                <span>Telefone<strong>{supplier.phone || "—"}</strong></span>
              </div>
              <button type="button" className="secondary-button" onClick={() => openSupplier(supplier)}>
                Abrir fornecedor
              </button>
            </article>
          ))}
        </div>
      )}

      {supplierModal && (
        <SupplierModal data={supplierModal} setData={setSupplierModal} saving={saving} onSubmit={saveSupplier} onClose={() => setSupplierModal(null)} />
      )}
    </section>
  );
}

function SupplierModal({ data, setData, saving, onSubmit, onClose }) {
  const form = data.form;
  const change = (field, value) => setData((current) => ({
    ...current,
    form: { ...current.form, [field]: value },
  }));

  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal">
        <div className="inventory-modal-header">
          <div><span className="page-eyebrow">Fornecedores</span><h3>{data.mode === "create" ? "Novo fornecedor" : "Editar fornecedor"}</h3></div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <form className="inventory-modal-form" onSubmit={onSubmit}>
          {data.mode === "create" && <label>Código<input required value={form.code} onChange={(event) => change("code", event.target.value)} /></label>}
          <label>Nome<input required value={form.name} onChange={(event) => change("name", event.target.value)} /></label>
          <div className="inventory-form-row">
            <label>NIF<input value={form.nif} onChange={(event) => change("nif", event.target.value)} /></label>
            <label>Telefone<input value={form.phone} onChange={(event) => change("phone", event.target.value)} /></label>
          </div>
          <label>E-mail<input type="email" value={form.email} onChange={(event) => change("email", event.target.value)} /></label>
          <label>Observações<textarea rows="4" value={form.notes} onChange={(event) => change("notes", event.target.value)} /></label>
          <div className="inventory-modal-buttons">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CatalogModal({ data, setData, materials, saving, onSubmit, onClose }) {
  const existing = Boolean(data.material_code && materials.some((item) => item.code === data.material_code));
  const change = (field, value) => setData((current) => ({ ...current, [field]: value }));

  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal">
        <div className="inventory-modal-header">
          <div><span className="page-eyebrow">Catálogo</span><h3>Material e preço</h3></div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <form className="inventory-modal-form" onSubmit={onSubmit}>
          <label>Material
            <select required value={data.material_code} onChange={(event) => change("material_code", event.target.value)} disabled={existing}>
              <option value="">Selecione...</option>
              {materials.map((material) => <option key={material.code} value={material.code}>{material.code} — {material.name}</option>)}
            </select>
          </label>
          <div className="inventory-form-row">
            <label>Preço unitário (€)<input required type="number" min="0" step="0.0001" value={data.unit_price} onChange={(event) => change("unit_price", event.target.value)} /></label>
            <label>Prazo (dias)<input required type="number" min="0" step="1" value={data.lead_time_days} onChange={(event) => change("lead_time_days", event.target.value)} /></label>
          </div>
          <label>Quantidade mínima de compra<input required type="number" min="0" step="any" value={data.minimum_order_quantity} onChange={(event) => change("minimum_order_quantity", event.target.value)} /></label>
          <div className="inventory-modal-buttons">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar preço"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({ data, onClose }) {
  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal inventory-modal-wide">
        <div className="inventory-modal-header">
          <div><span className="page-eyebrow">Histórico</span><h3>{data.item.material_name}</h3></div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {data.history.length === 0 ? <div className="inventory-empty">Nenhum histórico de preço.</div> : (
          <div className="inventory-history-wrapper">
            <table className="inventory-history-table">
              <thead><tr><th>Data</th><th>Preço</th></tr></thead>
              <tbody>{data.history.map((item) => <tr key={item.id}><td>{dateTime(item.recorded_at)}</td><td>{money(item.unit_price)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="project-info-card"><span>{label}</span><strong>{value}</strong></div>;
}

function message(error) {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function number(value) {
  return Number(value || 0).toLocaleString("pt-PT", { maximumFractionDigits: 3 });
}

function dateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
