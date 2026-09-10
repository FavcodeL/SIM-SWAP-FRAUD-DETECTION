import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import "./App.css";

const PAGE_SIZE = 15;
const PIE_COLORS = { Low: "#E2E4E8", Medium: "#F4B6C2", High: "#C81E3A" };

function App() {
  const [results, setResults] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:4000/api/results").then((res) => res.json()),
      fetch("http://localhost:4000/api/metrics").then((res) => res.json()),
    ]).then(([resultsData, metricsData]) => {
      setResults(resultsData);
      setMetrics(metricsData);
      setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>Loading results...</p>;

  const flagged = results
    .filter((r) => r.risk_level === "High" || r.risk_level === "Medium")
    .sort((a, b) => b.risk_score - a.risk_score);

  const totalPages = Math.ceil(flagged.length / PAGE_SIZE);
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageRows = flagged.slice(pageStart, pageStart + PAGE_SIZE);

  const levelCounts = {
    Low: results.filter((r) => r.risk_level === "Low").length,
    Medium: results.filter((r) => r.risk_level === "Medium").length,
    High: results.filter((r) => r.risk_level === "High").length,
  };

  const barData = [
    { level: "Low", count: levelCounts.Low },
    { level: "Medium", count: levelCounts.Medium },
    { level: "High", count: levelCounts.High },
  ];

  const pieData = barData.map((d) => ({ name: d.level, value: d.count }));

  const toggleExpand = (eventId) => {
    setExpandedId(expandedId === eventId ? null : eventId);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>SIM-Swap Fraud Detection</h1>
        <p>Investigator console — risk-scored SIM-swap events, ranked by severity</p>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">Total events</div>
          <div className="stat-value">{results.length.toLocaleString()}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Flagged</div>
          <div className="stat-value">{flagged.length.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Precision</div>
          <div className="stat-value">{(metrics.precision * 100).toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recall</div>
          <div className="stat-value">{(metrics.recall * 100).toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">F1 score</div>
          <div className="stat-value">{(metrics.f1 * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="chart-row">
        <div className="chart-card">
          <h2>Events by risk level</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" />
              <XAxis dataKey="level" tick={{ fontFamily: "IBM Plex Mono", fontSize: 12 }} />
              <YAxis tick={{ fontFamily: "IBM Plex Mono", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barData.map((d) => (
                  <Cell key={d.level} fill={PIE_COLORS[d.level]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Share of total</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {pieData.map((d) => (
                  <Cell key={d.name} fill={PIE_COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Download button */}
      <a href="http://localhost:4000/api/download-csv" className="download-btn">
        Download full results (CSV)
      </a>

      {/* Table */}
      <div className="table-card">
        <h2>Flagged events</h2>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Risk score</th>
              <th>Risk level</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <>
                <tr key={r.event_id} onClick={() => toggleExpand(r.event_id)}>
                  <td>{r.account_id}</td>
                  <td>
                    <div className="score-cell">
                      <span>{r.risk_score}</span>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${r.risk_score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`level-badge ${r.risk_level}`}>{r.risk_level}</span>
                  </td>
                </tr>
                {expandedId === r.event_id && (
                  <tr className="reasons-row" key={`${r.event_id}-detail`}>
                    <td colSpan={3}>
                      Why this was flagged:
                      <ul>
                        {r.reasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;