import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Polyline, Tooltip as MapTooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

/* ── State Coordinates ─────────────────────────────────────────── */
const STATE_COORDS = {
    PB: { lat: 31.1471, lng: 75.3412, color: '#22c55e' },
    MH: { lat: 19.7515, lng: 75.7139, color: '#3b82f6' },
    TN: { lat: 11.1271, lng: 78.6569, color: '#f97316' },
    KA: { lat: 15.3173, lng: 75.7139, color: '#10b981' },
    GJ: { lat: 22.2587, lng: 71.1924, color: '#a855f7' },
    UP: { lat: 26.8467, lng: 80.9462, color: '#ef4444' },
    BR: { lat: 25.0961, lng: 85.3131, color: '#ec4899' },
    WB: { lat: 22.9868, lng: 87.8550, color: '#14b8a6' },
    RJ: { lat: 27.0238, lng: 74.2179, color: '#f59e0b' },
    MP: { lat: 22.9734, lng: 78.6569, color: '#6366f1' },
}

const STATE_NAMES = {
    PB: 'Punjab', MH: 'Maharashtra', TN: 'Tamil Nadu', KA: 'Karnataka', GJ: 'Gujarat',
    UP: 'Uttar Pradesh', BR: 'Bihar', WB: 'West Bengal', RJ: 'Rajasthan', MP: 'Madhya Pradesh',
}

/* ── Intervention Definitions ──────────────────────────────────── */
const INTERVENTIONS = [
    { action: 'drought', target: 'RJ', label: '🏜️ Drought', desc: 'Rajasthan Water -70%', color: '#f59e0b', severity: 'danger' },
    { action: 'flood', target: 'BR', label: '🌊 Flood', desc: 'Bihar Food -80%', color: '#3b82f6', severity: 'danger' },
    { action: 'energy_crisis', target: 'MH', label: '⚡ Grid Collapse', desc: 'Maharashtra Energy -75%', color: '#ef4444', severity: 'danger' },
    { action: 'health_crisis', target: 'UP', label: '🦠 Health Crisis', desc: 'UP Welfare -30', color: '#ec4899', severity: 'danger' },
    { action: 'monsoon_failure', target: 'PB', label: '🌧️ Monsoon Fail', desc: 'Punjab Water/Food crash', color: '#6366f1', severity: 'danger' },
    { action: 'gdp_crash', target: '', label: '📉 GDP Crash', desc: 'All states GDP -30%', color: '#dc2626', severity: 'danger' },
    { action: 'tech_boom', target: 'KA', label: '💻 Tech Boom', desc: 'Karnataka Tech +150%', color: '#10b981', severity: 'success' },
    { action: 'stimulus', target: '', label: '📈 Stimulus', desc: 'All states GDP +15%', color: '#059669', severity: 'success' },
]

const fmt = (n) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return typeof n === 'number' ? n.toFixed(1) : n
}

/* ── Welfare helpers ───────────────────────────────────────────── */
function welfareColor(w) {
    if (w >= 50) return '#10b981'
    if (w >= 30) return '#f59e0b'
    return '#ef4444'
}

function welfareLabel(w) {
    if (w >= 50) return 'Healthy'
    if (w >= 30) return 'At Risk'
    return 'Critical'
}

/* ── Map fly-to helper ─────────────────────────────────────────── */
function FlyToState({ lat, lng }) {
    const map = useMap()
    useEffect(() => {
        if (lat && lng) map.flyTo([lat, lng], 7, { duration: 0.8 })
    }, [lat, lng, map])
    return null
}

/* ── Custom Popup ──────────────────────────────────────────────── */
function PopupContent({ code, data }) {
    const wColor = welfareColor(data.welfare || 0)
    const resources = data.resources || {}
    return (
        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '180px', padding: '4px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: STATE_COORDS[code]?.color || '#333', marginBottom: '8px' }}>
                {data.name || code}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>GDP</span>
                <span style={{ fontWeight: 600 }}>₹{(data.gdp || 0).toFixed(1)}B</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Welfare</span>
                <span style={{ fontWeight: 600, color: wColor }}>{(data.welfare || 0).toFixed(0)}%</span>
            </div>
            {Object.entries(resources).map(([r, v]) => (
                <div key={r} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 500 }}>{r}</span>
                    <span>{(v || 0).toLocaleString()}</span>
                </div>
            ))}
        </div>
    )
}

/* ── Intervention Panel ────────────────────────────────────────── */
function InterventionPanel({ sendIntervention, recentEvents }) {
    const [activeToast, setActiveToast] = useState(null)

    function handleClick(intervention) {
        sendIntervention({
            action: intervention.action,
            target: intervention.target,
            severity: intervention.severity,
            description: intervention.desc,
        })
        setActiveToast(intervention.desc)
        setTimeout(() => setActiveToast(null), 3000)
    }

    return (
        <aside className="absolute left-6 bottom-6 w-72 glass-panel rounded-2xl shadow-lg z-[1000]">
            <div className="p-4 border-b border-slate-200/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-red-500 text-[18px]">emergency</span>
                    Federal Interventions
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Trigger events to test RL recovery</p>
            </div>
            <div className="p-3 space-y-1.5 max-h-[280px] overflow-y-auto scroll-area">
                {INTERVENTIONS.map((iv) => (
                    <button
                        key={iv.action + iv.target}
                        onClick={() => handleClick(iv)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/80 transition-all text-left group border border-transparent hover:border-slate-200 hover:shadow-sm"
                    >
                        <span className="text-lg">{iv.label.split(' ')[0]}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{iv.label.split(' ').slice(1).join(' ')}</p>
                            <p className="text-[10px] text-slate-400">{iv.desc}</p>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-slate-300 group-hover:text-slate-500 transition-colors">
                            play_arrow
                        </span>
                    </button>
                ))}
            </div>

            {activeToast && (
                <div className="mx-3 mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600"
                    style={{ animation: 'slide-in 0.3s ease-out' }}>
                    ⚡ Intervention sent: {activeToast}
                </div>
            )}

            {recentEvents && recentEvents.length > 0 && (
                <div className="px-3 pb-3 space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase px-1">Recent Events</p>
                    {recentEvents.slice(-3).map((evt, i) => (
                        <div key={i} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium truncate ${evt.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                            {evt.text}
                        </div>
                    ))}
                </div>
            )}
        </aside>
    )
}

/* ── State Legend Panel ─────────────────────────────────────────── */
function LegendPanel({ regions, onSelectState, selectedState }) {
    return (
        <aside className="absolute left-6 top-6 w-64 glass-panel rounded-2xl shadow-lg z-[1000]">
            <div className="p-3 border-b border-slate-200/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-[#137fec] text-[18px]">pin_drop</span>
                    State Governors
                </h3>
            </div>
            <div className="p-2 space-y-0.5 max-h-[240px] overflow-y-auto scroll-area">
                {Object.entries(STATE_COORDS).map(([code, coords]) => {
                    const data = regions[code] || {}
                    const wColor = welfareColor(data.welfare || 50)
                    const isSelected = selectedState === code
                    return (
                        <button
                            key={code}
                            onClick={() => onSelectState(code)}
                            className={`w-full flex items-center gap-2 p-2 rounded-xl transition-all text-left group ${isSelected ? 'bg-white shadow-sm border border-slate-200' : 'hover:bg-white/80'}`}
                        >
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: coords.color }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{STATE_NAMES[code]}</p>
                                <p className="text-[10px] text-slate-400">GDP ₹{(data.gdp || 0).toFixed(1)}B</p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: wColor + '15', color: wColor }}>
                                {(data.welfare || 0).toFixed(0)}%
                            </span>
                        </button>
                    )
                })}
            </div>
        </aside>
    )
}

/* ── State Info Panel ──────────────────────────────────────────── */
function StateInfoPanel({ code, data, onClose }) {
    if (!code || !data) return null
    const wColor = welfareColor(data.welfare || 0)
    const resources = data.resources || {}

    return (
        <aside className="absolute right-6 top-6 bottom-6 w-72 glass-panel rounded-2xl shadow-lg flex flex-col z-[1000]">
            <div className="p-4 border-b border-slate-200/50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATE_COORDS[code]?.color || '#666' }} />
                    {data.name || STATE_NAMES[code] || code}
                </h3>
                <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-area">
                {/* Welfare */}
                <div className="p-3 rounded-xl border border-slate-100 bg-white/60">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Welfare Index</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold" style={{ color: wColor }}>{(data.welfare || 0).toFixed(0)}%</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full mb-1" style={{ backgroundColor: wColor + '20', color: wColor }}>{welfareLabel(data.welfare || 0)}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${data.welfare || 0}%`, backgroundColor: wColor }} />
                    </div>
                </div>

                {/* GDP + Trust */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl border border-slate-100 bg-white/60">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">GDP</p>
                        <span className="text-lg font-bold text-slate-800">₹{(data.gdp || 0).toFixed(1)}B</span>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-white/60">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Trust</p>
                        <span className="text-lg font-bold text-slate-800">{(data.trust || 100).toFixed(0)}</span>
                    </div>
                </div>

                {/* Resources */}
                <div className="p-3 rounded-xl border border-slate-100 bg-white/60 space-y-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Resources</p>
                    {[
                        { key: 'water', label: 'Water', max: 15000, color: '#06b6d4', icon: 'water_drop' },
                        { key: 'energy', label: 'Energy', max: 15000, color: '#f59e0b', icon: 'bolt' },
                        { key: 'food', label: 'Food', max: 15000, color: '#10b981', icon: 'nutrition' },
                        { key: 'tech', label: 'Tech', max: 12000, color: '#6366f1', icon: 'memory' },
                    ].map(res => {
                        const val = resources[res.key] || 0
                        return (
                            <div key={res.key}>
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                                        <span className="material-symbols-outlined text-[13px]" style={{ color: res.color }}>{res.icon}</span>
                                        {res.label}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-700">{val.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (val / res.max) * 100)}%`, backgroundColor: res.color }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </aside>
    )
}

/* ══════════════════════════════════════════════════════════════
   TRADE LINES - Animated connections between trading states
   ══════════════════════════════════════════════════════════════ */
function TradeLines({ trades }) {
    const recentTrades = (trades || []).slice(0, 8)

    return recentTrades.map((trade, i) => {
        const fromCoords = STATE_COORDS[trade.from]
        const toCoords = STATE_COORDS[trade.to]
        if (!fromCoords || !toCoords) return null

        const offering = trade.offering && typeof trade.offering === 'object'
            ? Object.entries(trade.offering).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')
            : ''
        const requesting = trade.requesting && typeof trade.requesting === 'object'
            ? Object.entries(trade.requesting).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')
            : ''

        // Slightly curve the line by adding a midpoint
        const midLat = (fromCoords.lat + toCoords.lat) / 2 + (i % 2 === 0 ? 0.8 : -0.8)
        const midLng = (fromCoords.lng + toCoords.lng) / 2 + (i % 2 === 0 ? -0.5 : 0.5)

        const weight = Math.max(2, 4 - i * 0.3)
        const opacity = Math.max(0.3, 0.9 - i * 0.08)

        return (
            <React.Fragment key={`trade-${trade.tick}-${i}`}>
                {/* Trade line */}
                <Polyline
                    positions={[
                        [fromCoords.lat, fromCoords.lng],
                        [midLat, midLng],
                        [toCoords.lat, toCoords.lng],
                    ]}
                    pathOptions={{
                        color: fromCoords.color,
                        weight: weight,
                        opacity: opacity,
                        dashArray: i === 0 ? '12 6' : '6 4',
                        lineCap: 'round',
                    }}
                >
                    <MapTooltip
                        direction="center"
                        permanent={i === 0}
                        className="trade-tooltip"
                    >
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, padding: 2, minWidth: 140 }}>
                            <div style={{ fontWeight: 700, marginBottom: 3, color: '#0f172a' }}>
                                🔄 {STATE_NAMES[trade.from]} → {STATE_NAMES[trade.to]}
                            </div>
                            {offering && (
                                <div style={{ color: '#16a34a', fontSize: 10 }}>
                                    📦 Offers: {offering}
                                </div>
                            )}
                            {requesting && (
                                <div style={{ color: '#2563eb', fontSize: 10 }}>
                                    🎯 Wants: {requesting}
                                </div>
                            )}
                            <div style={{ color: '#94a3b8', fontSize: 9, marginTop: 2 }}>
                                Tick {trade.tick}
                            </div>
                        </div>
                    </MapTooltip>
                </Polyline>

                {/* Animated dot at the "from" end for latest trade */}
                {i === 0 && (
                    <CircleMarker
                        center={[fromCoords.lat, fromCoords.lng]}
                        radius={6}
                        pathOptions={{
                            fillColor: '#fff',
                            fillOpacity: 1,
                            color: fromCoords.color,
                            weight: 3,
                        }}
                    />
                )}
            </React.Fragment>
        )
    })
}

/* ══════════════════════════════════════════════════════════════
   LIVE TRADE FEED — Floating panel on the map
   ══════════════════════════════════════════════════════════════ */
function MapTradeFeed({ trades, governorMessages, tick }) {
    return (
        <aside className="absolute right-6 bottom-6 w-80 glass-panel rounded-2xl shadow-lg z-[1000]" style={{ maxHeight: 360 }}>
            <div className="p-3 border-b border-slate-200/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-blue-500 text-[16px]">swap_horiz</span>
                    Live Trades & Negotiations
                    <span style={{
                        marginLeft: 'auto', background: '#3b82f6', color: '#fff',
                        padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    }}>Tick {tick}</span>
                </h3>
            </div>
            <div className="overflow-y-auto scroll-area" style={{ maxHeight: 290, padding: 8 }}>
                {/* Live trades */}
                {trades && trades.length > 0 ? (
                    trades.slice(-8).reverse().map((t, i) => (
                        <div key={`t-${i}`} style={{
                            padding: '8px 10px', marginBottom: 5, borderRadius: 10,
                            background: i === 0 ? '#eff6ff' : '#f8fafc',
                            borderLeft: `3px solid ${STATE_COORDS[t.from]?.color || '#3b82f6'}`,
                            fontSize: 11,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontWeight: 700, fontSize: 12 }}>
                                    <span style={{ color: STATE_COORDS[t.from]?.color || '#333' }}>{STATE_NAMES[t.from] || t.from}</span>
                                    <span style={{ color: '#94a3b8', margin: '0 4px' }}>⇄</span>
                                    <span style={{ color: STATE_COORDS[t.to]?.color || '#333' }}>{STATE_NAMES[t.to] || t.to}</span>
                                </span>
                                {i === 0 && <span style={{ fontSize: 9, background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>NEW</span>}
                            </div>
                            {t.offering && typeof t.offering === 'object' && (
                                <div style={{ color: '#16a34a' }}>📦 {Object.entries(t.offering).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')}</div>
                            )}
                            {t.requesting && typeof t.requesting === 'object' && (
                                <div style={{ color: '#2563eb' }}>🎯 {Object.entries(t.requesting).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')}</div>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: 12, color: '#94a3b8', fontSize: 11 }}>⏳ Waiting for LLM trades...</div>
                )}

                {/* Governor AI messages */}
                {governorMessages && governorMessages.length > 0 && (
                    <>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', padding: '6px 4px 2px', letterSpacing: 0.5 }}>
                            🤖 AI Governor Intel
                        </div>
                        {governorMessages.slice(-5).reverse().map((msg, i) => (
                            <div key={`g-${i}`} style={{
                                padding: '8px 10px', marginBottom: 4, borderRadius: 10,
                                background: '#f0fdf4', borderLeft: `3px solid ${STATE_COORDS[msg.state]?.color || '#10b981'}`,
                                fontSize: 11,
                            }}>
                                <span style={{ fontWeight: 700, color: STATE_COORDS[msg.state]?.color || '#333' }}>
                                    {STATE_NAMES[msg.state] || msg.state}:
                                </span>{' '}
                                <span style={{ color: '#475569' }}>{msg.text}</span>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </aside>
    )
}

/* ══════════════════════════════════════════════════════════════
   MAIN INDIA MAP TAB
   ══════════════════════════════════════════════════════════════ */
export default function IndiaMapTab({ tick, regions, trades, climateEvents, connected, sendIntervention, governorMessages }) {
    const [selectedState, setSelectedState] = useState(null)
    const [flyTarget, setFlyTarget] = useState(null)

    function handleSelectState(code) {
        setSelectedState(code)
        const coords = STATE_COORDS[code]
        if (coords) setFlyTarget({ lat: coords.lat, lng: coords.lng })
    }

    return (
        <div className="relative w-full h-full">
            <MapContainer
                center={[22.5, 79.5]}
                zoom={5}
                minZoom={4}
                maxZoom={9}
                maxBounds={[[6, 65], [37, 100]]}
                maxBoundsViscosity={1.0}
                style={{ width: '100%', height: '100%', zIndex: 0 }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {flyTarget && <FlyToState lat={flyTarget.lat} lng={flyTarget.lng} />}

                {/* Trade lines with details */}
                <TradeLines trades={trades} />

                {/* State overlays */}
                {Object.entries(STATE_COORDS).map(([code, coords]) => {
                    const data = regions[code] || {}
                    const welfare = data.welfare || 50
                    const wColor = welfareColor(welfare)
                    const isSelected = selectedState === code

                    // Check if this state has any active trades
                    const hasTrades = trades && trades.some(t => t.from === code || t.to === code)

                    return (
                        <React.Fragment key={code}>
                            {/* Welfare radius */}
                            <Circle
                                center={[coords.lat, coords.lng]}
                                radius={welfare * 1500}
                                pathOptions={{
                                    fillColor: wColor,
                                    fillOpacity: 0.1,
                                    color: wColor,
                                    weight: 1,
                                    opacity: 0.25,
                                }}
                            />

                            {/* Pulse ring for trading states */}
                            {hasTrades && (
                                <Circle
                                    center={[coords.lat, coords.lng]}
                                    radius={40000}
                                    pathOptions={{
                                        fillColor: coords.color,
                                        fillOpacity: 0.08,
                                        color: coords.color,
                                        weight: 2,
                                        opacity: 0.4,
                                        dashArray: '4 4',
                                    }}
                                />
                            )}

                            {/* State marker */}
                            <CircleMarker
                                center={[coords.lat, coords.lng]}
                                radius={isSelected ? 12 : hasTrades ? 10 : 8}
                                pathOptions={{
                                    fillColor: coords.color,
                                    fillOpacity: 1,
                                    color: hasTrades ? '#fff' : '#ffffff',
                                    weight: hasTrades ? 4 : 3,
                                    opacity: 1,
                                }}
                                eventHandlers={{ click: () => handleSelectState(code) }}
                            >
                                <Popup>
                                    <PopupContent code={code} data={data} />
                                </Popup>
                                {/* State label on map */}
                                <MapTooltip direction="top" offset={[0, -12]} permanent className="state-label-tooltip">
                                    <span style={{ fontSize: 10, fontWeight: 700, color: coords.color }}>{code}</span>
                                </MapTooltip>
                            </CircleMarker>
                        </React.Fragment>
                    )
                })}
            </MapContainer>

            {/* Left: Legend */}
            <LegendPanel regions={regions} onSelectState={handleSelectState} selectedState={selectedState} />

            {/* Bottom-left: Intervention Panel */}
            <InterventionPanel sendIntervention={sendIntervention} recentEvents={climateEvents || []} />

            {/* Bottom-right: Live Trade Feed */}
            {!selectedState && (
                <MapTradeFeed trades={trades} governorMessages={governorMessages} tick={tick} />
            )}

            {/* Right: State Info (shown when a state is selected) */}
            <StateInfoPanel code={selectedState} data={regions[selectedState]} onClose={() => setSelectedState(null)} />
        </div>
    )
}
