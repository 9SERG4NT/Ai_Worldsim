import React, { useState, useEffect, useRef } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts'

/* ── Helper: generate time series data ── */
function generateGDPData(count = 20) {
    let gdp = 2400
    return Array.from({ length: count }, (_, i) => {
        gdp += (Math.random() - 0.35) * 120
        gdp = Math.max(1800, gdp)
        return { tick: i + 1, gdp: Math.round(gdp) }
    })
}

function generateGiniData(count = 20) {
    let gini = 0.38
    return Array.from({ length: count }, (_, i) => {
        gini += (Math.random() - 0.5) * 0.015
        gini = Math.max(0.2, Math.min(0.6, gini))
        return { tick: i + 1, gini: parseFloat(gini.toFixed(3)) }
    })
}

const INITIAL_EVENTS = [
    { id: 1, type: 'danger', text: '🌪️ Monsoon Failure in PB — Water -40%' },
    { id: 2, type: 'warning', text: '⚡ Energy Grid Overload in MH — Tech -15%' },
    { id: 3, type: 'info', text: '🌊 Flood Alert in BR — Food production halted' },
    { id: 4, type: 'success', text: '☀️ Solar Boom in RJ — Energy +200 surplus' },
    { id: 5, type: 'danger', text: '🔥 Heatwave in UP — Welfare dropping below 45%' },
    { id: 6, type: 'warning', text: '🏭 Industrial Slowdown in GJ — GDP growth stalled' },
    { id: 7, type: 'info', text: '🌱 Bumper Crop in PB — Food surplus declared' },
    { id: 8, type: 'success', text: '💻 Tech Hub Expansion in KA — Tech +150' },
]

const RANDOM_EVENTS = [
    { type: 'danger', text: '🌪️ Cyclone Warning for TN coast — evacuations underway' },
    { type: 'warning', text: '⚡ Power grid instability in WB — rolling blackouts' },
    { type: 'danger', text: '🔥 Forest fires in MP — Food production -25%' },
    { type: 'info', text: '🌊 Dam overflow in BR — Water surplus but infrastructure damage' },
    { type: 'success', text: '🏗️ Infrastructure boost in MH — GDP +3.2% this tick' },
    { type: 'warning', text: '📉 Trust breakdown between RJ-UP — tariffs increased 200%' },
    { type: 'danger', text: '🏜️ Desertification spreading in RJ — Water reserves critical' },
    { type: 'success', text: '🤝 Treaty signed: KA-TN Tech Corridor — mutual +5% GDP' },
    { type: 'info', text: '📊 Federal Assembly vote: Water reserve fund — 7/10 approved' },
    { type: 'warning', text: '⚠️ Migration wave from BR to WB — population shift detected' },
]

/* ── Custom Tooltip ── */
function CustomTooltip({ active, payload, label, unit }) {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                padding: '6px 10px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '10px',
            }}>
                <div style={{ color: '#64748b', marginBottom: '2px' }}>Tick {label}</div>
                <div style={{ color: payload[0].color, fontWeight: 600 }}>
                    {payload[0].value}{unit}
                </div>
            </div>
        )
    }
    return null
}

/* ── GDP Chart ── */
function GDPChart({ data }) {
    return (
        <div className="chart-panel">
            <div className="chart-title">
                <span className="indicator" style={{ background: '#10b981' }} />
                National GDP Growth
                <span style={{ marginLeft: 'auto', color: '#10b981', fontWeight: 700, fontSize: '11px' }}>
                    ₹{data[data.length - 1]?.gdp || 0}B
                </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gdpGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
                    <XAxis
                        dataKey="tick"
                        tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        axisLine={{ stroke: 'rgba(71,85,105,0.3)' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip unit="B" />} />
                    <Area
                        type="monotone"
                        dataKey="gdp"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#gdpGrad)"
                        dot={false}
                        activeDot={{ r: 3, fill: '#10b981', stroke: '#0a0e1a', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

/* ── Gini Chart ── */
function GiniChart({ data }) {
    const lastVal = data[data.length - 1]?.gini || 0
    const isHigh = lastVal > 0.4

    return (
        <div className="chart-panel">
            <div className="chart-title">
                <span className="indicator" style={{ background: isHigh ? '#ef4444' : '#f59e0b' }} />
                Global Gini Coefficient
                <span style={{
                    marginLeft: 'auto',
                    color: isHigh ? '#ef4444' : '#f59e0b',
                    fontWeight: 700,
                    fontSize: '11px',
                }}>
                    {lastVal}
                </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="giniGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
                    <XAxis
                        dataKey="tick"
                        tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        axisLine={{ stroke: 'rgba(71,85,105,0.3)' }}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0.2, 0.6]}
                        tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip unit="" />} />
                    <Area
                        type="monotone"
                        dataKey="gini"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#giniGrad)"
                        dot={false}
                        activeDot={{ r: 3, fill: '#f59e0b', stroke: '#0a0e1a', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

/* ── Climate Shocks Ticker ── */
function ClimateTicker({ events }) {
    const scrollRef = useRef(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [events])

    return (
        <div className="chart-panel">
            <div className="chart-title">
                <span className="indicator" style={{ background: '#ef4444' }} />
                Active Climate Shocks
                <span style={{ marginLeft: 'auto', color: '#ef4444', fontWeight: 700, fontSize: '11px' }}>
                    {events.length} active
                </span>
            </div>
            <div className="ticker-container">
                <div className="ticker-scroll" ref={scrollRef}>
                    {events.map((event) => (
                        <div className={`ticker-event ${event.type}`} key={event.id}>
                            {event.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ── Main MacroAnalytics Component ── */
export default function MacroAnalytics({ climateEvents, setClimateEvents }) {
    const [gdpData, setGdpData] = useState(generateGDPData)
    const [giniData, setGiniData] = useState(generateGiniData)

    // Animate chart data
    useEffect(() => {
        const interval = setInterval(() => {
            setGdpData(prev => {
                const last = prev[prev.length - 1]
                const newGdp = Math.max(1800, last.gdp + (Math.random() - 0.35) * 120)
                const next = [...prev, { tick: last.tick + 1, gdp: Math.round(newGdp) }]
                return next.slice(-40) // keep last 40 points
            })

            setGiniData(prev => {
                const last = prev[prev.length - 1]
                let newGini = last.gini + (Math.random() - 0.5) * 0.015
                newGini = Math.max(0.2, Math.min(0.6, newGini))
                const next = [...prev, { tick: last.tick + 1, gini: parseFloat(newGini.toFixed(3)) }]
                return next.slice(-40)
            })
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    // Add random climate events
    useEffect(() => {
        const interval = setInterval(() => {
            const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
            setClimateEvents(prev => {
                const next = [...prev, { ...event, id: Date.now() + Math.random() }]
                return next.slice(-30)
            })
        }, 5000)
        return () => clearInterval(interval)
    }, [setClimateEvents])

    return (
        <div className="zone-bottom">
            <div className="charts-container">
                <GDPChart data={gdpData} />
                <GiniChart data={giniData} />
                <ClimateTicker events={climateEvents} />
            </div>
        </div>
    )
}

export { INITIAL_EVENTS }
