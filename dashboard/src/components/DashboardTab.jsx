import React, { useState, useEffect, useRef } from 'react'

/* ── Dummy Data Generators ─────────────────────────────────────── */
const STATES = ['PB', 'MH', 'TN', 'KA', 'GJ', 'UP', 'BR', 'WB', 'RJ', 'MP']
const STATE_NAMES = {
    PB: 'Punjab', MH: 'Maharashtra', TN: 'Tamil Nadu', KA: 'Karnataka', GJ: 'Gujarat',
    UP: 'Uttar Pradesh', BR: 'Bihar', WB: 'West Bengal', RJ: 'Rajasthan', MP: 'Madhya Pradesh',
}
const RESOURCES = ['Water', 'Energy', 'Food', 'Tech']
const RESOURCE_ICONS = { Water: 'water_drop', Energy: 'bolt', Food: 'nutrition', Tech: 'memory' }
const RESOURCE_COLORS = { Water: 'cyan', Energy: 'amber', Food: 'emerald', Tech: 'indigo' }

const STATE_MAP_POS = {
    PB: { top: '22%', left: '38%', color: '#22c55e' },
    RJ: { top: '38%', left: '30%', color: '#f59e0b' },
    GJ: { top: '48%', left: '22%', color: '#a855f7' },
    UP: { top: '32%', left: '52%', color: '#ef4444' },
    MP: { top: '48%', left: '42%', color: '#6366f1' },
    MH: { top: '58%', left: '34%', color: '#3b82f6' },
    BR: { top: '38%', left: '68%', color: '#ec4899' },
    WB: { top: '45%', left: '74%', color: '#14b8a6' },
    KA: { top: '72%', left: '38%', color: '#10b981' },
    TN: { top: '82%', left: '44%', color: '#f97316' },
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function generateTrade() {
    const from = STATES[randomInt(0, STATES.length - 1)]
    let to = from; while (to === from) to = STATES[randomInt(0, STATES.length - 1)]
    const res = RESOURCES[randomInt(0, RESOURCES.length - 1)]
    const amt = randomInt(50, 2000)
    const units = res === 'Water' ? ' KL' : res === 'Energy' ? ' MW' : res === 'Food' ? ' Tons' : ' Units'
    const timeAgo = ['Now', '1m ago', '2m ago', '3m ago', '5m ago'][randomInt(0, 4)]
    return { id: Date.now() + Math.random(), from, to, resource: res, amount: amt, units, timeAgo }
}

const GOVERNOR_MSGS = [
    { state: 'MH', text: 'Negotiating a water-for-energy swap with Karnataka. Surplus energy reserves allow for aggressive export policy this quarter.' },
    { state: 'KA', text: 'Acknowledged. Proposal under review. Our agricultural sector requires immediate water supply to maintain yield targets. Counter-offer sent.' },
    { state: 'TN', text: 'We face a severe drought. Will trade tech infrastructure for 500 units of water. This is urgent.' },
    { state: 'GJ', text: 'Port operations at full capacity. Can facilitate trade corridors for coastal states. Need food security guarantees.' },
    { state: 'PB', text: 'Wheat harvest exceeded projections. Open to bulk food exports. Seeking Energy or Tech in return.' },
    { state: 'UP', text: 'Population growth straining water supply. Requesting emergency bilateral talks with PB for food-water swap.' },
    { state: 'BR', text: 'Flood damage to agriculture. Declaring resource emergency. Requesting humanitarian aid from neighboring states.' },
    { state: 'WB', text: 'Cultural districts driving tourism GDP. Surplus energy from solar farms. Offering 600 Energy for 400 Food.' },
    { state: 'RJ', text: 'Desert solar installations online. Massive energy surplus. Will trade 1000 Energy for 800 Water — non-negotiable.' },
    { state: 'MP', text: 'Central corridor trade agreements stable. Proposing multilateral treaty with MH and KA for resource pooling.' },
    { state: 'MH', text: 'Counter-offering GJ: 500 Food for 700 Energy. Mumbai needs sustained power for Q3 industrial targets.' },
    { state: 'KA', text: 'Bengaluru tech sector booming. We have 1200 Tech surplus. Looking for Water — willing to trade at 1:2 ratio.' },
    { state: 'TN', text: 'Accepting KA offer for Tech-Water swap. Formalizing bilateral treaty. Trust level: HIGH.' },
    { state: 'PB', text: 'Warning: Monsoon prediction models show 40% deficit. Recommending all northern states build water reserves.' },
]

const STATE_BUBBLE_COLORS = {
    PB: { bg: 'bg-green-100', text: 'text-green-700' },
    MH: { bg: 'bg-blue-100', text: 'text-blue-700' },
    TN: { bg: 'bg-orange-100', text: 'text-orange-700' },
    KA: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    GJ: { bg: 'bg-purple-100', text: 'text-purple-700' },
    UP: { bg: 'bg-red-100', text: 'text-red-700' },
    BR: { bg: 'bg-pink-100', text: 'text-pink-700' },
    WB: { bg: 'bg-teal-100', text: 'text-teal-700' },
    RJ: { bg: 'bg-amber-100', text: 'text-amber-700' },
    MP: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
}

/* ── Left Panel: Live Trade Activity ───────────────────────────── */
function LiveTradePanel() {
    const [trades, setTrades] = useState(() => Array.from({ length: 6 }, generateTrade))
    const scrollRef = useRef(null)

    useEffect(() => {
        const interval = setInterval(() => {
            setTrades(prev => [generateTrade(), ...prev].slice(0, 20))
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    return (
        <aside className="absolute left-6 top-6 bottom-6 w-80 glass-panel rounded-2xl shadow-lg flex flex-col z-20">
            <div className="p-5 border-b border-slate-200/50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#137fec] text-[20px]">swap_horiz</span>
                    Live Trade
                </h3>
                <span className="inline-flex w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulse-subtle 2s infinite' }}></span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scroll-area" ref={scrollRef}>
                {trades.map(trade => {
                    const color = RESOURCE_COLORS[trade.resource]
                    return (
                        <div className="trade-item" key={trade.id}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {trade.resource} Transfer
                                </span>
                                <span className="text-[10px] text-slate-400">{trade.timeAgo}</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full bg-${color}-50 flex items-center justify-center shrink-0`}>
                                    <span className={`material-symbols-outlined text-${color}-500 text-[16px]`}>
                                        {RESOURCE_ICONS[trade.resource]}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800 leading-tight">
                                        {STATE_NAMES[trade.from]} <span className="text-slate-400">→</span> {STATE_NAMES[trade.to]}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {trade.amount.toLocaleString()}{trade.units}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </aside>
    )
}

/* ── Right Panel: Governor Intel ───────────────────────────────── */
function GovernorIntelPanel() {
    const [msgs, setMsgs] = useState(() => GOVERNOR_MSGS.slice(0, 4).map((m, i) => ({ ...m, id: i })))
    const [tradeCounter, setTradeCounter] = useState(4092)
    const scrollRef = useRef(null)

    useEffect(() => {
        const interval = setInterval(() => {
            const msg = GOVERNOR_MSGS[randomInt(0, GOVERNOR_MSGS.length - 1)]
            setMsgs(prev => [...prev, { ...msg, id: Date.now() + Math.random() }].slice(-15))
            setTradeCounter(prev => prev + 1)
        }, 4000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [msgs])

    return (
        <aside className="absolute right-6 top-6 bottom-6 w-80 glass-panel rounded-2xl shadow-lg flex flex-col z-20">
            <div className="p-5 border-b border-slate-200/50 shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#137fec] text-[20px]">psychology</span>
                    Governor Intel
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-area" ref={scrollRef}>
                {msgs.map((msg, i) => {
                    const colors = STATE_BUBBLE_COLORS[msg.state] || { bg: 'bg-slate-100', text: 'text-slate-700' }
                    return (
                        <React.Fragment key={msg.id}>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full ${colors.bg} flex items-center justify-center`}>
                                        <span className={`text-[10px] font-bold ${colors.text}`}>{msg.state}</span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-500">{STATE_NAMES[msg.state]} AI Governor</span>
                                </div>
                                <div className="chat-bubble">{msg.text}</div>
                            </div>
                            {/* Occasional system notification */}
                            {i === 1 && (
                                <div className="flex justify-center my-1">
                                    <div className="system-notif">Trade Agreement #{tradeCounter} Initialized</div>
                                </div>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
            {/* Input Area */}
            <div className="p-4 border-t border-slate-200/50 bg-white/40 shrink-0">
                <div className="relative">
                    <input
                        className="w-full pl-4 pr-10 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec]/50 text-slate-700 placeholder:text-slate-400"
                        placeholder="Query simulation logic..."
                        type="text"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#137fec] transition-colors">
                        <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                </div>
            </div>
        </aside>
    )
}

/* ── Bottom Stats Panel ────────────────────────────────────────── */
function StatsPanel() {
    const [gdp, setGdp] = useState(2.4)
    const [gini, setGini] = useState(0.35)
    const [gdpBars, setGdpBars] = useState([40, 60, 50, 70, 80, 100])
    const [giniBars, setGiniBars] = useState([80, 75, 70, 65, 60, 55])
    const [resBars, setResBars] = useState([50, 50, 40, 60, 45, 35])

    useEffect(() => {
        const interval = setInterval(() => {
            setGdp(prev => +(prev + (Math.random() - 0.3) * 0.2).toFixed(1))
            setGini(prev => +(prev + (Math.random() - 0.5) * 0.01).toFixed(2))
            setGdpBars(prev => [...prev.slice(1), randomInt(30, 100)])
            setGiniBars(prev => [...prev.slice(1), randomInt(30, 90)])
            setResBars(prev => [...prev.slice(1), randomInt(20, 80)])
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    const gdpPositive = gdp > 0

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl flex gap-4 z-20 px-6">
            {/* GDP */}
            <div className="stat-card glass-panel shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">GDP Growth</p>
                        <h4 className="text-2xl font-bold text-slate-800 mt-1">{gdpPositive ? '+' : ''}{gdp}%</h4>
                    </div>
                    <span className={`flex items-center ${gdpPositive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} rounded-full px-2 py-0.5 text-xs font-medium`}>
                        <span className="material-symbols-outlined text-[14px] mr-0.5">{gdpPositive ? 'trending_up' : 'trending_down'}</span>
                        0.1%
                    </span>
                </div>
                <div className="h-8 flex items-end gap-1">
                    {gdpBars.map((h, i) => (
                        <div key={i} className={`flex-1 spark-bar ${i === gdpBars.length - 1 ? 'bg-[#137fec]' : 'bg-slate-200'}`} style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>

            {/* Gini */}
            <div className="stat-card glass-panel shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gini Index</p>
                        <h4 className="text-2xl font-bold text-slate-800 mt-1">{gini.toFixed(2)}</h4>
                    </div>
                    <span className="flex items-center text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 text-xs font-medium">
                        <span className="material-symbols-outlined text-[14px] mr-0.5">arrow_downward</span>
                        0.01
                    </span>
                </div>
                <div className="h-8 flex items-end gap-1">
                    {giniBars.map((h, i) => (
                        <div key={i} className={`flex-1 spark-bar ${i === giniBars.length - 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>

            {/* Resource Balance */}
            <div className="stat-card glass-panel shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Res. Balance</p>
                        <h4 className="text-2xl font-bold text-slate-800 mt-1">Stable</h4>
                    </div>
                    <span className="flex items-center text-rose-600 bg-rose-50 rounded-full px-2 py-0.5 text-xs font-medium">
                        <span className="material-symbols-outlined text-[14px] mr-0.5">trending_down</span>
                        1.2%
                    </span>
                </div>
                <div className="h-8 flex items-end gap-1">
                    {resBars.map((h, i) => (
                        <div key={i} className={`flex-1 spark-bar ${i === resBars.length - 1 ? 'bg-rose-500' : 'bg-slate-200'}`} style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ── Background Map Layer (SVG) ────────────────────────────────── */
function BackgroundMap() {
    return (
        <div className="absolute inset-0 z-0 map-bg bg-slate-50 flex items-center justify-center">
            <svg className="w-full h-full max-w-[800px] max-h-[800px] opacity-20 pointer-events-none" fill="none" viewBox="0 0 400 500">
                <path d="M150,50 L250,50 L280,150 L350,200 L320,300 L200,450 L80,300 L50,200 L120,150 Z" stroke="#94a3b8" strokeLinejoin="round" strokeWidth="2" />
                <path d="M120,150 L280,150" stroke="#cbd5e1" strokeWidth="1" />
                <path d="M50,200 L350,200" stroke="#cbd5e1" strokeWidth="1" />
                <path d="M80,300 L320,300" stroke="#cbd5e1" strokeWidth="1" />
                <path d="M200,150 L200,450" stroke="#cbd5e1" strokeWidth="1" />
            </svg>

            {/* State Nodes */}
            {Object.entries(STATE_MAP_POS).map(([code, pos]) => (
                <div key={code} className="state-node absolute" style={{ top: pos.top, left: pos.left }}>
                    <div className="relative">
                        <div className="state-ping" style={{ backgroundColor: pos.color }} />
                        <div className="state-dot" style={{ borderColor: pos.color }} />
                    </div>
                    <span className="state-label">{code}</span>
                </div>
            ))}

            {/* Animated Trade Arcs */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#3b82f6' }} />
                        <stop offset="100%" style={{ stopColor: '#a855f7' }} />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#10b981' }} />
                        <stop offset="100%" style={{ stopColor: '#3b82f6' }} />
                    </linearGradient>
                </defs>
                <path d="M430 400 Q 500 450 540 480" fill="none" stroke="url(#grad1)" strokeDasharray="5,5" strokeWidth="2" opacity="0.6">
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
                </path>
                <path d="M540 480 Q 580 550 620 620" fill="none" stroke="url(#grad2)" strokeDasharray="4,4" strokeWidth="2" opacity="0.6">
                    <animate attributeName="stroke-dashoffset" from="0" to="100" dur="3s" repeatCount="indefinite" />
                </path>
            </svg>
        </div>
    )
}

/* ── Main Dashboard Tab ────────────────────────────────────────── */
export default function DashboardTab({ tick }) {
    return (
        <div className="relative w-full h-full">
            <BackgroundMap />
            <LiveTradePanel />
            <StatsPanel />
            <GovernorIntelPanel />
        </div>
    )
}
