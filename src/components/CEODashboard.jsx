import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const todayDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const firstDayOfCurrentMonthKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

function CEODashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Date range filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/data/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        return;
      }
      if (res.ok) {
        setData(json);
        setStartDate(current => current || firstDayOfCurrentMonthKey());
        setEndDate(current => current || todayDateKey());
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const amount = (value) => {
    const parsed = parseFloat(String(value || '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const rowWorth = (row) => amount(row.quoted) || amount(row.budget);
  const rowRevenue = (row) => row.status === 'Converted' ? amount(row.won) || amount(row.quoted) || amount(row.budget) : 0;
  const rowDateKey = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const isRowInDateRange = (row) => {
    const key = rowDateKey(row.createdAt);
    if (!key) return false;
    if (startDate && key < startDate) return false;
    if (endDate && key > endDate) return false;
    return true;
  };
  const summarizeRows = (rows, bids = 0) => {
    const validRows = rows.filter(row => row.client?.trim());
    const openRows = validRows.filter(row => row.status === 'Open');
    const converted = validRows.filter(row => row.status === 'Converted').length;

    return {
      clients: validRows.length,
      fresh: validRows.filter(row => row.wk >= data.state.weekNo).length,
      hourly: openRows.filter(row => row.type === 'Hourly').length,
      pipeline: openRows.reduce((sum, row) => sum + rowWorth(row), 0),
      big: openRows.filter(row => rowWorth(row) >= data.state.thresh && rowWorth(row) > 0).length,
      Converted: converted,
      revenue: validRows.reduce((sum, row) => sum + rowRevenue(row), 0),
      conv: validRows.length ? converted / validRows.length : 0,
      bids,
    };
  };
  const teams = data.teams.map(team => {
    const bidders = team.bidders.map(bidder => {
      const rows = bidder.rows.filter(isRowInDateRange);
      const bids = (bidder.dailyBidCounts || []).filter(r => {
        const key = rowDateKey(r.date);
        if (!key) return false;
        if (startDate && key < startDate) return false;
        if (endDate && key > endDate) return false;
        return true;
      }).reduce((sum, r) => sum + Number(r.totalBids || 0), 0);
      return { ...bidder, rows, stats: summarizeRows(rows, bids) };
    });

    const teamBids = bidders.reduce((sum, b) => sum + b.stats.bids, 0);

    return {
      ...team,
      bidders,
      stats: summarizeRows(bidders.flatMap(bidder => bidder.rows), teamBids),
    };
  });
  const allRows = teams.flatMap(t => t.bidders.flatMap(b => b.rows));
  const totalBids = teams.reduce((sum, t) => sum + t.stats.bids, 0);
  const stats = summarizeRows(allRows, totalBids);
  const followUps = allRows.filter(r =>
    r.status !== 'Converted' && rowWorth(r) >= data.state.thresh
  ).sort((a, b) => rowWorth(b) - rowWorth(a));
  const formatInsertedDate = (value) => {
    if (!value) return <span className="muted-inline">-</span>;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return <span className="muted-inline">-</span>;

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="sheet">
      <div className="toolbar">
        <img className="toolbar-brand" src="/10turtle-wordmark.svg" alt="10turtle" />
        <button className="btn ghost" onClick={onLogout}>Logout</button>
      </div>

      <header className="masthead">
        <h1 className="report-title">All Teams</h1>
        <div className="accent-rule"></div>
        <div className="date-filter">
          <div className="date-filter-field">
            <span className="f-lab">From</span>
            <input className="dt" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="date-filter-field">
            <span className="f-lab">To</span>
            <input className="dt" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button
            className="btn mini ghost"
            type="button"
            onClick={() => {
              const today = todayDateKey();
              setStartDate(firstDayOfCurrentMonthKey());
              setEndDate(today);
            }}
          >
            Reset week
          </button>
        </div>
      </header>

      <section>
        <div className="sec-head"><span className="sec-num">01</span><span className="sec-label">Global snapshot</span></div>
        <h2 className="sec-title">All teams, Worldwide</h2>
        <div className="stats grid-4">
          <div className="stat">
            <div className="s-lab">Bids</div>
            <div className="s-row"><div className="big">{stats.bids}</div></div>
            <div className="s-sub"></div>
          </div>
          <div className="stat">
            <div className="s-lab">Response</div>
            <div className="s-row"><div className="big">{stats.clients}</div></div>
            <div className="s-sub">{stats.fresh} fresh · {stats.hourly} hourly</div>
          </div>
          <div className="stat">
            <div className="s-lab">Open Pipeline</div>
            <div className="s-row"><span className="cur">$</span><div className="big">{stats.pipeline.toLocaleString()}</div></div>
            <div className="s-sub">{stats.big} big tickets over ${data.state.thresh}</div>
          </div>
          <div className="stat accent">
            <div className="s-lab">Revenue Won</div>
            <div className="s-row"><span className="cur">$</span><div className="big">{stats.revenue.toLocaleString()}</div></div>
            <div className="s-sub">{stats.Converted} converted ({(stats.conv * 100).toFixed(0)}%)</div>
          </div>
        </div>
      </section>

      {followUps.length > 0 && (
        <section>
          <div className="sec-head"><span className="sec-num">02</span><span className="sec-label">Follow up</span></div>
          <h2 className="sec-title">Global big tickets to chase</h2>
          <p className="sec-note">Every active row worldwide worth over ${data.state.thresh}. <b>Read only.</b></p>
          <div className="wrapscroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '11%' }}>Date</th>
                  <th style={{ width: '14%' }}>Client</th>
                  <th style={{ width: '10%' }}>Team</th>
                  <th style={{ width: '10%' }}>Bidder</th>
                  <th className="r" style={{ width: '9%' }}>Worth</th>
                  <th className="c" style={{ width: '8%' }}>Int.</th>
                  <th className="c" style={{ width: '11%' }}>Status</th>
                  <th style={{ width: '27%' }}>TL instruction to bidder</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map(r => {
                  let bidderInfo = null;
                  let teamInfo = null;
                  teams.forEach(t => {
                    t.bidders.forEach(b => {
                      if (b.id === r.bidderId) {
                        bidderInfo = b;
                        teamInfo = t;
                      }
                    });
                  });
                  return (
                    <tr key={`fu-${r.id}`} className={r.status === 'Open' ? 'fish' : ''}>
                      <td>{formatInsertedDate(r.createdAt)}</td>
                      <td>{r.client}</td>
                      <td>{teamInfo?.name}</td>
                      <td>{bidderInfo?.name}</td>
                      <td className="r">${rowWorth(r).toLocaleString()}</td>
                      <td className="c">{r.interviews}</td>
                      <td className="c"><span className={`tag auto`}>{r.status}</span></td>
                      <td>{r.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div className="sec-head"><span className="sec-num">03</span><span className="sec-label">Teams</span></div>
        <h2 className="sec-title">Performance by team</h2>
        
        {teams.map(team => (
          <div className="bidder" key={team.id}>
            <div className="b-head">
              <div className="b-id">
                <div className="b-name">{team.name}</div>
              </div>
              <div className="b-figs">
                <div className="b-fig"><div className="bf-lab">Bids</div><div className="bf-val">{team.stats.bids}</div></div>
                <div className="b-fig"><div className="bf-lab">Response</div><div className="bf-val">{team.stats.clients}</div></div>
                <div className="b-fig"><div className="bf-lab">Pipeline</div><div className="bf-val"><span className="cur">$</span>{team.stats.pipeline.toLocaleString()}</div></div>
                <div className="b-fig"><div className="bf-lab">Won</div><div className="bf-val" style={{ color: 'var(--s-won-d)' }}><span className="cur">$</span>{team.stats.revenue.toLocaleString()}</div></div>
              </div>
            </div>
            <div className="wrapscroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Bidder</th>
                    <th className="c" style={{ width: '10%' }}>Bids</th>
                    <th className="c" style={{ width: '12%' }}>Response</th>
                    <th className="r" style={{ width: '8%' }}>Pipeline</th>
                    <th className="r" style={{ width: '8%' }}>Won</th>
                  </tr>
                </thead>
                <tbody>
                  {team.bidders.map(b => (
                    <tr key={b.id}>
                      <td>{b.name} {b.direct === 1 ? '(Direct)' : ''}</td>
                      <td className="c">{b.stats.bids}</td>
                      <td className="c">{b.stats.clients}</td>
                      <td className="r">${b.stats.pipeline.toLocaleString()}</td>
                      <td className="r">${b.stats.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default CEODashboard;
