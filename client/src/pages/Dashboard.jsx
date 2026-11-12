import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import "./Dashboard.css";

const ACTIVITY_ICON = {
  batch: "🧪",
  shipment: "📦",
  task_done: "✅",
  task_created: "📝",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5 || h >= 22) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isOverdue(task) {
  if (!task.due_date) return false;
  return task.due_date < todayStr();
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function DutyCard({ duty, userId, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const label = duty.name.toLowerCase();
  const isMine = duty.claimed_by === userId;
  const claimerFirst = (duty.claimed_by_name || "Someone").split(" ")[0];

  async function act(action) {
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/api/duties/${duty.id}/${action}`, {
        method: "POST",
      });
      if (!res) return;
      const body = await res.json();
      if (res.ok) {
        onChange(body);
      } else {
        setError(body.error || "Something went wrong");
        if (body.duty) onChange(body.duty);
      }
    } catch (err) {
      console.error(`Duty ${action} error:`, err);
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`dash-duty${duty.claimed_by ? " dash-duty--claimed" : ""}`}>
      <div className="dash-duty-info">
        <span className="dash-duty-day">{DAY_NAMES[duty.day_of_week]}</span>
        <span className="dash-duty-text">
          {!duty.claimed_by
            ? `${duty.name} this week: nobody yet`
            : isMine
              ? `You're getting the ${label}`
              : `${claimerFirst} is getting the ${label}`}
        </span>
        {error && <span className="dash-duty-error">{error}</span>}
      </div>
      {!duty.claimed_by && (
        <button
          className="dash-duty-btn"
          disabled={busy}
          onClick={() => act("claim")}>
          I'll take it
        </button>
      )}
      {isMine && (
        <button
          className="dash-duty-btn dash-duty-btn--cancel"
          disabled={busy}
          onClick={() => act("cancel")}>
          Cancel
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [duties, setDuties] = useState([]);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const firstName = (user.name || "").split(" ")[0] || "there";

  useEffect(() => {
    apiFetch("/api/dashboard")
      .then((r) => r?.json())
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard");
        setLoading(false);
      });

    apiFetch("/api/duties")
      .then((r) => r?.json())
      .then((d) => {
        if (Array.isArray(d)) setDuties(d);
      })
      .catch((err) => console.error("Duties fetch error:", err));
  }, []);

  function updateDuty(updated) {
    setDuties((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  if (loading) return <p className="dash-status">Loading…</p>;
  if (error) return <p className="dash-status dash-status--error">{error}</p>;

  const openCount = data.tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="dash-page page">
      <div className="dash-greeting">
        <h1 className="dash-greeting-text">
          {greeting()}, {firstName}
        </h1>
      </div>

      <div className="inv-stats">
        <div className="stat-card">
          <span className="stat-value">{data.today_straws}</span>
          <span className="stat-label">Straws Today</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data.today_bulls}</span>
          <span className="stat-label">Bulls Today</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{openCount}</span>
          <span className="stat-label">Open Tasks</span>
        </div>
        <div className="stat-card">
          <span
            className={`stat-value ${data.overdue_count > 0 ? "stat-rejected" : ""}`}>
            {data.overdue_count}
          </span>
          <span className="stat-label">Overdue</span>
        </div>
      </div>

      {duties.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">Weekly Duties</h2>
          {duties.map((d) => (
            <DutyCard
              key={d.id}
              duty={d}
              userId={user.id}
              onChange={updateDuty}
            />
          ))}
        </section>
      )}

      <div className="dash-body">
        <section className="dash-section">
          <h2 className="dash-section-title">Today's Tasks</h2>
          {data.tasks.length === 0 ? (
            <p className="dash-empty">No open tasks.</p>
          ) : (
            <div className="dash-task-list">
              {data.tasks.map((t) => (
                <button
                  key={t.id}
                  className={`dash-task-row${isOverdue(t) ? " dash-task-row--overdue" : ""}`}
                  onClick={() => navigate("/tasks")}>
                  <div className="dash-task-title">{t.title}</div>
                  <div className="dash-task-meta">
                    <span
                      className={`dash-task-status dash-task-status--${t.status}`}>
                      {t.status === "in_progress"
                        ? "In Progress"
                        : t.status === "pending"
                          ? "Pending"
                          : "Done"}
                    </span>
                    {t.due_date && (
                      <span
                        className={
                          isOverdue(t) ? "dash-task-overdue" : "dash-task-due"
                        }>
                        {isOverdue(t) ? "⚠ " : ""}Due {formatDate(t.due_date)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="dash-section">
          <h2 className="dash-section-title">Activity Feed</h2>
          {data.activity.length === 0 ? (
            <p className="dash-empty">No activity today.</p>
          ) : (
            <div className="dash-activity-list">
              {data.activity.map((a, i) => (
                <div key={i} className="dash-activity-row">
                  <span className="dash-activity-icon">
                    {ACTIVITY_ICON[a.type] || "•"}
                  </span>
                  <div className="dash-activity-content">
                    <span className="dash-activity-message">{a.message}</span>
                    <span className="dash-activity-time">
                      {formatTime(a.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
