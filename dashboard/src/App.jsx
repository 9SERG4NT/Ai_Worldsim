import React, { useState, useEffect, useRef, useCallback } from 'react'
import DashboardTab from './components/DashboardTab'
import IndiaMapTab from './components/IndiaMapTab'

/* ── WebSocket Hook ────────────────────────────────────────────── */
function useSimulationSocket(url) {
    const [connected, setConnected] = useState(false)
    const [simData, setSimData] = useState(null)
    const wsRef = useRef(null)
    const reconnectRef = useRef(null)

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(url)
            wsRef.current = ws

            ws.onopen = () => {
                setConnected(true)
                console.log('[WS] Connected to simulation')
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === 'tick' || data.type === 'init') {
                        setSimData(data)
                    }
                } catch (e) {
                    console.warn('[WS] Parse error:', e)
                }
            }

            ws.onclose = () => {
                setConnected(false)
                console.log('[WS] Disconnected, retrying in 3s...')
                reconnectRef.current = setTimeout(connect, 3000)
            }

            ws.onerror = () => {
                ws.close()
            }
        } catch (e) {
            console.warn('[WS] Connection failed:', e)
            reconnectRef.current = setTimeout(connect, 3000)
        }
    }, [url])

    useEffect(() => {
        connect()
        return () => {
            if (wsRef.current) wsRef.current.close()
            if (reconnectRef.current) clearTimeout(reconnectRef.current)
        }
    }, [connect])

    const sendIntervention = useCallback((intervention) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'intervene',
                payload: intervention,
            }))
        }
        // Also POST via REST as backup
        fetch('http://localhost:8000/api/intervene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(intervention),
        }).catch(() => { })
    }, [])

    return { connected, simData, sendIntervention }
}

/* ── App ───────────────────────────────────────────────────────── */
export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const { connected, simData, sendIntervention } = useSimulationSocket('ws://localhost:8000/ws')

    const tick = simData?.tick || 0
    const regions = simData?.regions || {}
    const trades = simData?.trades || []
    const governorMessages = simData?.governor_messages || []
    const climateEvents = simData?.climate_events || []
    const stats = simData?.stats || {}
    const tickSummary = simData?.tick_summary || {}

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden">
            {/* ── Top Navigation ──────────────────────────────────────── */}
            <header className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 shrink-0">
                {/* Left: Logo + Connection */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#137fec]/10 rounded-lg flex items-center justify-center text-[#137fec]">
                        <span className="material-symbols-outlined">public</span>
                    </div>
                    <h2 className="text-slate-900 text-lg font-bold tracking-tight">WORLDSIM</h2>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${connected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ animation: connected ? 'pulse-subtle 2s infinite' : 'none' }} />
                        {connected ? 'LIVE' : 'OFFLINE'}
                    </div>
                </div>

                {/* Center: Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
                    <button
                        className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                        Dashboard
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                        onClick={() => setActiveTab('map')}
                    >
                        <span className="material-symbols-outlined text-[18px]">map</span>
                        India Map
                    </button>
                </div>

                {/* Right: Stats */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
                        <span className="material-symbols-outlined text-slate-500 text-[20px]">schedule</span>
                        <span className="text-sm font-semibold text-slate-700">Tick {tick.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
                        <span className="material-symbols-outlined text-slate-500 text-[20px]">monetization_on</span>
                        <span className="text-sm font-semibold text-slate-700">GDP: {stats.total_gdp ? `₹${stats.total_gdp.toFixed(1)}` : '—'}</span>
                    </div>
                    {stats.gini !== undefined && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-full border border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-500">GINI</span>
                            <span className="text-sm font-semibold text-slate-700">{stats.gini.toFixed(3)}</span>
                        </div>
                    )}
                    <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>
            </header>

            {/* ── Main Content ────────────────────────────────────────── */}
            <main className="relative flex-1 w-full overflow-auto" style={{ height: 'calc(100vh - 56px)' }}>
                {activeTab === 'dashboard' && (
                    <DashboardTab
                        tick={tick} regions={regions} trades={trades}
                        governorMessages={governorMessages} climateEvents={climateEvents}
                        stats={stats} connected={connected} tickSummary={tickSummary}
                    />
                )}
                {activeTab === 'map' && (
                    <IndiaMapTab
                        tick={tick} regions={regions} trades={trades}
                        climateEvents={climateEvents} connected={connected}
                        sendIntervention={sendIntervention}
                        governorMessages={governorMessages}
                    />
                )}
            </main>
        </div>
    )
}
