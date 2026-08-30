export default function StatusBadge({ online }) {
  return (
    <div className={`status-badge ${online ? "online" : "offline"}`}>
      <span className="status-dot" />

      {online ? "Backend online" : "Backend offline"}
    </div>
  );
}