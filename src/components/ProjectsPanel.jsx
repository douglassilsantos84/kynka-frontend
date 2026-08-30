import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createDemand,
  createDemandRequirement,
  getDemandPlan,
  getDemandPurchaseList,
  getDemandRequirements,
  getDemandReservations,
  getDemands,
  getConsolidatedPurchaseList,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseQuotes,
  markPurchaseOrderOrdered,
  cancelPurchaseOrder,
  receivePurchaseOrderItem,
  importDemandQuantityMap,
  reserveDemandStock,
  resolveMissingMaterial,
} from "../api/kynkaApi";


const emptyProjectForm = {
  code: "",
  name: "",
  kind: "construction",
  client: "",
  location: "",
  start_date: "",
  notes: "",
};


const emptyRequirementForm = {
  material_code: "",
  required_quantity: "",
};


export default function ProjectsPanel() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] =
    useState(null);

  const [requirements, setRequirements] =
    useState([]);

  const [reservations, setReservations] =
    useState([]);

  const [plan, setPlan] = useState(null);
  const [purchaseList, setPurchaseList] = useState(null);
  const [consolidatedPurchaseList, setConsolidatedPurchaseList] = useState(null);
  const [showConsolidatedPurchases, setShowConsolidatedPurchases] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [receivingItem, setReceivingItem] = useState(null);
  const [purchaseQuoteModal, setPurchaseQuoteModal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [importResult, setImportResult] =
    useState(null);

  const [
    missingMaterialModal,
    setMissingMaterialModal,
  ] = useState(null);

  const [showProjectModal, setShowProjectModal] =
    useState(false);

  const [
    showRequirementModal,
    setShowRequirementModal,
  ] = useState(false);

  const [projectForm, setProjectForm] =
    useState(emptyProjectForm);

  const [requirementForm, setRequirementForm] =
    useState(emptyRequirementForm);

  const quantityMapInputRef = useRef(null);


  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getDemands();
      setProjects(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadProjects();
  }, [loadProjects]);


  async function loadProjectData(project) {
    const [requirementsData,planData,reservationsData,purchaseListData] = await Promise.all([
      getDemandRequirements(project.id), getDemandPlan(project.id), getDemandReservations(project.id), getDemandPurchaseList(project.id),
    ]);
    setRequirements(requirementsData); setPlan(planData); setReservations(reservationsData); setPurchaseList(purchaseListData);
  }


  async function openProject(project) {
    setSelectedProject(project);
    setDetailLoading(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      await loadProjectData(project);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDetailLoading(false);
    }
  }


  async function refreshSelectedProject() {
    if (!selectedProject) {
      return;
    }

    try {
      await loadProjectData(selectedProject);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw requestError;
    }
  }


  function closeProject() {
    setSelectedProject(null);
    setRequirements([]);
    setReservations([]);
    setPlan(null);
    setPurchaseList(null);
    setImportResult(null);
    setError("");
    setSuccess("");
  }


  function openNewProjectModal() {
    setProjectForm(emptyProjectForm);
    setError("");
    setSuccess("");
    setShowProjectModal(true);
  }


  async function handleCreateProject(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...projectForm,
        start_date:
          projectForm.start_date || null,
      };

      const created =
        await createDemand(payload);

      setShowProjectModal(false);
      setProjectForm(emptyProjectForm);

      await loadProjects();

      setSuccess(
        `Projeto ${created.code} criado com sucesso.`
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }


  async function handleCreateRequirement(event) {
    event.preventDefault();

    if (!selectedProject) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await createDemandRequirement(
        selectedProject.id,
        {
          material_code:
            requirementForm.material_code.trim(),
          required_quantity:
            Number(
              requirementForm.required_quantity
            ),
        }
      );

      setRequirementForm(
        emptyRequirementForm
      );

      setShowRequirementModal(false);

      await refreshSelectedProject();

      setSuccess(
        "Material adicionado ao planejamento."
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }


  async function handleReserve() {
    if (!selectedProject) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await reserveDemandStock(
        selectedProject.id
      );

      await refreshSelectedProject();

      setSuccess(
        "Estoque disponÃ­vel reservado para o projeto."
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }


  function openQuantityMapPicker() {
    if (importing) {
      return;
    }

    quantityMapInputRef.current?.click();
  }


  async function handleQuantityMapSelected(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !selectedProject) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError(
        "Selecione um mapa de quantidades no formato .xlsx."
      );
      setSuccess("");
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const result =
        await importDemandQuantityMap(
          selectedProject.id,
          file
        );

      setImportResult(result);

      await refreshSelectedProject();

      const missingCount =
        result.missing_materials?.length ?? 0;

      if (missingCount > 0) {
        setSuccess(
          `Mapa importado: ${result.imported} material(is) adicionado(s) e ${missingCount} material(is) nÃ£o cadastrado(s) no estoque.`
        );
      } else {
        setSuccess(
          `Mapa de quantidades importado com sucesso. ${result.imported} material(is) adicionado(s).`
        );
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setImporting(false);
    }
  }

  function openMissingMaterialRegistration(item) {
  setError("");
  setSuccess("");

  setMissingMaterialModal({
    row: item.row,
    code: item.code,
    name: item.name || "",
    unit: item.unit || "un",
    required_quantity: Number(
      item.quantity || 0
    ),
    quantity: 0,
    minimum_quantity: 0,
  });
}


  async function handleRegisterMissingMaterial(
    event
  ) {
    event.preventDefault();

    if (
      !selectedProject ||
      !missingMaterialModal
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await resolveMissingMaterial(
          selectedProject.id,
          {
            code:
              missingMaterialModal.code.trim(),
            name:
              missingMaterialModal.name.trim(),
            quantity: Number(
              missingMaterialModal.quantity
            ),
            unit:
              missingMaterialModal.unit.trim()
              || "un",
            minimum_quantity: Number(
              missingMaterialModal
                .minimum_quantity
            ),
            required_quantity: Number(
              missingMaterialModal
                .required_quantity
            ),
          }
        );

      setPlan(result.plan);

      setImportResult((current) => {
        if (!current) {
          return current;
        }

        const remaining =
          (
            current.missing_materials ?? []
          ).filter(
            (item) =>
              !(
                item.row ===
                  missingMaterialModal.row &&
                item.code ===
                  missingMaterialModal.code
              )
          );

        return {
          ...current,
          missing_materials: remaining,
        };
      });

      setMissingMaterialModal(null);

      await refreshSelectedProject();

      setSuccess(
        "Material cadastrado no estoque e adicionado ao planejamento do projeto."
      );

    } catch (requestError) {
      setError(
        getErrorMessage(requestError)
      );

    } finally {
      setSaving(false);
    }
  }

  async function openConsolidatedPurchases() {
    setError(""); setSuccess("");
    try {
      const result = await getConsolidatedPurchaseList(projects.map((project)=>project.id));
      setConsolidatedPurchaseList(result); setShowConsolidatedPurchases(true);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
  }


  async function openPurchaseOrders() {
    setError("");
    try {
      const orders = await getPurchaseOrders();
      setPurchaseOrders(orders);
      setShowPurchaseOrders(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function handleCreatePurchaseOrder(demandIds) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const quotes = await getPurchaseQuotes(demandIds);
      setPurchaseQuoteModal({ demandIds, quotes });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmPurchaseOrder(supplierId) {
    if (!purchaseQuoteModal) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const order = await createPurchaseOrder(
        purchaseQuoteModal.demandIds,
        "",
        supplierId
      );
      setPurchaseQuoteModal(null);
      setSuccess(`Pedido de compra #${order.id} criado com sucesso.`);
      const orders = await getPurchaseOrders();
      setPurchaseOrders(orders);
      setShowPurchaseOrders(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkOrder(orderId) {
    setSaving(true);
    try {
      await markPurchaseOrderOrdered(orderId);
      setPurchaseOrders(await getPurchaseOrders());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelOrder(orderId) {
    setSaving(true);
    try {
      await cancelPurchaseOrder(orderId);
      setPurchaseOrders(await getPurchaseOrders());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleReceiveItem(event) {
    event.preventDefault();
    if (!receivingItem) return;
    setSaving(true);
    try {
      await receivePurchaseOrderItem(
        receivingItem.orderId,
        receivingItem.item.id,
        receivingItem.quantity
      );
      setReceivingItem(null);
      setPurchaseOrders(await getPurchaseOrders());
      if (selectedProject) await refreshSelectedProject();
      setSuccess("Recebimento registrado e estoque atualizado.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }


  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        requirements={requirements}
        reservations={reservations}
        plan={plan}
        purchaseList={purchaseList}
        onCreatePurchaseOrder={() => handleCreatePurchaseOrder([selectedProject.id])}
        purchaseQuoteModal={purchaseQuoteModal}
        onConfirmPurchaseOrder={handleConfirmPurchaseOrder}
        onClosePurchaseQuote={() => setPurchaseQuoteModal(null)}
        loading={detailLoading}
        saving={saving}
        importing={importing}
        error={error}
        success={success}
        importResult={importResult}
        missingMaterialModal={
          missingMaterialModal
        }
        setMissingMaterialModal={
          setMissingMaterialModal
        }
        onRegisterMissingMaterial={
          openMissingMaterialRegistration
        }
        onSubmitMissingMaterial={
          handleRegisterMissingMaterial
        }
        quantityMapInputRef={
          quantityMapInputRef
        }
        onBack={closeProject}
        onImportMap={openQuantityMapPicker}
        onQuantityMapSelected={
          handleQuantityMapSelected
        }
        onAddRequirement={() => {
          setRequirementForm(
            emptyRequirementForm
          );
          setError("");
          setShowRequirementModal(true);
        }}
        onReserve={handleReserve}
        showRequirementModal={
          showRequirementModal
        }
        requirementForm={
          requirementForm
        }
        setRequirementForm={
          setRequirementForm
        }
        onSubmitRequirement={
          handleCreateRequirement
        }
        onCloseRequirement={() =>
          setShowRequirementModal(false)
        }
      />
    );
  }


  return (
    <section className="projects-panel">
      <div className="projects-header">
        <div>
          <span className="page-eyebrow">
            GestÃ£o operacional
          </span>

          <h2>Projetos</h2>

          <p>
            Planeje obras, eventos e outras
            demandas utilizando o estoque real.
          </p>
        </div>

        <div className="project-detail-actions">
          <button type="button" className="secondary-button" onClick={openPurchaseOrders}>Pedidos de compra</button>
          <button type="button" className="secondary-button" onClick={openConsolidatedPurchases} disabled={projects.length===0}>Compras consolidadas</button>
          <button type="button" className="primary-button" onClick={openNewProjectModal}>+ Novo projeto</button>
        </div>
      </div>

      {success && (
        <div className="inventory-success">
          {success}
        </div>
      )}

      {error && (
        <div className="inventory-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="projects-empty">
          Carregando projetos...
        </div>
      ) : projects.length === 0 ? (
        <div className="projects-empty">
          <strong>
            Nenhum projeto cadastrado.
          </strong>

          <span>
            Crie o primeiro projeto para
            comeÃ§ar o planejamento de materiais.
          </span>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <article
              className="project-card"
              key={project.id}
            >
              <div className="project-card-top">
                <span className="project-code">
                  {project.code}
                </span>

                <span className="project-status">
                  {formatStatus(
                    project.status
                  )}
                </span>
              </div>

              <h3>{project.name}</h3>

              <div className="project-card-info">
                <span>
                  Cliente
                  <strong>
                    {project.client || "â€”"}
                  </strong>
                </span>

                <span>
                  Local
                  <strong>
                    {project.location || "â€”"}
                  </strong>
                </span>

                <span>
                  InÃ­cio
                  <strong>
                    {formatDate(
                      project.start_date
                    )}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  openProject(project)
                }
              >
                Abrir projeto
              </button>
            </article>
          ))}
        </div>
      )}

      {showConsolidatedPurchases && consolidatedPurchaseList && (
        <PurchaseListModal purchaseList={consolidatedPurchaseList} onClose={()=>setShowConsolidatedPurchases(false)} />
      )}

      {showPurchaseOrders && (
        <PurchaseOrdersModal
          orders={purchaseOrders}
          saving={saving}
          onClose={() => setShowPurchaseOrders(false)}
          onMarkOrdered={handleMarkOrder}
          onCancel={handleCancelOrder}
          onReceive={(orderId, item) =>
            setReceivingItem({
              orderId,
              item,
              quantity: item.quantity_pending,
            })
          }
        />
      )}

      {receivingItem && (
        <ReceivePurchaseItemModal
          data={receivingItem}
          setData={setReceivingItem}
          saving={saving}
          onSubmit={handleReceiveItem}
          onClose={() => setReceivingItem(null)}
        />
      )}

      {showProjectModal && (
        <ProjectModal
          form={projectForm}
          setForm={setProjectForm}
          saving={saving}
          onSubmit={handleCreateProject}
          onClose={() =>
            setShowProjectModal(false)
          }
        />
      )}
    </section>
  );
}


function ProjectDetail({
  project,
  requirements,
  reservations,
  plan,
  purchaseList,
  onCreatePurchaseOrder,
  purchaseQuoteModal,
  onConfirmPurchaseOrder,
  onClosePurchaseQuote,
  loading,
  saving,
  importing,
  error,
  success,
  importResult,
  missingMaterialModal,
  setMissingMaterialModal,
  onRegisterMissingMaterial,
  onSubmitMissingMaterial,
  quantityMapInputRef,
  onBack,
  onImportMap,
  onQuantityMapSelected,
  onAddRequirement,
  onReserve,
  showRequirementModal,
  requirementForm,
  setRequirementForm,
  onSubmitRequirement,
  onCloseRequirement,
}) {
  return (
    <section className="projects-panel">
      <input
        ref={quantityMapInputRef}
        type="file"
        accept=".xlsx"
        onChange={onQuantityMapSelected}
        style={{ display: "none" }}
      />

      <div className="project-detail-header">
        <div>
          <button
            type="button"
            className="project-back-button"
            onClick={onBack}
          >
            â† Projetos
          </button>

          <span className="page-eyebrow">
            {project.code}
          </span>

          <h2>{project.name}</h2>

          <p>
            {project.client || "Sem cliente"}
            {project.location
              ? ` Â· ${project.location}`
              : ""}
          </p>
        </div>

        <div className="project-detail-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onImportMap}
            disabled={importing || saving}
          >
            {importing
              ? "Importando..."
              : "Importar mapa"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={onAddRequirement}
            disabled={importing}
          >
            + Adicionar material
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={onReserve}
            disabled={
              saving ||
              importing ||
              !plan ||
              plan.total_items === 0
            }
          >
            {saving
              ? "Reservando..."
              : "Reservar disponÃ­veis"}
          </button>
        </div>
      </div>

      {success && (
        <div className="inventory-success">
          {success}
        </div>
      )}

      {error && (
        <div className="inventory-error">
          {error}
        </div>
      )}

      {importResult && (
        <QuantityMapResult
          result={importResult}
          onRegisterMissingMaterial={
            onRegisterMissingMaterial
          }
        />
      )}

      {loading ? (
        <div className="projects-empty">
          Calculando planejamento...
        </div>
      ) : (
        <>
          <ProjectMetrics
            plan={plan}
            reservations={reservations}
          />

          <div className="project-info-grid">
            <div className="project-info-card">
              <span>Tipo</span>
              <strong>
                {formatKind(project.kind)}
              </strong>
            </div>

            <div className="project-info-card">
              <span>InÃ­cio</span>
              <strong>
                {formatDate(
                  project.start_date
                )}
              </strong>
            </div>

            <div className="project-info-card">
              <span>Requisitos</span>
              <strong>
                {requirements.length}
              </strong>
            </div>

            <div className="project-info-card">
              <span>Reservas</span>
              <strong>
                {reservations.length}
              </strong>
            </div>
          </div>

          <PlanningTable plan={plan} />
          <PurchaseListPanel purchaseList={purchaseList} onCreateOrder={onCreatePurchaseOrder} />
        </>
      )}

      {purchaseQuoteModal && (
        <PurchaseQuoteModal
          data={purchaseQuoteModal}
          saving={saving}
          onConfirm={onConfirmPurchaseOrder}
          onClose={onClosePurchaseQuote}
        />
      )}

      {showRequirementModal && (
        <RequirementModal
          form={requirementForm}
          setForm={setRequirementForm}
          saving={saving}
          onSubmit={onSubmitRequirement}
          onClose={onCloseRequirement}
        />
      )}

      {missingMaterialModal && (
        <MissingMaterialModal
          material={missingMaterialModal}
          setMaterial={setMissingMaterialModal}
          saving={saving}
          onSubmit={onSubmitMissingMaterial}
          onClose={() =>
            setMissingMaterialModal(null)
          }
        />
      )}
    </section>
  );
}


function QuantityMapResult({
  result,
  onRegisterMissingMaterial,
}) {
  const missing =
    result.missing_materials ?? [];

  const errors = result.errors ?? [];

  return (
    <div className="project-quantity-map-card">
      <div className="project-planning-header">
        <div>
          <h3>Mapa de quantidades</h3>

          <p>
            Resultado da Ãºltima importaÃ§Ã£o:
            {" "}
            <strong>{result.filename}</strong>
          </p>
        </div>

        <span>
          {result.total_rows} linha(s)
        </span>
      </div>

      <div className="project-import-metrics">
        <div className="project-info-card">
          <span>Processadas</span>
          <strong>
            {result.total_rows}
          </strong>
        </div>

        <div className="project-info-card">
          <span>Importadas</span>
          <strong>
            {result.imported}
          </strong>
        </div>

        <div className="project-info-card">
          <span>Ignoradas</span>
          <strong>
            {result.skipped}
          </strong>
        </div>

        <div className="project-info-card">
          <span>NÃ£o cadastrados</span>
          <strong>
            {missing.length}
          </strong>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="project-missing-materials">
          <div className="project-section-title">
            <div>
              <h4>
                Materiais nÃ£o cadastrados
              </h4>

              <p>
                Estes itens estÃ£o no mapa, mas
                ainda nÃ£o existem no estoque.
              </p>
            </div>

            <span>
              {missing.length}
            </span>
          </div>

          <div className="project-table-wrapper">
            <table className="project-table">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>CÃ³digo</th>
                  <th>Material</th>
                  <th>Quantidade</th>
                  <th>AÃ§Ã£o</th>
                </tr>
              </thead>

              <tbody>
                {missing.map((item, index) => (
                  <tr
                    key={`${item.code}-${item.row}-${index}`}
                  >
                    <td>{item.row}</td>

                    <td>
                      <strong>
                        {item.code}
                      </strong>
                    </td>

                    <td>
                      {item.name || "â€”"}
                    </td>

                    <td>
                      {quantity(
                        item.quantity,
                        item.unit
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          onRegisterMissingMaterial(
                            item
                          )
                        }
                      >
                        Cadastrar no estoque
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="project-import-errors">
          <h4>Erros da importaÃ§Ã£o</h4>

          <ul>
            {errors.map((item, index) => (
              <li key={`${item}-${index}`}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


function PurchaseListPanel({
  purchaseList,
  onCreateOrder,
}) {
  if (!purchaseList) {
    return null;
  }

  const hasItems =
    purchaseList.items?.length > 0;

  return (
    <div className="project-purchase-card">
      <div className="project-planning-header">
        <div>
          <h3>Lista de compras</h3>

          <p>
            Quantidades realmente necessÃ¡rias,
            preservando estoque mÃ­nimo e reservas.
          </p>
        </div>

        <div className="project-purchase-header-actions">
          <span>
            {purchaseList.materials_to_buy} material(is)
          </span>

          {hasItems && onCreateOrder && (
            <button
              type="button"
              className="primary-button"
              onClick={onCreateOrder}
            >
              Gerar pedido de compra
            </button>
          )}
        </div>
      </div>

      <div className="project-purchase-analysis">
        <strong>AnÃ¡lise da Kynka</strong>

        <p>
          {purchaseList.analysis}
        </p>
      </div>

      {!hasItems ? (
        <div className="projects-empty compact">
          Nenhuma compra necessÃ¡ria neste projeto.
        </div>
      ) : (
        <PurchaseTable
          items={purchaseList.items}
        />
      )}
    </div>
  );
}


function PurchaseTable({
  items,
}) {
  return (
    <div className="project-table-wrapper">
      <table className="project-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>NecessÃ¡rio</th>
            <th>Reservado</th>
            <th>FÃ­sico</th>
            <th>MÃ­nimo</th>
            <th>Livre</th>
            <th>Comprar</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.material_code}>
              <td>
                <strong>
                  {item.material_name}
                </strong>

                <span className="project-material-code">
                  {item.material_code}
                </span>
              </td>

              <td>
                {quantity(
                  item.required_quantity,
                  item.unit
                )}
              </td>

              <td>
                {quantity(
                  item.reserved_quantity,
                  item.unit
                )}
              </td>

              <td>
                {quantity(
                  item.physical_quantity,
                  item.unit
                )}
              </td>

              <td>
                {quantity(
                  item.minimum_quantity,
                  item.unit
                )}
              </td>

              <td>
                {quantity(
                  item.free_quantity,
                  item.unit
                )}
              </td>

              <td>
                <strong className="project-shortage">
                  {quantity(
                    item.quantity_to_buy,
                    item.unit
                  )}
                </strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function PurchaseListModal({purchaseList,onClose}) {
  return <div className="inventory-modal-backdrop"><div className="inventory-modal procurement-modal"><div className="inventory-modal-header"><div><span className="page-eyebrow">Compras</span><h3>Lista consolidada</h3></div><button type="button" onClick={onClose}>Ã—</button></div><div className="procurement-modal-content"><div className="project-purchase-analysis"><strong>AnÃ¡lise da Kynka</strong><p>{purchaseList.analysis}</p></div><div className="project-import-metrics"><div className="project-info-card"><span>Projetos</span><strong>{purchaseList.demand_ids.length}</strong></div><div className="project-info-card"><span>Materiais analisados</span><strong>{purchaseList.total_materials}</strong></div><div className="project-info-card"><span>Precisam comprar</span><strong>{purchaseList.materials_to_buy}</strong></div></div>{purchaseList.items.length===0?<div className="projects-empty compact">Nenhuma compra necessÃ¡ria.</div>:<PurchaseTable items={purchaseList.items}/>}</div></div></div>;
}

function ProjectMetrics({
  plan,
  reservations,
}) {
  const totalReserved =
    reservations.reduce(
      (total, reservation) =>
        total + Number(
          reservation.quantity || 0
        ),
      0
    );

  return (
    <div className="project-metrics">
      <div className="project-metric-card">
        <span>Materiais</span>
        <strong>
          {plan?.total_items ?? 0}
        </strong>
      </div>

      <div className="project-metric-card success">
        <span>DisponÃ­veis</span>
        <strong>
          {plan?.available_items ?? 0}
        </strong>
      </div>

      <div className="project-metric-card warning">
        <span>Com falta</span>
        <strong>
          {plan?.shortage_items ?? 0}
        </strong>
      </div>

      <div className="project-metric-card">
        <span>Reservado</span>
        <strong>
          {formatNumber(totalReserved)}
        </strong>
      </div>
    </div>
  );
}


function PlanningTable({ plan }) {
  const items = plan?.items ?? [];

  return (
    <div className="project-planning-card">
      <div className="project-planning-header">
        <div>
          <h3>
            Planejamento de materiais
          </h3>

          <p>
            Necessidade Ã— estoque Ã— mÃ­nimo
            protegido Ã— reservas.
          </p>
        </div>

        <span>
          {items.length} item(ns)
        </span>
      </div>

      {items.length === 0 ? (
        <div className="projects-empty compact">
          Nenhum material adicionado ao projeto.
        </div>
      ) : (
        <div className="project-table-wrapper">
          <table className="project-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>NecessÃ¡rio</th>
                <th>FÃ­sico</th>
                <th>MÃ­nimo</th>
                <th>Nesta obra</th>
                <th>Outras</th>
                <th>Livre</th>
                <th>Falta comprar</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.material_code}>
                  <td>
                    <strong>
                      {item.material_name}
                    </strong>

                    <span className="project-material-code">
                      {item.material_code}
                    </span>
                  </td>

                  <td>
                    {quantity(
                      item.required_quantity,
                      item.unit
                    )}
                  </td>

                  <td>
                    {quantity(
                      item.physical_quantity,
                      item.unit
                    )}
                  </td>

                  <td>
                    {quantity(
                      item.minimum_quantity,
                      item.unit
                    )}
                  </td>

                  <td>
                    {quantity(
                      item.reserved_for_this_demand,
                      item.unit
                    )}
                  </td>

                  <td>
                    {quantity(
                      item.reserved_for_other_demands,
                      item.unit
                    )}
                  </td>

                  <td>
                    {quantity(
                      item.free_quantity,
                      item.unit
                    )}
                  </td>

                  <td>
                    <strong
                      className={
                        item.shortage_quantity > 0
                          ? "project-shortage"
                          : ""
                      }
                    >
                      {quantity(
                        item.shortage_quantity,
                        item.unit
                      )}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={
                        item.fully_available
                          ? "project-plan-status ok"
                          : "project-plan-status shortage"
                      }
                    >
                      {item.fully_available
                        ? "DisponÃ­vel"
                        : "Comprar"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function ProjectModal({
  form,
  setForm,
  saving,
  onSubmit,
  onClose,
}) {
  function change(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal">
        <div className="inventory-modal-header">
          <div>
            <span className="page-eyebrow">
              Projetos
            </span>

            <h3>Novo projeto</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            Ã—
          </button>
        </div>

        <form
          className="inventory-modal-form"
          onSubmit={onSubmit}
        >
          <div className="inventory-form-row">
            <label>
              CÃ³digo
              <input
                required
                value={form.code}
                onChange={(event) =>
                  change(
                    "code",
                    event.target.value
                  )
                }
                placeholder="OBRA-002"
              />
            </label>

            <label>
              Tipo
              <select
                value={form.kind}
                onChange={(event) =>
                  change(
                    "kind",
                    event.target.value
                  )
                }
              >
                <option value="construction">
                  Obra
                </option>

                <option value="event">
                  Evento
                </option>

                <option value="project">
                  Projeto
                </option>

                <option value="production">
                  ProduÃ§Ã£o
                </option>
              </select>
            </label>
          </div>

          <label>
            Nome
            <input
              required
              value={form.name}
              onChange={(event) =>
                change(
                  "name",
                  event.target.value
                )
              }
              placeholder="Nome do projeto"
            />
          </label>

          <label>
            Cliente
            <input
              value={form.client}
              onChange={(event) =>
                change(
                  "client",
                  event.target.value
                )
              }
              placeholder="Cliente"
            />
          </label>

          <div className="inventory-form-row">
            <label>
              Local
              <input
                value={form.location}
                onChange={(event) =>
                  change(
                    "location",
                    event.target.value
                  )
                }
                placeholder="Local"
              />
            </label>

            <label>
              Data de inÃ­cio
              <input
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  change(
                    "start_date",
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <label>
            ObservaÃ§Ãµes
            <textarea
              rows="4"
              value={form.notes}
              onChange={(event) =>
                change(
                  "notes",
                  event.target.value
                )
              }
            />
          </label>

          <div className="inventory-modal-buttons">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Criando..."
                : "Criar projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function RequirementModal({
  form,
  setForm,
  saving,
  onSubmit,
  onClose,
}) {
  function change(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal">
        <div className="inventory-modal-header">
          <div>
            <span className="page-eyebrow">
              Planejamento
            </span>

            <h3>Adicionar material</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            Ã—
          </button>
        </div>

        <form
          className="inventory-modal-form"
          onSubmit={onSubmit}
        >
          <label>
            CÃ³digo do material
            <input
              required
              value={form.material_code}
              onChange={(event) =>
                change(
                  "material_code",
                  event.target.value
                )
              }
              placeholder="Ex.: CAB001"
            />
          </label>

          <label>
            Quantidade necessÃ¡ria
            <input
              required
              type="number"
              min="0.0001"
              step="any"
              value={
                form.required_quantity
              }
              onChange={(event) =>
                change(
                  "required_quantity",
                  event.target.value
                )
              }
              placeholder="0"
            />
          </label>

          <p className="inventory-modal-hint">
            O material precisa existir no estoque.
            A Kynka calcularÃ¡ automaticamente
            estoque mÃ­nimo, reservas e quantidade
            que precisa ser comprada.
          </p>

          <div className="inventory-modal-buttons">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Adicionando..."
                : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function MissingMaterialModal({
  material,
  setMaterial,
  saving,
  onSubmit,
  onClose,
}) {
  function change(field, value) {
    setMaterial((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal">
        <div className="inventory-modal-header">
          <div>
            <span className="page-eyebrow">
              Mapa de quantidades
            </span>
            <h3>Cadastrar material</h3>
          </div>
          <button type="button" onClick={onClose}>Ã—</button>
        </div>

        <form className="inventory-modal-form" onSubmit={onSubmit}>
          <label>
            CÃ³digo
            <input value={material.code} readOnly />
          </label>

          <label>
            Material
            <input required value={material.name} onChange={(event) => change("name", event.target.value)} />
          </label>

          <div className="inventory-form-row">
            <label>
              Unidade
              <input required value={material.unit} onChange={(event) => change("unit", event.target.value)} />
            </label>
            <label>
              Necessidade do projeto
              <input value={material.required_quantity} readOnly />
            </label>
          </div>

          <div className="inventory-form-row">
            <label>
              Estoque fÃ­sico atual
              <input required type="number" min="0" step="any" value={material.quantity} onChange={(event) => change("quantity", event.target.value)} />
            </label>
            <label>
              Estoque mÃ­nimo
              <input required type="number" min="0" step="any" value={material.minimum_quantity} onChange={(event) => change("minimum_quantity", event.target.value)} />
            </label>
          </div>

          <p className="inventory-modal-hint">
            A necessidade de{" "}
            <strong>{quantity(material.required_quantity, material.unit)}</strong>{" "}
            veio do mapa de quantidades. Depois do cadastro, a Kynka adicionarÃ¡ automaticamente este material ao planejamento do projeto.
          </p>

          <div className="inventory-modal-buttons">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Cadastrando..." : "Cadastrar e adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function PurchaseQuoteModal({ data, saving, onConfirm, onClose }) {
  const { quotes } = data;
  const fullOptions = (quotes.options ?? []).filter((option) => option.full_coverage);

  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal procurement-modal">
        <div className="inventory-modal-header">
          <div>
            <span className="page-eyebrow">Inteligência de compras</span>
            <h3>Escolher fornecedor</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>

        <div className="procurement-modal-content">
          <div className="purchase-quote-analysis">{quotes.analysis}</div>

          {fullOptions.length === 0 ? (
            <div className="projects-empty compact">
              Nenhum fornecedor cadastrado cobre todos os materiais desta compra.
              Cadastre preços na área Fornecedores ou crie o pedido sem fornecedor.
            </div>
          ) : (
            fullOptions.map((option) => (
              <div
                className={`purchase-quote-card ${option.supplier_id === quotes.best_supplier_id ? "recommended" : ""}`}
                key={option.supplier_id}
              >
                <div className="purchase-quote-header">
                  <div>
                    <strong>{option.supplier_name}</strong>
                    <span>{option.supplier_code} · prazo máximo {option.max_lead_time_days} dia(s)</span>
                  </div>
                  <div className="purchase-quote-total">
                    <strong>{money(option.total_estimated)}</strong>
                    <span>{option.supplier_id === quotes.best_supplier_id ? "Recomendado pela Kynka" : "Total estimado"}</span>
                  </div>
                </div>
                <div className="project-table-wrapper">
                  <table className="project-table">
                    <thead><tr><th>Material</th><th>Necessário</th><th>Pedido</th><th>Preço</th><th>Total</th></tr></thead>
                    <tbody>
                      {option.items.map((item) => (
                        <tr key={item.material_code}>
                          <td><strong>{item.material_name}</strong><span className="project-material-code">{item.material_code}</span></td>
                          <td>{quantity(item.requested_quantity, item.unit)}</td>
                          <td>{quantity(item.order_quantity, item.unit)}</td>
                          <td>{money(item.unit_price)}</td>
                          <td>{money(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="quote-modal-actions">
                  <button type="button" className="primary-button" disabled={saving} onClick={() => onConfirm(option.supplier_id)}>
                    Criar pedido com este fornecedor
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="quote-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="button" className="secondary-button" onClick={() => onConfirm(null)} disabled={saving}>
              Criar sem fornecedor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseOrdersModal({
  orders,
  saving,
  onClose,
  onMarkOrdered,
  onCancel,
  onReceive,
}) {
  const activeStatuses = [
    "draft",
    "ordered",
    "partially_received",
  ];

  const completedStatuses = [
    "received",
    "cancelled",
  ];

  const activeOrders = orders.filter((order) =>
    activeStatuses.includes(order.status)
  );

  const historyOrders = orders.filter((order) =>
    completedStatuses.includes(order.status)
  );

  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal procurement-modal">
        <div className="inventory-modal-header">
          <div>
            <span className="page-eyebrow">
              Compras
            </span>

            <h3>Pedidos de compra</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="procurement-modal-content">
          {orders.length === 0 ? (
            <div className="projects-empty compact">
              Nenhum pedido de compra criado.
            </div>
          ) : (
            <>
              <PurchaseOrderSection
                title="Pedidos ativos"
                description="Pedidos que ainda fazem parte do processo de compra e recebimento."
                orders={activeOrders}
                saving={saving}
                onMarkOrdered={onMarkOrdered}
                onCancel={onCancel}
                onReceive={onReceive}
                emptyMessage="Nenhum pedido ativo."
              />

              <PurchaseOrderSection
                title="Histórico"
                description="Pedidos totalmente recebidos ou cancelados."
                orders={historyOrders}
                saving={saving}
                onMarkOrdered={onMarkOrdered}
                onCancel={onCancel}
                onReceive={onReceive}
                emptyMessage="Nenhum pedido no histórico."
                history
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}


function PurchaseOrderSection({
  title,
  description,
  orders,
  saving,
  onMarkOrdered,
  onCancel,
  onReceive,
  emptyMessage,
  history = false,
}) {
  return (
    <section
      className={
        history
          ? "purchase-order-section purchase-order-history"
          : "purchase-order-section"
      }
    >
      <div className="purchase-order-section-header">
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>

        <span className="purchase-order-count">
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="purchase-order-empty">
          {emptyMessage}
        </div>
      ) : (
        orders.map((order) => (
          <PurchaseOrderCard
            key={order.id}
            order={order}
            saving={saving}
            onMarkOrdered={onMarkOrdered}
            onCancel={onCancel}
            onReceive={onReceive}
            history={history}
          />
        ))
      )}
    </section>
  );
}


function PurchaseOrderCard({
  order,
  saving,
  onMarkOrdered,
  onCancel,
  onReceive,
  history,
}) {
  const isCancelled =
    order.status === "cancelled";

  const isReceived =
    order.status === "received";

  return (
    <div
      className={[
        "purchase-order-card",
        history ? "history" : "",
        isCancelled ? "cancelled" : "",
        isReceived ? "completed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="purchase-order-header">
        <div>
          <strong>
            Pedido #{order.id}
          </strong>

          <span>
            {order.demand_codes.join(", ") ||
              "Consolidado"}
          </span>

          <span className="purchase-order-supplier">
            {order.supplier_name
              ? `Fornecedor: ${order.supplier_name}`
              : "Fornecedor não definido"}
          </span>

          {Number(order.total_estimated || 0) > 0 && (
            <span className="purchase-order-total">
              Estimado: {money(order.total_estimated)}
            </span>
          )}
        </div>

        <span
          className={`purchase-order-status ${order.status}`}
        >
          {formatPurchaseStatus(order.status)}
        </span>
      </div>

      {isCancelled && (
        <div className="purchase-order-history-message cancelled">
          Pedido cancelado. As quantidades abaixo são
          apenas o registro histórico do pedido e não
          representam materiais aguardando recebimento.
        </div>
      )}

      {isReceived && (
        <div className="purchase-order-history-message received">
          Pedido concluído. Todos os materiais deste
          pedido foram recebidos.
        </div>
      )}

      <PurchaseOrderItemsTable
        order={order}
        onReceive={onReceive}
      />

      {!history && (
        <div className="purchase-order-actions">
          {order.status === "draft" && (
            <button
              type="button"
              className="primary-button"
              disabled={saving}
              onClick={() =>
                onMarkOrdered(order.id)
              }
            >
              Marcar como enviado ao fornecedor
            </button>
          )}

          {![
            "received",
            "cancelled",
          ].includes(order.status) && (
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() =>
                onCancel(order.id)
              }
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function PurchaseOrderItemsTable({
  order,
  onReceive,
}) {
  const isCancelled =
    order.status === "cancelled";

  const canReceive = [
    "ordered",
    "partially_received",
  ].includes(order.status);

  return (
    <div className="project-table-wrapper">
      <table className="project-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Pedido</th>
            <th>Recebido</th>
            <th>Preço</th>
            <th>Total</th>
            <th>
              {isCancelled
                ? "Não recebido"
                : "Pendente"}
            </th>
            <th>Ação</th>
          </tr>
        </thead>

        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>
                  {item.material_name}
                </strong>

                <span className="project-material-code">
                  {item.material_code}
                </span>
              </td>

              <td>
                {quantity(
                  item.quantity_ordered,
                  item.unit
                )}
              </td>

              <td>
                {quantity(
                  item.quantity_received,
                  item.unit
                )}
              </td>

              <td>
                {Number(item.unit_price || 0) > 0
                  ? money(item.unit_price)
                  : "—"}
              </td>

              <td>
                {Number(item.total_price || 0) > 0
                  ? money(item.total_price)
                  : "—"}
              </td>

              <td>
                <strong
                  className={
                    !isCancelled &&
                    item.quantity_pending > 0
                      ? "project-shortage"
                      : ""
                  }
                >
                  {quantity(
                    item.quantity_pending,
                    item.unit
                  )}
                </strong>
              </td>

              <td>
                {item.quantity_pending > 0 &&
                canReceive ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      onReceive(
                        order.id,
                        item
                      )
                    }
                  >
                    Receber
                  </button>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReceivePurchaseItemModal({ data, setData, saving, onSubmit, onClose }) {
  return (
    <div className="inventory-modal-backdrop">
      <div className="inventory-modal">
        <div className="inventory-modal-header"><div><span className="page-eyebrow">Recebimento</span><h3>{data.item.material_name}</h3></div><button type="button" onClick={onClose}>Ã—</button></div>
        <form className="inventory-modal-form" onSubmit={onSubmit}>
          <p className="inventory-modal-hint">Pendente: <strong>{quantity(data.item.quantity_pending,data.item.unit)}</strong>. O recebimento criarÃ¡ automaticamente uma entrada no estoque.</p>
          <label>Quantidade recebida<input required type="number" min="0.0001" max={data.item.quantity_pending} step="any" value={data.quantity} onChange={(event) => setData((current) => ({...current, quantity:event.target.value}))} /></label>
          <div className="inventory-modal-buttons"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Recebendo..." : "Confirmar recebimento"}</button></div>
        </form>
      </div>
    </div>
  );
}

function formatPurchaseStatus(status) {
  const values = { draft:"Rascunho", ordered:"Enviado", partially_received:"Recebimento parcial", received:"Recebido", cancelled:"Cancelado" };
  return values[status] ?? status;
}


function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Ocorreu um erro inesperado.";
}


function formatStatus(status) {
  const values = {
    draft: "Rascunho",
    active: "Ativo",
    completed: "ConcluÃ­do",
    cancelled: "Cancelado",
  };

  return values[status] ?? status;
}


function formatKind(kind) {
  const values = {
    construction: "Obra",
    event: "Evento",
    project: "Projeto",
    production: "ProduÃ§Ã£o",
  };

  return values[kind] ?? kind;
}


function formatDate(value) {
  if (!value) {
    return "â€”";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


function formatNumber(value) {
  return Number(value || 0).toLocaleString(
    "pt-PT",
    {
      maximumFractionDigits: 3,
    }
  );
}


function quantity(value, unit) {
  return `${formatNumber(value)} ${unit}`;
}


function money(value) {
  return Number(value || 0).toLocaleString(
    "pt-PT",
    {
      style: "currency",
      currency: "EUR",
    }
  );
}

