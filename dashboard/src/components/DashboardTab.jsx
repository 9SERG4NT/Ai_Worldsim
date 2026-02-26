import React, { useState, useEffect } from 'react'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
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

const PIE_COLORS = ['#06b6d4', '#f59e0b', '#10b981', '#a855f7']

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
   LIVE TRADES & NEGOTIATIONS PANEL
   — Shows real-time trades and governor AI messages from WebSocket
   ══════════════════════════════════════════════════════════════ */
function LiveFeed({ trades, governorMessages, climateEvents, tick }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* Live Trades */}
            <ChartBox title={`🔄 Live Trades (Tick ${tick})`} icon="swap_horiz">
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {(!trades || trades.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>
                            ⏳ Waiting for trades from LLM agents...
                        </div>
                    ) : (
                        trades.slice(-15).reverse().map((t, i) => (
                            <div key={i} style={{
                                padding: '10px 12px', marginBottom: 6, borderRadius: 10,
                                background: i === 0 ? '#eff6ff' : '#f8fafc',
                                borderLeft: `3px solid ${i === 0 ? '#3b82f6' : '#e2e8f0'}`,
                                animation: i === 0 ? 'fadeIn 0.5s' : 'none',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                                        <span style={{ color: STATE_COLORS[t.from] || '#333' }}>{STATE_NAMES[t.from] || t.from}</span>
                                        <span style={{ color: '#94a3b8', margin: '0 6px' }}>→</span>
                                        <span style={{ color: STATE_COLORS[t.to] || '#333' }}>{STATE_NAMES[t.to] || t.to}</span>
                                    </span>
                                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Tick {t.tick}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#475569' }}>
                                    {t.offering && typeof t.offering === 'object'
                                        ? <>📦 <b>Offering:</b> {Object.entries(t.offering).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')}</>
                                        : `📦 Trade executed`
                                    }
                                </div>
                                {t.requesting && typeof t.requesting === 'object' && (
                                    <div style={{ fontSize: 11, color: '#475569' }}>
                                        🎯 <b>Requesting:</b> {Object.entries(t.requesting).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </ChartBox>

            {/* Governor AI Negotiations */}
            <ChartBox title="🤖 Governor AI Negotiations" icon="smart_toy">
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {(!governorMessages || governorMessages.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>
                            🧠 AI Governor thinking...
                        </div>
                    ) : (
                        governorMessages.slice(-12).reverse().map((msg, i) => (
                            <div key={i} style={{
                                padding: '10px 12px', marginBottom: 6, borderRadius: 10,
                                background: i === 0 ? '#f0fdf4' : '#f8fafc',
                                borderLeft: `3px solid ${STATE_COLORS[msg.state] || '#10b981'}`,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: STATE_COLORS[msg.state] || '#333' }}>
                                        {STATE_NAMES[msg.state] || msg.state}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Tick {msg.tick}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{msg.text}</div>
                            </div>
                        ))
                    )}
                </div>
            </ChartBox>

            {/* Climate Events */}
            <ChartBox title="🌍 Climate & Events" icon="thunderstorm">
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {(!climateEvents || climateEvents.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>
                            🌤️ No climate events yet
                        </div>
                    ) : (
                        climateEvents.slice(-12).reverse().map((evt, i) => (
                            <div key={i} style={{
                                padding: '10px 12px', marginBottom: 6, borderRadius: 10,
                                background: evt.type === 'danger' ? '#fef2f2' : '#fffbeb',
                                borderLeft: `3px solid ${evt.type === 'danger' ? '#ef4444' : '#f59e0b'}`,
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{evt.text}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Tick {evt.tick}</div>
                            </div>
                        ))
                    )}
                </div>
            </ChartBox>
        </div>
    )
}

/* ── CSV Trade Log ─────────────────────────────────────────── */
function CsvTradeLog({ csvTrades }) {
    return (
        <div style={{ maxHeight: 320, overflowY: 'auto', fontSize: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                        {['Tick', 'State', 'Type', 'Resource', 'Quantity', 'Price', 'Status'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '8px 8px', color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {csvTrades.slice(-80).reverse().map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fafbfc' : '#fff' }}>
                            <td style={td}>{t.tick}</td>
                            <td style={td}><span style={{ fontWeight: 600, color: STATE_COLORS[t.state] || '#333' }}>{STATE_NAMES[t.state] || t.state}</span></td>
                            <td style={td}>
                                <span style={{
                                    padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                    background: t.order_type === 'BID' ? '#dbeafe' : '#fef3c7',
                                    color: t.order_type === 'BID' ? '#1d4ed8' : '#92400e',
                                }}>{t.order_type}</span>
                            </td>
                            <td style={td}>{t.resource}</td>
                            <td style={{ ...td, fontFamily: 'monospace' }}>{fmt(t.quantity)}</td>
                            <td style={{ ...td, fontFamily: 'monospace' }}>₹{t.price.toFixed(2)}</td>
                            <td style={td}>{t.executed ? <span style={{ color: '#16a34a' }}>✅</span> : <span style={{ color: '#dc2626' }}>❌</span>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const td = { padding: '6px 8px', color: '#334155', fontSize: 12 }


/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD TAB
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardTab({ tick, regions, trades, governorMessages, climateEvents, stats, connected, tickSummary }) {

    const [gdpHistory, setGdpHistory] = useState([])
    const [welfareHistory, setWelfareHistory] = useState([])
    const [resourceOverview, setResourceOverview] = useState([])
    const [tradeVolume, setTradeVolume] = useState([])
    const [csvTrades, setCsvTrades] = useState([])
    const [tradeActivity, setTradeActivity] = useState([])
    const [climateSummary, setClimateSummary] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const [gdp, welfare, overview, vol, tr, activity, climate] = await Promise.all([
                    fetch(`${API}/api/csv/gdp-history`).then(r => r.json()),
                    fetch(`${API}/api/csv/welfare-history`).then(r => r.json()),
                    fetch(`${API}/api/csv/overview`).then(r => r.json()),
                    fetch(`${API}/api/csv/trade-volume`).then(r => r.json()),
                    fetch(`${API}/api/csv/trades`).then(r => r.json()),
                    fetch(`${API}/api/csv/trade-activity`).then(r => r.json()),
                    fetch(`${API}/api/csv/climate-summary`).then(r => r.json()),
                ])
                setGdpHistory(gdp); setWelfareHistory(welfare); setResourceOverview(overview)
                setTradeVolume(vol); setCsvTrades(tr); setTradeActivity(activity); setClimateSummary(climate)
            } catch (e) { console.error('CSV load error:', e) }
            setLoading(false)
        }
        load()
    }, [])

    const totalGDP = stats?.total_gdp || Object.values(regions || {}).reduce((s, r) => s + (r.gdp || 0), 0)
    const avgWelfare = stats?.avg_welfare || (Object.values(regions || {}).reduce((s, r) => s + (r.welfare || 0), 0) / Math.max(Object.keys(regions || {}).length, 1))
    const gini = stats?.gini || 0

    return (
        <div style={{ padding: 20, paddingBottom: 60 }}>

            {/* ── Stats Row ───────────────────────────────── */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <StatCard icon="monitoring" label="Live Tick" value={tick || 0} sub={connected ? '🟢 Live' : '🔴 Offline'} color="#3b82f6" />
                <StatCard icon="payments" label="Total GDP" value={`₹${totalGDP.toFixed(1)}B`} color="#10b981" />
                <StatCard icon="favorite" label="Welfare" value={`${avgWelfare.toFixed(1)}%`} color="#f59e0b" />
                <StatCard icon="equalizer" label="Gini" value={gini.toFixed(3)} sub={gini > 0.5 ? '⚠️ High' : '✅ OK'} color={gini > 0.5 ? '#ef4444' : '#10b981'} />
                <StatCard icon="swap_horiz" label="Live Trades" value={trades?.length || 0} sub="from Ollama" color="#a855f7" />
                <StatCard icon="psychology" label="AI Messages" value={governorMessages?.length || 0} color="#ec4899" />
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

            {/* ── Charts Grid ─────────────────────────────── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading CSV dataset (10,000 rows)...</div>
            ) : (
                <>
                    {/* GDP Line Chart — full width */}
                    <ChartBox title="GDP Trends (120 Ticks from Dataset)" icon="trending_up" style={{ marginBottom: 20 }}>
                        <ResponsiveContainer width="100%" height={280}>
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

                    {/* 2-column charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <ChartBox title="Resource Supply by State" icon="inventory_2">
                            <ResponsiveContainer width="100%" height={250}>
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
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={tradeActivity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="state" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none' }} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Bar dataKey="bids" name="📥 BID (Buy)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="asks" name="📤 ASK (Sell)" fill="#f97316" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartBox>
                    </div>

                    {/* Welfare + Trade Volume + Climate */}
                    <ChartBox title="Welfare Index Trends" icon="health_and_safety" style={{ marginBottom: 20 }}>
                        <ResponsiveContainer width="100%" height={240}>
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

                    {/* Bottom: Pie + Climate + Trade Log */}
                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <ChartBox title="Trade Volume by Resource" icon="donut_large">
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={tradeVolume} dataKey="volume" nameKey="resource" cx="50%" cy="50%"
                                            outerRadius={65} innerRadius={35} paddingAngle={4}
                                            label={({ resource, percent }) => `${resource} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                            {tradeVolume.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(v) => fmt(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartBox>
                            <ChartBox title="Climate Events Summary" icon="thunderstorm">
                                {climateSummary.map(c => (
                                    <div key={c.event} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 12 }}>
                                            {c.event === 'Drought' ? '🏜️' : c.event === 'Flood' ? '🌊' : c.event === 'Cyclone' ? '🌪️' : c.event === 'Heatwave' ? '🔥' : '⚡'} {c.event}
                                        </span>
                                        <span style={{ background: '#3b82f6', color: '#fff', padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.count}</span>
                                    </div>
                                ))}
                            </ChartBox>
                        </div>
                        <ChartBox title="📊 CSV Trade Log (10,000 Rows Dataset)" icon="receipt_long">
                            <CsvTradeLog csvTrades={csvTrades} />
                        </ChartBox>
                    </div>
                </>
            )}
        </div>
    )
}
