import React, { useState, useEffect } from 'react'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'

const API = 'http://localhost:8000'

const STATE_NAMES = {
    PB: 'Punjab', MH: 'Maharashtra', TN: 'Tamil Nadu', KA: 'Karnataka', GJ: 'Gujarat',
    UP: 'Uttar Pradesh', BR: 'Bihar', WB: 'West Bengal', RJ: 'Rajasthan', MP: 'Madhya Pradesh',
}

const STATE_COLORS = {
    PB: '#22c55e', MH: '#3b82f6', TN: '#f97316', KA: '#a855f7',
    GJ: '#eab308', UP: '#ef4444', BR: '#ec4899', WB: '#14b8a6',
    RJ: '#f59e0b', MP: '#6366f1',
}

const fmt = (n) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return typeof n === 'number' ? n.toFixed(1) : n
}

/* ── Stat Card ────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color = '#3b82f6' }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
            borderRadius: 14, padding: '14px 18px', flex: '1 1 150px', minWidth: 150,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: `${color}18`, color, flexShrink: 0,
            }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{value}</div>
                {sub && <div style={{ fontSize: 10, color: '#64748b' }}>{sub}</div>}
            </div>
        </div>
    )
}

/* ── Chart Container ──────────────────────────────────────── */
function ChartBox({ title, icon, children, style = {} }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
            borderRadius: 16, padding: '16px 18px', boxShadow: '0 3px 16px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.05)', ...style,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3b82f6' }}>{icon}</span>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{title}</h3>
            </div>
            {children}
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════
   GDP RANKING PANEL — Highest & Lowest
   ══════════════════════════════════════════════════════════════ */
function GDPRankingPanel({ stats, regions }) {
    const ranking = stats?.gdp_ranking || []
    const highest = stats?.highest_gdp || {}
    const lowest = stats?.lowest_gdp || {}

    // If no live ranking, build from regions
    const displayRanking = ranking.length > 0 ? ranking :
        Object.entries(regions || {}).map(([c, d]) => ({
            code: c, name: d.name || STATE_NAMES[c], gdp: d.gdp || 0, welfare: d.welfare || 0
        })).sort((a, b) => b.gdp - a.gdp)

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* Highest GDP */}
            <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: 16, padding: 20, color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 80, opacity: 0.15 }}>🏆</div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Highest GDP</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{displayRanking[0]?.name || '—'}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>₹{(displayRanking[0]?.gdp || 0).toFixed(1)}B</div>
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
                    Welfare: {(displayRanking[0]?.welfare || 0).toFixed(0)}%
                </div>
            </div>

            {/* Lowest GDP */}
            <div style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: 16, padding: 20, color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 80, opacity: 0.15 }}>⚠️</div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Lowest GDP</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{displayRanking[displayRanking.length - 1]?.name || '—'}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>₹{(displayRanking[displayRanking.length - 1]?.gdp || 0).toFixed(1)}B</div>
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
                    Welfare: {(displayRanking[displayRanking.length - 1]?.welfare || 0).toFixed(0)}%
                </div>
            </div>

            {/* Full Ranking */}
            <ChartBox title="GDP Leaderboard" icon="leaderboard">
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {displayRanking.map((r, i) => (
                        <div key={r.code} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 8px', borderRadius: 8, marginBottom: 3,
                            background: i === 0 ? '#f0fdf4' : i === displayRanking.length - 1 ? '#fef2f2' : '#f8fafc',
                        }}>
                            <span style={{
                                width: 22, height: 22, borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
                                background: i < 3 ? '#3b82f6' : '#94a3b8', color: '#fff',
                            }}>{i + 1}</span>
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: STATE_COLORS[r.code] || '#999', flexShrink: 0,
                            }} />
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#334155' }}>{r.name}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>₹{r.gdp.toFixed(1)}</span>
                        </div>
                    ))}
                </div>
            </ChartBox>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════
   LIVE TRADES & AI NEGOTIATIONS PANEL
   ══════════════════════════════════════════════════════════════ */
function LiveFeed({ trades, governorMessages, climateEvents, tick }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* Live Trades */}
            <ChartBox title={`🔄 Live Trades (Tick ${tick})`} icon="swap_horiz">
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                    {(!trades || trades.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>⏳ Waiting for LLM trades...</div>
                    ) : trades.slice(-12).reverse().map((t, i) => (
                        <div key={i} style={{
                            padding: '8px 10px', marginBottom: 5, borderRadius: 10,
                            background: i === 0 ? '#eff6ff' : '#f8fafc',
                            borderLeft: `3px solid ${i === 0 ? '#3b82f6' : '#e2e8f0'}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: 700 }}>
                                    <span style={{ color: STATE_COLORS[t.from] || '#333' }}>{STATE_NAMES[t.from] || t.from}</span>
                                    <span style={{ color: '#94a3b8', margin: '0 5px' }}>→</span>
                                    <span style={{ color: STATE_COLORS[t.to] || '#333' }}>{STATE_NAMES[t.to] || t.to}</span>
                                </span>
                                <span style={{ fontSize: 9, color: '#94a3b8' }}>Tick {t.tick}</span>
                            </div>
                            {t.offering && typeof t.offering === 'object' && (
                                <div style={{ fontSize: 11, color: '#16a34a' }}>📦 {Object.entries(t.offering).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')}</div>
                            )}
                            {t.requesting && typeof t.requesting === 'object' && (
                                <div style={{ fontSize: 11, color: '#2563eb' }}>🎯 {Object.entries(t.requesting).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')}</div>
                            )}
                        </div>
                    ))}
                </div>
            </ChartBox>

            {/* Governor AI Negotiations */}
            <ChartBox title="🤖 Governor AI Negotiations" icon="smart_toy">
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                    {(!governorMessages || governorMessages.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>🧠 AI thinking...</div>
                    ) : governorMessages.slice(-10).reverse().map((msg, i) => (
                        <div key={i} style={{
                            padding: '8px 10px', marginBottom: 5, borderRadius: 10,
                            background: msg.type === 'recovery' ? '#fef2f2' : i === 0 ? '#f0fdf4' : '#f8fafc',
                            borderLeft: `3px solid ${msg.type === 'recovery' ? '#ef4444' : STATE_COLORS[msg.state] || '#10b981'}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: STATE_COLORS[msg.state] || '#333' }}>
                                    {STATE_NAMES[msg.state] || msg.state}
                                </span>
                                <span style={{ fontSize: 9, color: '#94a3b8' }}>Tick {msg.tick}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.3 }}>{msg.text}</div>
                        </div>
                    ))}
                </div>
            </ChartBox>

            {/* Climate & Intervention Events */}
            <ChartBox title="🌍 Events & Interventions" icon="thunderstorm">
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                    {(!climateEvents || climateEvents.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>🌤️ No events yet</div>
                    ) : climateEvents.slice(-10).reverse().map((evt, i) => (
                        <div key={i} style={{
                            padding: '8px 10px', marginBottom: 5, borderRadius: 10,
                            background: evt.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            borderLeft: `3px solid ${evt.type === 'success' ? '#10b981' : '#ef4444'}`,
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{evt.text}</div>
                            {evt.gdp_impact && Object.keys(evt.gdp_impact).length > 0 && (
                                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
                                    💰 GDP Impact: {Object.entries(evt.gdp_impact).map(([c, d]) =>
                                        `${STATE_NAMES[c] || c}: ${d.change > 0 ? '+' : ''}${d.change.toFixed(1)}`
                                    ).join(', ')}
                                </div>
                            )}
                            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Tick {evt.tick}</div>
                        </div>
                    ))}
                </div>
            </ChartBox>
        </div>
    )
}


/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD TAB
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardTab({ tick, regions, trades, governorMessages, climateEvents, stats, connected, tickSummary }) {

    const [gdpHistory, setGdpHistory] = useState([])
    const [welfareHistory, setWelfareHistory] = useState([])
    const [resourceOverview, setResourceOverview] = useState([])
    const [tradeActivity, setTradeActivity] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const [gdp, welfare, overview, activity] = await Promise.all([
                    fetch(`${API}/api/csv/gdp-history`).then(r => r.json()),
                    fetch(`${API}/api/csv/welfare-history`).then(r => r.json()),
                    fetch(`${API}/api/csv/overview`).then(r => r.json()),
                    fetch(`${API}/api/csv/trade-activity`).then(r => r.json()),
                ])
                setGdpHistory(gdp); setWelfareHistory(welfare)
                setResourceOverview(overview); setTradeActivity(activity)
            } catch (e) { console.error('CSV load error:', e) }
            setLoading(false)
        }
        load()
    }, [])

    const totalGDP = stats?.total_gdp || Object.values(regions || {}).reduce((s, r) => s + (r.gdp || 0), 0)
    const avgWelfare = stats?.avg_welfare || 0
    const gini = stats?.gini || 0
    const highest = stats?.highest_gdp || {}
    const lowest = stats?.lowest_gdp || {}

    return (
        <div style={{ padding: 20, paddingBottom: 60 }}>

            {/* ── Stats Row ───────────────────────────────── */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <StatCard icon="monitoring" label="Live Tick" value={tick || 0} sub={connected ? '🟢 Live' : '🔴 Offline'} color="#3b82f6" />
                <StatCard icon="payments" label="Total GDP" value={`₹${totalGDP.toFixed(1)}B`} color="#10b981" />
                <StatCard icon="trending_up" label="Highest GDP" value={highest.name || '—'} sub={`₹${(highest.gdp || 0).toFixed(1)}B`} color="#059669" />
                <StatCard icon="trending_down" label="Lowest GDP" value={lowest.name || '—'} sub={`₹${(lowest.gdp || 0).toFixed(1)}B`} color="#ef4444" />
                <StatCard icon="favorite" label="Avg Welfare" value={`${avgWelfare.toFixed(1)}%`} color="#f59e0b" />
                <StatCard icon="equalizer" label="Gini Index" value={gini.toFixed(3)} sub={gini > 0.5 ? '⚠️ High inequality' : '✅ Balanced'} color={gini > 0.5 ? '#ef4444' : '#10b981'} />
            </div>

            {/* ── GDP RANKINGS — Highest & Lowest ─────────── */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#3b82f6' }}>leaderboard</span>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>GDP Rankings — Live</h2>
                </div>
                <GDPRankingPanel stats={stats} regions={regions} />
            </div>

            {/* ── LIVE FEED: Trades + Negotiations + Climate ─ */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#94a3b8', animation: connected ? 'pulse 2s infinite' : 'none' }} />
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Live Simulation Feed</h2>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>— Real-time from Ollama Qwen</span>
                </div>
                <LiveFeed trades={trades} governorMessages={governorMessages} climateEvents={climateEvents} tick={tick} />
            </div>

            {/* ── Charts (from CSV dataset) ────────────────── */}
            {!loading && (
                <>
                    <ChartBox title="GDP Trends (Historical — 120 Ticks)" icon="trending_up" style={{ marginBottom: 20 }}>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={gdpHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="tick" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                                    formatter={(v, name) => [`₹${v.toFixed(1)}B`, STATE_NAMES[name] || name]} />
                                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => STATE_NAMES[v] || v} />
                                {Object.keys(STATE_COLORS).map(s => (
                                    <Line key={s} type="monotone" dataKey={s} stroke={STATE_COLORS[s]} strokeWidth={1.5} dot={false} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartBox>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <ChartBox title="Resource Supply by State" icon="inventory_2">
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={resourceOverview}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="state" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none' }} formatter={(v) => fmt(v)} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Bar dataKey="water" name="💧 Water" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="food" name="🌾 Food" fill="#10b981" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="energy" name="⚡ Energy" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartBox>

                        <ChartBox title="Trade Activity (BID vs ASK)" icon="candlestick_chart">
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={tradeActivity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="state" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none' }} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Bar dataKey="bids" name="📥 BID" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="asks" name="📤 ASK" fill="#f97316" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartBox>
                    </div>

                    <ChartBox title="Welfare Index Trends (Historical)" icon="health_and_safety">
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={welfareHistory}>
                                <defs>
                                    {Object.entries(STATE_COLORS).map(([s, c]) => (
                                        <linearGradient key={s} id={`wg_${s}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={c} stopOpacity={0.12} />
                                            <stop offset="95%" stopColor={c} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="tick" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[0, 100]} />
                                <Tooltip contentStyle={{ borderRadius: 10, border: 'none' }}
                                    formatter={(v, name) => [`${v}%`, STATE_NAMES[name] || name]} />
                                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => STATE_NAMES[v] || v} />
                                {Object.entries(STATE_COLORS).map(([s, c]) => (
                                    <Area key={s} type="monotone" dataKey={s} stroke={c} strokeWidth={1.5}
                                        fillOpacity={1} fill={`url(#wg_${s})`} dot={false} />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartBox>
                </>
            )}
        </div>
    )
}
