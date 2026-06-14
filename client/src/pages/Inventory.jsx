import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import AddBatchModal from "../components/AddBatchModal";
import EditBatchModal from "../components/EditBatchModal";
import { BATCH_STATUS_LABEL, BATCH_STATUS_COLOR, RED_STATUSES } from "../utils/batchStatus";
import "./Inventory.css";

// Defines vertical row order for any position; lower number = higher on screen
const POSITION_ORDER = {
  UP: 0,
  UP_1: 0,
  UP_2: 1,
  DOWN: 2,
  DOWN_1: 2,
  DOWN_2: 3,
};

// Left-side row label for each position
export const POSITION_ROW_LABEL = {
  UP: "↑",
  DOWN: "↓",
  UP_1: "↑₁",
  UP_2: "↑₂",
  DOWN_1: "↓₁",
  DOWN_2: "↓₂",
};

// Full label for a position, used in panels and dropdowns
export const POSITION_FULL_LABEL = {
  UP: "Up",
  DOWN: "Down",
  UP_1: "Up 1",
  UP_2: "Up 2",
  DOWN_1: "Down 1",
  DOWN_2: "Down 2",
};

export default function Inventory() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialSlot, setModalInitialSlot] = useState(null);
  const [editBatch, setEditBatch] = useState(null);

  const fetchInventory = useCallback(() => {
    setLoading(true);
    apiFetch("/api/containers")
      .then((r) => r?.json())
      .then((data) => {
        if (data) setContainers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load inventory");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  function openModal(initialSlot = null) {
    setModalInitialSlot(initialSlot);
    setModalOpen(true);
  }

  function handleModalSuccess() {
    setModalOpen(false);
    setSelectedSlot(null);
    fetchInventory();
  }

  function handleEditSuccess() {
    setEditBatch(null);
    setSelectedSlot(null);
    fetchInventory();
  }

  function handleDeleted() {
    setSelectedSlot(null);
    fetchInventory();
  }

  const allSlots = containers.flatMap((c) => c.slots || []);
  const totalStraws = allSlots.reduce(
    (sum, s) => sum + (s.batch?.quantity || 0),
    0,
  );
  const slotsUsed = allSlots.filter((s) => s.batch && s.batch.quantity > 0).length;
  const issuesCount = allSlots.filter(
    (s) => RED_STATUSES.includes(s.batch?.status),
  ).length;

  return (
    <div className="inv-page">
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
        <button className="btn-primary" onClick={() => openModal()}>
          + Add batch
        </button>
      </div>

      <div className="inv-stats">
        <div className="stat-card">
          <span className="stat-value">{totalStraws.toLocaleString()}</span>
          <span className="stat-label">Total Straws</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {slotsUsed}
            <span className="stat-dim"> / {allSlots.length}</span>
          </span>
          <span className="stat-label">Slots Used</span>
        </div>
        <div className="stat-card">
          <span
            className={`stat-value ${issuesCount > 0 ? "stat-rejected" : ""}`}>
            {issuesCount}
          </span>
          <span className="stat-label">Issues</span>
        </div>
      </div>

      {loading && <p className="inv-loading">Loading inventory…</p>}
      {error && <p className="inv-error">{error}</p>}

      {!loading && !error && (
        <div className="containers-grid">
          {containers.map((c) => (
            <ContainerCard
              key={c.id}
              container={c}
              selectedSlotId={selectedSlot?.id}
              onSelect={setSelectedSlot}
            />
          ))}
        </div>
      )}

      {selectedSlot !== null && (
        <SlotPanel
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onAddBatch={(slot) => {
            setSelectedSlot(null);
            openModal({
              container_id: slot.container_id,
              slot_number: slot.slot_number,
              position: slot.position,
            });
          }}
          onEdit={(batch) => setEditBatch(batch)}
          onDeleted={handleDeleted}
        />
      )}

      {modalOpen && (
        <AddBatchModal
          containers={containers}
          initialSlot={modalInitialSlot}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {editBatch && (
        <EditBatchModal
          batch={editBatch}
          onClose={() => setEditBatch(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

function ContainerCard({ container, selectedSlotId, onSelect }) {
  const index = {};
  for (const slot of container.slots || []) {
    index[`${slot.slot_number}-${slot.position}`] = slot;
  }

  const maxSlot = Math.max(
    ...(container.slots || []).map((s) => s.slot_number),
    6,
  );
  const cols = Array.from({ length: maxSlot }, (_, i) => i + 1);

  const positions = [...new Set((container.slots || []).map((s) => s.position))].sort(
    (a, b) => {
      const orderDiff = (POSITION_ORDER[a] ?? 99) - (POSITION_ORDER[b] ?? 99);
      return orderDiff !== 0 ? orderDiff : a.localeCompare(b);
    },
  );

  return (
    <div
      className="container-card"
      style={maxSlot > 6 ? { gridColumn: "1 / -1" } : undefined}>
      <div className="container-title">{container.name}</div>
      <div
        className="slot-grid"
        style={{
          gridTemplateColumns: `20px repeat(${maxSlot}, 1fr)`,
          gridTemplateRows: `18px repeat(${positions.length}, 60px)`,
        }}>
        <div className="slot-row-label" />
        {cols.map((n) => (
          <div key={n} className="slot-col-header">
            {n}
          </div>
        ))}
        {positions.flatMap((position) => [
          <div key={`label-${position}`} className="slot-row-label">
            {POSITION_ROW_LABEL[position] || position}
          </div>,
          ...cols.map((n) => {
            const slot = index[`${n}-${position}`];
            return (
              <SlotCell
                key={`${n}-${position}`}
                slot={slot}
                selected={slot?.id === selectedSlotId}
                onClick={() =>
                  slot && onSelect({ ...slot, container_name: container.name })
                }
              />
            );
          }),
        ])}
      </div>
    </div>
  );
}

function SlotCell({ slot, selected, onClick }) {
  if (!slot) {
    return <div className="slot-cell slot-cell--missing" />;
  }
  const batch = slot.batch?.quantity > 0 ? slot.batch : null;
  const statusClass = batch ? BATCH_STATUS_COLOR[batch.status] || "" : "";

  return (
    <button
      className={`slot-cell ${statusClass} ${selected ? "slot-cell--selected" : ""} ${!batch ? "slot-cell--empty" : ""}`}
      onClick={onClick}
      title={
        batch
          ? `${batch.bull_name} — ${batch.quantity} straws (${BATCH_STATUS_LABEL[batch.status] || batch.status})`
          : "Empty"
      }>
      {batch ? (
        <>
          <span className="cell-bull">{batch.bull_name}</span>
          <span className="cell-qty">{batch.quantity}</span>
        </>
      ) : (
        <span className="cell-empty">—</span>
      )}
    </button>
  );
}

function SlotPanel({ slot, onClose, onAddBatch, onEdit, onDeleted }) {
  const batch = slot.batch?.quantity > 0 ? slot.batch : null;
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await apiFetch(`/api/batches/${batch.id}`, {
        method: "DELETE",
      });
      if (!res) return;
      if (!res.ok) {
        const d = await res.json();
        setDeleteError(d.error || "Delete failed");
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch (err) {
      console.error("Error deleting batch:", err);
      setDeleteError("Network error");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="slot-panel">
        <div className="panel-header">
          <div>
            <div className="panel-location">
              Slot {slot.slot_number} {POSITION_ROW_LABEL[slot.position] || slot.position}
            </div>
            {slot.container_name && (
              <div className="panel-container-name">{slot.container_name}</div>
            )}
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {batch ? (
          <div className="panel-body">
            <div className={`panel-status-badge ${BATCH_STATUS_COLOR[batch.status]}`}>
              {BATCH_STATUS_LABEL[batch.status] || batch.status}
            </div>

            <dl className="panel-fields">
              <div className="panel-field">
                <dt>Bull Name</dt>
                <dd>{batch.bull_name || "—"}</dd>
              </div>
              <div className="panel-field">
                <dt>Bull ID</dt>
                <dd>{batch.bull_code || "—"}</dd>
              </div>
              <div className="panel-field">
                <dt>SIO Batch Code</dt>
                <dd>{batch.sio_batch_code || "—"}</dd>
              </div>
              <div className="panel-field">
                <dt>Quantity</dt>
                <dd>{batch.quantity} straws</dd>
              </div>
              <div className="panel-field">
                <dt>Production Date</dt>
                <dd>{formatDate(batch.production_date)}</dd>
              </div>
            </dl>

            <div className="panel-actions">
              {!deleteConfirm ? (
                <>
                  <button
                    className="btn-ghost"
                    onClick={() =>
                      onEdit({
                        ...batch,
                        container_name: slot.container_name,
                        slot_number: slot.slot_number,
                        position: slot.position,
                      })
                    }>
                    Edit
                  </button>
                  <button
                    className="btn-danger-ghost"
                    onClick={() => setDeleteConfirm(true)}>
                    Delete
                  </button>
                </>
              ) : (
                <div className="delete-confirm">
                  <span className="delete-confirm-text">
                    Delete this batch?
                  </span>
                  {deleteError && (
                    <span className="delete-error">{deleteError}</span>
                  )}
                  <div className="delete-confirm-btns">
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setDeleteConfirm(false);
                        setDeleteError("");
                      }}
                      disabled={deleting}>
                      Cancel
                    </button>
                    <button
                      className="btn-danger"
                      onClick={handleDelete}
                      disabled={deleting}>
                      {deleting ? "Deleting…" : "Confirm Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="panel-body panel-empty">
            <p>This slot is empty.</p>
            <button className="btn-primary" onClick={() => onAddBatch(slot)}>
              + Add batch here
            </button>
          </div>
        )}
      </div>
    </>
  );
}
