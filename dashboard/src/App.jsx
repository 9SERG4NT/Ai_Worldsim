import React, { useState, useEffect } from 'react'
import TradeMap from './components/TradeMap'
import FinOpsOrderBook from './components/FinOpsOrderBook'
import GovernorChat from './components/GovernorChat'
import MacroAnalytics, { INITIAL_EVENTS } from './components/MacroAnalytics'
import FederalIntervention from './components/FederalIntervention'

export default function App() {
    const [tick, setTick] = useState(0)
    const [climateEvents, setClimateEvents] = useState([...INITIAL_EVENTS])

    // Global tick counter
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(prev => prev + 1)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    // Federal intervention handler
    function handleIntervention(event) {
        setClimateEvents(prev => [...prev, event].slice(-30))
    }

    return (
        <div className="dashboard-grid">
            {/* Left Sidebar — Order Book */}
            <FinOpsOrderBook />

            {/* Center — 3D Map + Overlays */}
            <div className="zone-center">
                <TradeMap />

                {/* Status Bar Overlay */}
                <div className="status-bar">
                    <div className="status-badge">
                        TICK <span className="value">{tick}</span>
                    </div>
                    <div className="status-badge">
                        AGENTS <span className="value">10</span>
                    </div>
                    <div className="status-badge">
                        STATES <span className="value" style={{ color: '#10b981' }}>ACTIVE</span>
                    </div>
                </div>

                {/* Federal Intervention Panel */}
                <FederalIntervention onTrigger={handleIntervention} />
            </div>

            {/* Right Sidebar — Governor Chat */}
            <GovernorChat />

            {/* Bottom Panel — Macro Analytics */}
            <MacroAnalytics
                climateEvents={climateEvents}
                setClimateEvents={setClimateEvents}
            />
        </div>
    )
}
