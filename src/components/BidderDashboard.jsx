import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";

const editableRowFields = [
  "client",
  "remarks",
  "type",
  "workedHours",
  "amtPerHour",
  "budget",
  "quoted",
  "interviews",
  "status",
  "createdAt",
];

const decimalOnly = (value) => {
  const cleaned = String(value).replace(/[^\d.]/g, "");
  const [whole, ...decimalParts] = cleaned.split(".");
  return decimalParts.length ? `${whole}.${decimalParts.join("")}` : whole;
};

const integerOnly = (value) => String(value).replace(/\D/g, "");

function BidderDashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draftRow, setDraftRow] = useState({
    client: "",
    remarks: "",
    type: "Fixed",
    workedHours: "",
    amtPerHour: "",
    budget: "",
    quoted: "",
    interviews: "",
    status: "Open",
    createdAt: "",
  });
  const [editingRowId, setEditingRowId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [savingRowId, setSavingRowId] = useState(null);
  const [selectedDailyBidDate, setSelectedDailyBidDate] = useState("");
  const [dailyBidDraft, setDailyBidDraft] = useState("");
  const [editingDailyBidId, setEditingDailyBidId] = useState(null);
  const [dailyBidEditDraft, setDailyBidEditDraft] = useState(null);
  const [savingDailyBid, setSavingDailyBid] = useState(false);
  const [isEditingTodayBid, setIsEditingTodayBid] = useState(false);
  const [showDailyHistory, setShowDailyHistory] = useState(false);
  const [selectedDailyBidMonth, setSelectedDailyBidMonth] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const dailyHistoryTableRef = useRef(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const showToast = (kind, title, message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ kind, title, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  };

  const todayDateKey = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const mondayDateKey = () => {
    const date = new Date();
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const monthDay = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${monthDay}`;
  };

  const rowDateKey = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/data/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.reload();
        return;
      }
      if (res.ok) setData(json);
      else setError(json.error);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const updateLocalRow = (id, updates) => {
    setData((current) =>
      current
        ? {
            ...current,
            team: {
              ...current.team,
              bidders: current.team.bidders.map((bidder) => ({
                ...bidder,
                rows: bidder.rows.map((row) =>
                  row.id === id ? { ...row, ...updates } : row,
                ),
              })),
            },
          }
        : current,
    );
  };

  const updateRow = async (id, updates) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/api/rows/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Failed to save row");
    }
  };

  const saveDailyBidCount = async () => {
    const bidDate = selectedDailyBidDate || todayDateKey();
    const currentValue =
      dailyBidDraft === "" && selectedBidRecord
        ? String(selectedBidRecord.totalBids)
        : dailyBidDraft;
    const totalBids = Number(currentValue);
    if (!bidDate || !Number.isInteger(totalBids) || totalBids < 0) return;

    try {
      setSavingDailyBid(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/daily-bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: bidDate,
          totalBids,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save bid count");
      }

      setDailyBidDraft("");
      setIsEditingTodayBid(false);
      showToast("success", "Saved", "Daily bid count updated");
      fetchDashboard();
    } catch (err) {
      showToast("error", "Not saved", err.message);
    } finally {
      setSavingDailyBid(false);
    }
  };

  const startEditDailyBid = (record) => {
    setEditingDailyBidId(record.id);
    setDailyBidEditDraft({
      date: record.date,
      totalBids: String(record.totalBids),
    });
  };

  const cancelEditDailyBid = () => {
    setEditingDailyBidId(null);
    setDailyBidEditDraft(null);
  };

  const openDailyBidMonth = (monthKey) => {
    setSelectedDailyBidMonth(monthKey);
    setSelectedDailyBidDate(`${monthKey}-01`);
    setDailyBidDraft("");
    setIsEditingTodayBid(false);
    setShowDailyHistory(true);
    window.setTimeout(() => {
      dailyHistoryTableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const saveEditedDailyBid = async (id) => {
    const totalBids = Number(dailyBidEditDraft?.totalBids);
    if (
      !dailyBidEditDraft?.date ||
      !Number.isInteger(totalBids) ||
      totalBids < 0
    )
      return;
    const isNewRecord = !id || String(id).startsWith("empty-");

    try {
      setSavingDailyBid(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        isNewRecord
          ? `${API_BASE_URL}/api/daily-bids`
          : `${API_BASE_URL}/api/daily-bids/${id}`,
        {
          method: isNewRecord ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date: dailyBidEditDraft.date,
            totalBids,
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save bid count");
      }

      cancelEditDailyBid();
      showToast("success", "Saved", "Bid history updated");
      fetchDashboard();
    } catch (err) {
      showToast("error", "Not saved", err.message);
    } finally {
      setSavingDailyBid(false);
    }
  };

  const startEditRow = (row) => {
    setEditingRowId(row.id);
    setEditDraft(
      editableRowFields.reduce(
        (draft, field) => ({
          ...draft,
          [field]: row[field] || "",
        }),
        {},
      ),
    );
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setEditDraft(null);
  };

  const changeEditDraft = (field, value) => {
    setEditDraft((current) => ({ ...current, [field]: value }));
  };

  const saveEditedRow = async (id) => {
    if (!editDraft?.client?.trim()) return;

    try {
      setSavingRowId(id);
      await updateRow(id, editDraft);
      updateLocalRow(id, editDraft);
      cancelEditRow();
      showToast("success", "Saved", "Client row updated");
      fetchDashboard();
    } catch (err) {
      showToast("error", "Not saved", err.message);
    } finally {
      setSavingRowId(null);
    }
  };

  const addRow = () => {
    setDraftRow({
      client: "",
      remarks: "",
      type: "Fixed",
      workedHours: "",
      amtPerHour: "",
      budget: "",
      quoted: "",
      interviews: "",
      status: "Open",
      createdAt: todayDateKey(),
    });
    setIsAdding(true);
  };

  const saveRow = async () => {
    const bidder = data.team.bidders.find((b) => b.name === user.name);
    if (!bidder || !draftRow.client.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/rows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...draftRow,
          bidderId: bidder.id,
          wk: data.state.weekNo,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to add client");
      }

      setIsAdding(false);
      showToast("success", "Added", "Client row created");
      fetchDashboard();
    } catch (err) {
      showToast("error", "Not added", err.message);
    }
  };

  const statusClass = (status) =>
    status === "Converted"
      ? "won"
      : status === "Hired elsewhere"
        ? "lost"
        : status === "Job post deleted" ||
            status === "Client ended conversation"
          ? "dead"
          : "open";

  const renderText = (value) =>
    value || <span className="muted-inline">-</span>;
  const formatInsertedDate = (value) => {
    if (!value) return <span className="muted-inline">-</span>;

    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      return <span className="muted-inline">-</span>;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const formatDailyDate = (value) => {
    if (!value) return <span className="muted-inline">-</span>;

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime()))
      return <span className="muted-inline">-</span>;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const formatMonthLabel = (monthKey) => {
    if (!monthKey) return "";

    const date = new Date(`${monthKey}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return monthKey;

    return date.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };
  const getMonthDays = (monthKey, records) => {
    if (!monthKey) return [];

    const [year, month] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      const date = `${monthKey}-${day}`;
      const record = records.find((item) => item.date === date);

      return (
        record || {
          id: `empty-${date}`,
          date,
          totalBids: 0,
          isEmpty: true,
        }
      );
    });
  };
  const currentInsertedDate = formatInsertedDate(new Date());

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const bidder = data.team.bidders.find((b) => b.name === user.name);
  if (!bidder) return <div>Bidder data not found</div>;

  const stats = bidder.stats;
  const dailyBidCounts = bidder.dailyBidCounts || [];
  const activeDailyBidDate = selectedDailyBidDate || todayDateKey();
  const selectedBidRecord = dailyBidCounts.find(
    (record) => record.date === activeDailyBidDate,
  );
  const dailyBidInputValue =
    dailyBidDraft === "" && selectedBidRecord
      ? String(selectedBidRecord.totalBids)
      : dailyBidDraft;
  const canEditSelectedBid = !selectedBidRecord || isEditingTodayBid;
  const totalBidsThisWeek = dailyBidCounts
    .filter(
      (record) =>
        record.date >= mondayDateKey() && record.date <= todayDateKey(),
    )
    .reduce((sum, record) => sum + Number(record.totalBids || 0), 0);
  const totalBidsAllTime = dailyBidCounts.reduce(
    (sum, record) => sum + Number(record.totalBids || 0),
    0,
  );
  const selectedDailyBidMonthKey = activeDailyBidDate.slice(0, 7);
  const dailyBidMonths = dailyBidCounts.reduce((months, record) => {
    const monthKey = record.date.slice(0, 7);
    const existing = months.find((month) => month.key === monthKey);
    if (existing) {
      existing.total += Number(record.totalBids || 0);
      existing.days += 1;
      return months;
    }

    return [
      ...months,
      { key: monthKey, total: Number(record.totalBids || 0), days: 1 },
    ];
  }, []);
  if (
    selectedDailyBidMonthKey &&
    !dailyBidMonths.some((month) => month.key === selectedDailyBidMonthKey)
  ) {
    dailyBidMonths.push({ key: selectedDailyBidMonthKey, total: 0, days: 0 });
  }
  dailyBidMonths.sort((a, b) => b.key.localeCompare(a.key));
  const activeDailyBidMonth = dailyBidMonths.some(
    (month) => month.key === selectedDailyBidMonth,
  )
    ? selectedDailyBidMonth
    : selectedDailyBidMonthKey || dailyBidMonths[0]?.key || "";
  const visibleDailyBidCounts = getMonthDays(
    activeDailyBidMonth,
    dailyBidCounts,
  );
  const asks = bidder.rows
    .filter((r) => r.note && r.note.trim() !== "" && r.status === "Open")
    .sort((a, b) => {
      const worthA = parseFloat(a.quoted || a.budget || 0);
      const worthB = parseFloat(b.quoted || b.budget || 0);
      return worthB - worthA;
    });

  const rowMonths = [...new Set(bidder.rows.map(r => {
    if (!r.createdAt) return null;
    const d = new Date(r.createdAt);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).filter(Boolean))].sort().reverse();

  const formatMonthOption = (monthStr) => {
    const [yyyy, mm] = monthStr.split('-');
    const d = new Date(yyyy, parseInt(mm) - 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const filteredRows = (filterMonth === "all" 
    ? bidder.rows 
    : bidder.rows.filter(r => {
        if (!r.createdAt) return false;
        const d = new Date(r.createdAt);
        if (isNaN(d.getTime())) return false;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === filterMonth;
      }))
    .filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return r.client && r.client.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const uniqueClientNames = Array.from(
    new Set((bidder.rows || []).map(r => r.client?.trim()).filter(Boolean))
  ).sort();

  return (
    <div className="sheet">
      <datalist id="client-suggestions">
        {uniqueClientNames.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {toast && (
        <div
          className={`toast notice-${toast.kind}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-kicker">{toast.title}</div>
          <div className="toast-message">{toast.message}</div>
        </div>
      )}

      <div className="toolbar">
        <img
          className="toolbar-brand"
          src="/10turtle-wordmark.svg"
          alt="10turtle"
        />
        <button className="btn ghost" onClick={onLogout}>
          Logout
        </button>
      </div>

      <header className="masthead">
        <h1 className="report-title">{user.name}</h1>
        <div className="accent-rule"></div>
      </header>

      <section>
        <div className="sec-head">
          <span className="sec-num">01</span>
          <span className="sec-label">Where I am</span>
        </div>
        <h2 className="sec-title">My week so far</h2>
        <p className="sec-note">
          Only your own clients. Your team lead sees these the moment you save.
        </p>
        <div className="stats">
          <div className="stat">
            <div className="s-lab">Response</div>
            <div className="s-row">
              <div className="big">{stats.clients}</div>
            </div>
            <div className="s-sub">
              {stats.fresh} fresh · {stats.hourly} hourly
            </div>
          </div>
          <div className="stat">
            <div className="s-lab">Open Pipeline</div>
            <div className="s-row">
              <span className="cur">$</span>
              <div className="big">{stats.pipeline.toLocaleString()}</div>
            </div>
            <div className="s-sub">
              {stats.big} big tickets over ${data.state.thresh}
            </div>
          </div>
          <div className="stat accent">
            <div className="s-lab">Revenue Won</div>
            <div className="s-row">
              <span className="cur">$</span>
              <div className="big">{stats.revenue.toLocaleString()}</div>
            </div>
            <div className="s-sub">
              {stats.Converted} converted ({(stats.conv * 100).toFixed(0)}%)
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="sec-head">
          <span className="sec-num">02</span>
          <span className="sec-label">Daily bid count</span>
        </div>
        <h2 className="sec-title">My bids by day</h2>
        <p className="sec-note">
          Enter bids for any day. Weekly count resets every Monday morning.
        </p>

        <div className="daily-bids-panel">
          <div className="daily-tile daily-today">
            <div>
              <div className="s-lab">Add bids by date</div>
              <div className="daily-today-row">
                <input
                  className="f daily-date-input"
                  type="date"
                  value={activeDailyBidDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setSelectedDailyBidDate(nextDate);
                    setSelectedDailyBidMonth(nextDate.slice(0, 7));
                    setDailyBidDraft("");
                    setIsEditingTodayBid(false);
                  }}
                  disabled={savingDailyBid}
                />
                {canEditSelectedBid ? (
                  <input
                    className="f daily-count-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={dailyBidInputValue}
                    onChange={(e) => setDailyBidDraft(e.target.value)}
                    disabled={savingDailyBid}
                  />
                ) : (
                  <div className="daily-count-display">
                    {dailyBidInputValue}
                  </div>
                )}
                <div className="daily-today-actions">
                  {selectedBidRecord && !isEditingTodayBid ? (
                    <button
                      className="btn mini"
                      type="button"
                      onClick={() => {
                        setDailyBidDraft(String(selectedBidRecord.totalBids));
                        setIsEditingTodayBid(true);
                      }}
                      disabled={savingDailyBid}
                    >
                      Update
                    </button>
                  ) : (
                    <>
                      <button
                        className="icon-btn save"
                        type="button"
                        title="Save bids for selected date"
                        aria-label="Save bids for selected date"
                        onClick={saveDailyBidCount}
                        disabled={savingDailyBid || dailyBidInputValue === ""}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12.5l4 4L19 6.5" />
                        </svg>
                      </button>
                      {selectedBidRecord && (
                        <button
                          className="icon-btn cancel"
                          type="button"
                          title="Cancel bid update"
                          aria-label="Cancel bid update"
                          onClick={() => {
                            setDailyBidDraft("");
                            setIsEditingTodayBid(false);
                          }}
                          disabled={savingDailyBid}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="daily-tile">
            <div className="s-lab">This week bids</div>
            <div className="daily-total-value">
              {totalBidsThisWeek.toLocaleString()}
            </div>
            <div className="daily-sub">Since Monday</div>
          </div>

          <div className="daily-tile">
            <div className="s-lab">Total bids</div>
            <div className="daily-total-value">
              {totalBidsAllTime.toLocaleString()}
            </div>
            <div className="daily-sub">All entries</div>
          </div>

          <button
            className={`daily-tile daily-history-toggle${showDailyHistory ? " active" : ""}`}
            type="button"
            onClick={() => setShowDailyHistory((current) => !current)}
            aria-expanded={showDailyHistory}
          >
            <div>
              <div className="s-lab">Calendar</div>
              <div className="daily-calendar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                </svg>
              </div>
            </div>
            <div className="daily-sub">
              {showDailyHistory ? "Hide history" : "View history"}
            </div>
          </button>
        </div>

        {showDailyHistory && (
          <div className="daily-history-wrap">
            <div className="daily-history-title">Bid history</div>
            <div className="daily-months" aria-label="Bid history months">
              {dailyBidMonths.map((month) => (
                <button
                  key={month.key}
                  type="button"
                  className={`daily-month-card${activeDailyBidMonth === month.key ? " active" : ""}`}
                  onClick={() => openDailyBidMonth(month.key)}
                  aria-label={`Open daily bid history for ${formatMonthLabel(month.key)}`}
                >
                  <span>{formatMonthLabel(month.key)}</span>
                  <b>{month.total.toLocaleString()}</b>
                  <small>
                    {month.days} day{month.days === 1 ? "" : "s"}
                  </small>
                </button>
              ))}
            </div>
            <div
              ref={dailyHistoryTableRef}
              className="wrapscroll daily-history daily-history-full"
            >
              <div className="daily-history-month">
                {formatMonthLabel(activeDailyBidMonth)}
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "48%" }}>Date</th>
                    <th className="r" style={{ width: "32%" }}>
                      Bids on that day
                    </th>
                    <th className="c" style={{ width: "20%" }}>
                      Edit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDailyBidCounts.map((record) => {
                    const isEditing = editingDailyBidId === record.id;
                    const draft = isEditing ? dailyBidEditDraft : record;

                    return (
                      <tr key={record.id}>
                        <td>{formatDailyDate(record.date)}</td>
                        <td className="r">
                          {isEditing ? (
                            <input
                              className="f num"
                              type="number"
                              min="0"
                              value={draft.totalBids ?? ""}
                              onChange={(e) =>
                                setDailyBidEditDraft((current) => ({
                                  ...current,
                                  totalBids: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            record.totalBids.toLocaleString()
                          )}
                        </td>
                        <td className="c row-actions">
                          {isEditing ? (
                            <div className="action-pair">
                              <button
                                className="icon-btn save"
                                type="button"
                                title="Save bid count"
                                aria-label="Save bid count"
                                onClick={() => saveEditedDailyBid(record.id)}
                                disabled={savingDailyBid}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M5 12.5l4 4L19 6.5" />
                                </svg>
                              </button>
                              <button
                                className="icon-btn cancel"
                                type="button"
                                title="Cancel edit"
                                aria-label="Cancel edit"
                                onClick={cancelEditDailyBid}
                                disabled={savingDailyBid}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              className="icon-btn"
                              type="button"
                              title="Edit bid count"
                              aria-label="Edit bid count"
                              onClick={() => startEditDailyBid(record)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 8.5l2 2" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                        );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {asks.length > 0 && (
        <section>
          <div className="sec-head">
            <span className="sec-num">03</span>
            <span className="sec-label">From my team lead</span>
          </div>
          <h2 className="sec-title">
            What to chase this week{" "}
            <span className="blockcount">{asks.length}</span>
          </h2>
          <p className="sec-note">
            Your team lead writes these. Biggest first. You cannot edit them,
            you act on them.
          </p>
          <div className="wrapscroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Client</th>
                  <th className="r" style={{ width: "12%" }}>
                    Worth
                  </th>
                  <th className="c" style={{ width: "9%" }}>
                    Int.
                  </th>
                  <th style={{ width: "53%" }}>The angle</th>
                </tr>
              </thead>
              <tbody>
                {asks.map((r) => (
                  <tr key={`ask-${r.id}`}>
                    <td>{r.client}</td>
                    <td className="r">${r.quoted || r.budget}</td>
                    <td className="c">{r.interviews}</td>
                    <td>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div className="sec-head">
          <span className="sec-num">04</span>
          <span className="sec-label">My entries</span>
        </div>
        <h2 className="sec-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Every client I responded to</span>
          <select 
            className="f slim" 
            style={{ width: "auto", fontWeight: "normal", fontSize: "1rem", margin: 0 }}
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">All time</option>
            {rowMonths.map(m => (
              <option key={m} value={m}>{formatMonthOption(m)}</option>
            ))}
          </select>
        </h2>
        <div className="legend">
          <span className="lg">
            <span className="sw fresh"></span>Added this week
          </span>
          <span className="lg">
            <span className="dotc won"></span>Converted
          </span>
          <span className="lg">
            <span className="dotc open"></span>Open
          </span>
          <span className="lg">
            <span className="dotc lost"></span>Hired elsewhere
          </span>
          <span className="lg">
            <span className="dotc dead"></span>Post deleted or ended
          </span>
        </div>
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <input
              type="text"
              className="f"
              placeholder="Search client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: "300px" }}
            />
            {!isAdding && (
              <button className="btn mini add-row" onClick={addRow} style={{ marginTop: 0 }}>
                + Add a client
              </button>
            )}
          </div>
        <div className="wrapscroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: "10%" }}>Date</th>
                <th style={{ width: "14%" }}>Client</th>
                <th style={{ width: "16%" }}>Remarks</th>
                <th className="c" style={{ width: "10%" }}>
                  Type
                </th>
                <th className="r" style={{ width: "6%" }}>
                  Hrs
                </th>
                <th className="r" style={{ width: "6%" }}>
                  Amt/Hr
                </th>
                <th className="r" style={{ width: "7%" }}>
                  Budget
                </th>
                <th className="r" style={{ width: "7%" }}>
                  Quoted
                </th>
                <th className="c" style={{ width: "5%" }}>
                  Int.
                </th>
                <th className="c" style={{ width: "11%" }}>
                  Status
                </th>
                <th style={{ width: "5%" }}>TL note</th>
                <th className="c" style={{ width: "3%" }}>
                  Edit
                </th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                <tr className="draft-row fresh">
                  <td>
                    <input
                      type="date"
                      className="f"
                      value={draftRow.createdAt}
                      onChange={(e) =>
                        setDraftRow({ ...draftRow, createdAt: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="f"
                      placeholder="Client name *"
                      list="client-suggestions"
                      value={draftRow.client}
                      onChange={(e) =>
                        setDraftRow({ ...draftRow, client: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="f"
                      placeholder="Remarks"
                      value={draftRow.remarks}
                      onChange={(e) =>
                        setDraftRow({ ...draftRow, remarks: e.target.value })
                      }
                    />
                  </td>
                  <td className="c">
                    <select
                      className="f slim"
                      value={draftRow.type}
                      onChange={(e) =>
                        setDraftRow({ ...draftRow, type: e.target.value })
                      }
                    >
                      <option>Fixed</option>
                      <option>Hourly</option>
                      <option>Hourly bid, fixed quote</option>
                    </select>
                  </td>
                  <td className="r">
                    {draftRow.type === "Fixed" ? (
                      <span className="muted-inline">-</span>
                    ) : (
                      <input
                        className="f num"
                        inputMode="decimal"
                        placeholder="Hrs"
                        value={draftRow.workedHours}
                        onChange={(e) =>
                          setDraftRow({
                            ...draftRow,
                            workedHours: decimalOnly(e.target.value),
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="r">
                    {draftRow.type === "Fixed" ? (
                      <span className="muted-inline">-</span>
                    ) : (
                      <input
                        className="f num"
                        inputMode="decimal"
                        placeholder="$/Hr"
                        value={draftRow.amtPerHour}
                        onChange={(e) =>
                          setDraftRow({
                            ...draftRow,
                            amtPerHour: decimalOnly(e.target.value),
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="r">
                    <input
                      className="f num"
                      inputMode="decimal"
                      placeholder="Budget"
                      value={draftRow.budget}
                      onChange={(e) =>
                        setDraftRow({
                          ...draftRow,
                          budget: decimalOnly(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="r">
                    {draftRow.type === "Fixed" ? (
                      <input
                        className="f num"
                        inputMode="decimal"
                        placeholder="Quoted"
                        value={draftRow.quoted}
                        onChange={(e) =>
                          setDraftRow({
                            ...draftRow,
                            quoted: decimalOnly(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <span className="muted-inline">-</span>
                    )}
                  </td>
                  <td className="c">
                    <input
                      className="f cen"
                      inputMode="numeric"
                      placeholder="Int."
                      value={draftRow.interviews}
                      onChange={(e) =>
                        setDraftRow({
                          ...draftRow,
                          interviews: integerOnly(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="c statcell">
                    <select
                      className={`f st-${statusClass(draftRow.status)}`}
                      value={draftRow.status}
                      onChange={(e) =>
                        setDraftRow({ ...draftRow, status: e.target.value })
                      }
                    >
                      <option>Open</option>
                      <option>Converted</option>
                      <option>Hired elsewhere</option>
                      <option>Job post deleted</option>
                      <option>Client ended conversation</option>
                    </select>
                  </td>
                  <td className="readonly muted-inline">-</td>
                  <td className="c row-actions">
                    <div className="action-pair">
                      <button
                        className="icon-btn save"
                        type="button"
                        title="Save client"
                        aria-label="Save client"
                        onClick={saveRow}
                        disabled={!draftRow.client.trim()}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12.5l4 4L19 6.5" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn cancel"
                        type="button"
                        title="Cancel add"
                        aria-label="Cancel add"
                        onClick={() => setIsAdding(false)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredRows.map((r) => {
                const isEditing = editingRowId === r.id;
                const row = isEditing ? editDraft : r;

                return (
                  <tr
                    key={r.id}
                    className={r.wk >= data.state.weekNo ? "fresh" : "carried"}
                  >
                    <td>
                      {isEditing ? (
                        <input
                          type="date"
                          className="f"
                          value={row.createdAt ? rowDateKey(row.createdAt) : ""}
                          onChange={(e) =>
                            changeEditDraft("createdAt", e.target.value)
                          }
                        />
                      ) : (
                        formatInsertedDate(r.createdAt)
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="f"
                          list="client-suggestions"
                          value={row.client || ""}
                          onChange={(e) =>
                            changeEditDraft("client", e.target.value)
                          }
                        />
                      ) : (
                        renderText(r.client)
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="f"
                          value={row.remarks || ""}
                          onChange={(e) =>
                            changeEditDraft("remarks", e.target.value)
                          }
                        />
                      ) : (
                        renderText(r.remarks)
                      )}
                    </td>
                    <td className="c">
                      {isEditing ? (
                        <select
                          className="f slim"
                          value={row.type || "Fixed"}
                          onChange={(e) =>
                            changeEditDraft("type", e.target.value)
                          }
                        >
                          <option>Fixed</option>
                          <option>Hourly</option>
                          <option>Hourly bid, fixed quote</option>
                        </select>
                      ) : (
                        renderText(r.type)
                      )}
                    </td>
                    <td className="r">
                      {isEditing ? (
                        row.type === "Fixed" ? (
                          <span className="muted-inline">-</span>
                        ) : (
                          <input
                            className="f num"
                            inputMode="decimal"
                            value={row.workedHours || ""}
                            onChange={(e) =>
                              changeEditDraft("workedHours", decimalOnly(e.target.value))
                            }
                          />
                        )
                      ) : (
                        r.type === "Fixed" ? <span className="muted-inline">-</span> : renderText(r.workedHours)
                      )}
                    </td>
                    <td className="r">
                      {isEditing ? (
                        row.type === "Fixed" ? (
                          <span className="muted-inline">-</span>
                        ) : (
                          <input
                            className="f num"
                            inputMode="decimal"
                            value={row.amtPerHour || ""}
                            onChange={(e) =>
                              changeEditDraft("amtPerHour", decimalOnly(e.target.value))
                            }
                          />
                        )
                      ) : (
                        r.type === "Fixed" ? <span className="muted-inline">-</span> : renderText(r.amtPerHour)
                      )}
                    </td>
                    <td className="r">
                      {isEditing ? (
                        <input
                          className="f num"
                          inputMode="decimal"
                          value={row.budget || ""}
                          onChange={(e) =>
                            changeEditDraft("budget", decimalOnly(e.target.value))
                          }
                        />
                      ) : (
                        renderText(r.budget)
                      )}
                    </td>
                    <td className="r">
                      {isEditing ? (
                        row.type === "Fixed" ? (
                          <input
                            className="f num"
                            inputMode="decimal"
                            value={row.quoted || ""}
                            onChange={(e) =>
                              changeEditDraft("quoted", decimalOnly(e.target.value))
                            }
                          />
                        ) : (
                          <span className="muted-inline">{row.quoted || "-"}</span>
                        )
                      ) : (
                        renderText(r.quoted)
                      )}
                    </td>
                    <td className="c">
                      {isEditing ? (
                        <input
                          className="f cen"
                          inputMode="numeric"
                          value={row.interviews || ""}
                          onChange={(e) =>
                            changeEditDraft("interviews", integerOnly(e.target.value))
                          }
                        />
                      ) : (
                        renderText(r.interviews)
                      )}
                    </td>
                    <td className="c statcell">
                      {isEditing ? (
                        <select
                          className={`f st-${statusClass(row.status)}`}
                          value={row.status || "Open"}
                          onChange={(e) =>
                            changeEditDraft("status", e.target.value)
                          }
                        >
                          <option>Open</option>
                          <option>Converted</option>
                          <option>Hired elsewhere</option>
                          <option>Job post deleted</option>
                          <option>Client ended conversation</option>
                        </select>
                      ) : (
                        <span
                          className={`status-text st-${statusClass(r.status)}`}
                        >
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="readonly">{r.note}</td>
                    <td className="c row-actions">
                      {isEditing ? (
                        <div className="action-pair">
                          <button
                            className="icon-btn save"
                            type="button"
                            title="Save row"
                            aria-label="Save row"
                            onClick={() => saveEditedRow(r.id)}
                            disabled={
                              savingRowId === r.id || !editDraft?.client?.trim()
                            }
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M5 12.5l4 4L19 6.5" />
                            </svg>
                          </button>
                          <button
                            className="icon-btn cancel"
                            type="button"
                            title="Cancel edit"
                            aria-label="Cancel edit"
                            onClick={cancelEditRow}
                            disabled={savingRowId === r.id}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          className="icon-btn"
                          type="button"
                          title="Edit row"
                          aria-label="Edit row"
                          onClick={() => startEditRow(r)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 8.5l2 2" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
            </tbody>
          </table>
        </div>
        {!isAdding && (
          <button className="btn mini add-row" onClick={addRow}>
            + Add a client
          </button>
        )}
      </section>
    </div>
  );
}

export default BidderDashboard;
