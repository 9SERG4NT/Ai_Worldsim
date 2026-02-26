import React, { useState, useEffect } from 'react'
import DashboardTab from './components/DashboardTab'
import IndiaMapTab from './components/IndiaMapTab'

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [tick, setTick] = useState(1402)

    useEffect(() => {
        const interval = setInterval(() => {
            setTick(prev => prev + 1)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden">
            {/* ── Top Navigation ──────────────────────────────────────── */}
            <header className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 shrink-0">
                {/* Left: Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#137fec]/10 rounded-lg flex items-center justify-center text-[#137fec]">
                        <span className="material-symbols-outlined">public</span>
                    </div>
                    <h2 className="text-slate-900 text-lg font-bold tracking-tight">WORLDSIM</h2>
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

                {/* Right: Status + Avatar */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
                        <span className="material-symbols-outlined text-slate-500 text-[20px]">schedule</span>
                        <span className="text-sm font-semibold text-slate-700">Tick {tick.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
                        <span className="material-symbols-outlined text-slate-500 text-[20px]">monetization_on</span>
                        <span className="text-sm font-semibold text-slate-700">GDP: ₹4.2T</span>
                    </div>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>
            </header>

            {/* ── Main Content ────────────────────────────────────────── */}
            <main className="relative flex-1 w-full h-full overflow-hidden">
                {activeTab === 'dashboard' && <DashboardTab tick={tick} />}
                {activeTab === 'map' && <IndiaMapTab tick={tick} />}
            </main>
        </div>
    )
}
