import React, { useState } from 'react'

const INTERVENTIONS = [
    { id: 'drought_rj', label: 'Trigger Drought in RJ', emoji: '🏜️', type: 'danger', eventText: '🏜️ FEDERAL: Drought triggered in RJ — Water reserves -60%' },
    { id: 'energy_mh', label: 'Energy Crisis in MH', emoji: '⚡', type: 'danger', eventText: '⚡ FEDERAL: Energy crisis declared in MH — Grid shutdown imminent' },
    { id: 'flood_br', label: 'Flood in BR', emoji: '🌊', type: 'danger', eventText: '🌊 FEDERAL: Catastrophic flooding in BR — All production halted' },
    { id: 'tech_ka', label: 'Tech Boom in KA', emoji: '💻', type: 'success', eventText: '💻 FEDERAL: Tech boom stimulus in KA — Tech output +300%' },
    { id: 'monsoon_pb', label: 'Monsoon Failure in PB', emoji: '🌧️', type: 'danger', eventText: '🌧️ FEDERAL: Monsoon failure in PB — Crop yields devastated' },
    { id: 'trade_ban', label: 'Block TN-KA Trade', emoji: '🚫', type: 'warning', eventText: '🚫 FEDERAL: Trade embargo between TN and KA — All routes blocked' },
    { id: 'stimulus', label: 'National GDP Stimulus', emoji: '📈', type: 'success', eventText: '📈 FEDERAL: National economic stimulus — All states GDP +5%' },
    { id: 'pandemic', label: 'Health Crisis in UP', emoji: '🦠', type: 'danger', eventText: '🦠 FEDERAL: Health emergency in UP — Welfare plummeting' },
]

export default function FederalIntervention({ onTrigger }) {
    const [flashId, setFlashId] = useState(null)
    const [triggerCount, setTriggerCount] = useState(0)

    function handleClick(intervention) {
        // Flash animation
        setFlashId(intervention.id)
        setTimeout(() => setFlashId(null), 500)

        // Increment counter
        setTriggerCount(prev => prev + 1)

        // Callback to parent
        onTrigger({
            id: Date.now() + Math.random(),
            type: intervention.type,
            text: intervention.eventText,
        })
    }

    return (
        <div className="intervention-panel">
            <div className="intervention-title">
                <span style={{ fontSize: '14px' }}>⚡</span>
                Federal Intervention
                {triggerCount > 0 && (
                    <span style={{
                        marginLeft: 'auto',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#f59e0b',
                        padding: '1px 6px',
                        borderRadius: '8px',
                        fontSize: '9px',
                    }}>
                        {triggerCount} fired
                    </span>
                )}
            </div>

            {INTERVENTIONS.map((item) => (
                <button
                    key={item.id}
                    className={`intervention-btn ${flashId === item.id ? 'flash' : ''}`}
                    onClick={() => handleClick(item)}
                >
                    <span className="emoji">{item.emoji}</span>
                    {item.label}
                </button>
            ))}

            <div style={{
                marginTop: '8px',
                padding: '6px',
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: '4px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '9px',
                color: '#64748b',
                lineHeight: 1.4,
            }}>
                ⚠️ Federal actions override state autonomy. Use sparingly to test agent resilience.
            </div>
        </div>
    )
}
