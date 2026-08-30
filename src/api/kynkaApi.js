const API_URL = "http://127.0.0.1:8000/api/v1";


async function jsonRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;

    try {
      const data = await response.json();

      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (data.error) {
        message = data.error;
      }
    } catch {
      // MantÃ©m a mensagem padrÃ£o.
    }

    throw new Error(message);
  }

  return response.json();
}


// ============================================================
// System
// ============================================================


export function checkHealth() {
  return jsonRequest("/health");
}


export function getStatus() {
  return jsonRequest("/status");
}


// ============================================================
// Chat
// ============================================================


export function sendMessage(message, sessionId = null) {
  return jsonRequest("/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });
}


export function getCapabilities() {
  return jsonRequest("/capabilities");
}


// ============================================================
// Inventory - queries
// ============================================================


export function getInventory() {
  return jsonRequest("/inventory");
}


export function getMaterial(code) {
  return jsonRequest(
    `/inventory/${encodeURIComponent(code)}`
  );
}


export function searchInventory(query) {
  const params = new URLSearchParams({
    query,
  });

  return jsonRequest(
    `/inventory/search?${params.toString()}`
  );
}


export function getLowStock() {
  return jsonRequest("/inventory/low-stock");
}


export function getInventorySummary() {
  return jsonRequest("/inventory/summary");
}


// ============================================================
// Inventory - materials
// ============================================================


export function createMaterial(material) {
  return jsonRequest("/inventory", {
    method: "POST",
    body: JSON.stringify(material),
  });
}


export function updateMaterial(code, material) {
  return jsonRequest(
    `/inventory/${encodeURIComponent(code)}`,
    {
      method: "PUT",
      body: JSON.stringify(material),
    }
  );
}


export function deleteMaterial(code) {
  return jsonRequest(
    `/inventory/${encodeURIComponent(code)}`,
    {
      method: "DELETE",
    }
  );
}


// ============================================================
// Inventory - movements
// ============================================================


export function createInventoryMovement(
  code,
  movement
) {
  return jsonRequest(
    `/inventory/${encodeURIComponent(code)}/movements`,
    {
      method: "POST",
      body: JSON.stringify(movement),
    }
  );
}


export function getInventoryMovements(
  code = null,
  limit = 100
) {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (code) {
    return jsonRequest(
      `/inventory/${encodeURIComponent(code)}/movements?${params.toString()}`
    );
  }

  return jsonRequest(
    `/inventory/movements?${params.toString()}`
  );
}


// ============================================================
// Inventory - import
// ============================================================


export async function importInventory(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/inventory/import`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;

    try {
      const data = await response.json();

      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (data.error) {
        message = data.error;
      }
    } catch {
      // MantÃ©m a mensagem padrÃ£o.
    }

    throw new Error(message);
  }

  return response.json();
}

// ============================================================
// Projects / Demands
// ============================================================


export function getDemands() {
  return jsonRequest("/demands");
}


export function getDemand(demandId) {
  return jsonRequest(
    `/demands/${demandId}`
  );
}


export function createDemand(demand) {
  return jsonRequest("/demands", {
    method: "POST",
    body: JSON.stringify(demand),
  });
}


export function getDemandRequirements(demandId) {
  return jsonRequest(
    `/demands/${demandId}/requirements`
  );
}


export function createDemandRequirement(
  demandId,
  requirement
) {
  return jsonRequest(
    `/demands/${demandId}/requirements`,
    {
      method: "POST",
      body: JSON.stringify(requirement),
    }
  );
}


export function getDemandPlan(demandId) {
  return jsonRequest(
    `/demands/${demandId}/plan`
  );
}


export function reserveDemandStock(demandId) {
  return jsonRequest(
    `/demands/${demandId}/reserve`,
    {
      method: "POST",
    }
  );
}


export function getDemandReservations(demandId) {
  return jsonRequest(
    `/demands/${demandId}/reservations`
  );
}

// ============================================================
// Projects / Demands - quantity map
// ============================================================


export async function importDemandQuantityMap(
  demandId,
  file
) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/demands/${demandId}/quantity-map/import`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;

    try {
      const data = await response.json();

      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (data.error) {
        message = data.error;
      }
    } catch {
      // MantÃ©m a mensagem padrÃ£o.
    }

    throw new Error(message);
  }

  return response.json();
}


// ============================================================
// Projects / Demands - missing materials
// ============================================================


export function resolveMissingMaterial(
  demandId,
  material
) {
  return jsonRequest(
    `/demands/${demandId}/missing-materials/resolve`,
    {
      method: "POST",
      body: JSON.stringify(material),
    }
  );
}


// ============================================================
// Procurement / Purchase lists
// ============================================================
export function getDemandPurchaseList(demandId){ return jsonRequest(`/demands/${demandId}/purchase-list`); }
export function getConsolidatedPurchaseList(demandIds=null){ return jsonRequest('/procurement/consolidated',{method:'POST',body:JSON.stringify({demand_ids:demandIds})}); }


// ============================================================
// Purchase Orders / Receiving
// ============================================================

export function createPurchaseOrder(demandIds = null, notes = "", supplierId = null) {
  return jsonRequest("/procurement/orders", {
    method: "POST",
    body: JSON.stringify({ demand_ids: demandIds, notes, supplier_id: supplierId }),
  });
}

export function getPurchaseOrders() {
  return jsonRequest("/procurement/orders");
}

export function markPurchaseOrderOrdered(orderId) {
  return jsonRequest(`/procurement/orders/${orderId}/mark-ordered`, {
    method: "POST",
  });
}

export function cancelPurchaseOrder(orderId) {
  return jsonRequest(`/procurement/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

export function receivePurchaseOrderItem(orderId, itemId, quantity) {
  return jsonRequest(`/procurement/orders/${orderId}/items/${itemId}/receive`, {
    method: "POST",
    body: JSON.stringify({ quantity: Number(quantity) }),
  });
}


// ============================================================
// Suppliers / Pricing Intelligence
// ============================================================

export function getSuppliers(activeOnly = false) {
  return jsonRequest(`/suppliers?active_only=${activeOnly ? "true" : "false"}`);
}

export function createSupplier(data) {
  return jsonRequest("/suppliers", { method: "POST", body: JSON.stringify(data) });
}

export function updateSupplier(supplierId, data) {
  return jsonRequest(`/suppliers/${supplierId}`, { method: "PUT", body: JSON.stringify(data) });
}

export function setSupplierActive(supplierId, active) {
  return jsonRequest(`/suppliers/${supplierId}/status`, {
    method: "PUT",
    body: JSON.stringify({ active: Boolean(active) }),
  });
}

export function getSupplierMaterials(supplierId) {
  return jsonRequest(`/suppliers/${supplierId}/materials`);
}

export function upsertSupplierMaterial(supplierId, data) {
  return jsonRequest(`/suppliers/${supplierId}/materials`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteSupplierMaterial(supplierId, materialCode) {
  return jsonRequest(`/suppliers/${supplierId}/materials/${encodeURIComponent(materialCode)}`, {
    method: "DELETE",
  });
}

export function getSupplierMaterialHistory(supplierId, materialCode) {
  return jsonRequest(`/suppliers/${supplierId}/materials/${encodeURIComponent(materialCode)}/history`);
}

export function getMaterialSupplierQuotes(materialCode, quantity = 1) {
  const params = new URLSearchParams({ quantity: String(quantity) });
  return jsonRequest(`/supplier-quotes/materials/${encodeURIComponent(materialCode)}?${params.toString()}`);
}

export function getPurchaseQuotes(demandIds = null) {
  return jsonRequest("/procurement/quotes", {
    method: "POST",
    body: JSON.stringify({ demand_ids: demandIds }),
  });
}
