import React, { useState, useEffect, useRef } from 'react'

const GOVERNOR_COLORS = {
    PB: '#22c55e',
    MH: '#f97316',
    TN: '#8b5cf6',
    KA: '#06b6d4',
    GJ: '#3b82f6',
    UP: '#ef4444',
    BR: '#ec4899',
    WB: '#14b8a6',
    RJ: '#f59e0b',
    MP: '#a855f7',
}

const GOVERNOR_NAMES = {
    PB: 'Punjab Governor',
    MH: 'Maharashtra Governor',
    TN: 'Tamil Nadu Governor',
    KA: 'Karnataka Governor',
    GJ: 'Gujarat Governor',
    UP: 'Uttar Pradesh Governor',
    BR: 'Bihar Governor',
    WB: 'West Bengal Governor',
    RJ: 'Rajasthan Governor',
    MP: 'Madhya Pradesh Governor',
}

const NEGOTIATION_MESSAGES = [
    { state: 'TN', text: 'We face a severe drought. Will trade tech infrastructure for 500 units of water. This is urgent.' },
    { state: 'MH', text: 'Mumbai industrial output is peaking. Offering 800 Energy to any state with surplus Food reserves.' },
    { state: 'PB', text: 'Wheat harvest exceeded projections. Open to bulk Food exports. Seeking Energy or Tech in return.' },
    { state: 'KA', text: 'Bengaluru tech sector booming. We have 1200 Tech surplus. Looking for Water — willing to trade at 1:2 ratio.' },
    { state: 'GJ', text: 'Port operations at full capacity. Can facilitate trade corridors for coastal states. Need Food security guarantees.' },
    { state: 'UP', text: 'Population growth straining Water supply. Requesting emergency bilateral talks with PB for Food-Water swap.' },
    { state: 'BR', text: 'Flood damage to agriculture. Declaring resource emergency. Requesting humanitarian aid from neighboring states.' },
    { state: 'WB', text: 'Cultural districts driving tourism GDP. Surplus Energy from solar farms. Offering 600 Energy for 400 Food.' },
    { state: 'RJ', text: 'Desert solar installations online. Massive Energy surplus. Will trade 1000 Energy for 800 Water — non-negotiable.' },
    { state: 'MP', text: 'Central corridor trade agreements stable. Proposing multilateral treaty with MH and KA for resource pooling.' },
    { state: 'TN', text: 'Accepting KA offer for Tech-Water swap. Formalizing bilateral treaty. Trust level: HIGH.' },
    { state: 'MH', text: 'Counter-offering GJ: 500 Food for 700 Energy. Mumbai needs sustained power for Q3 industrial targets.' },
    { state: 'PB', text: 'Warning: Monsoon prediction models show 40% deficit. Recommending all northern states build Water reserves.' },
    { state: 'UP', text: 'Agreeing to PB terms. Sending 400 Tech for 600 Food. This stabilizes our welfare index above 55%.' },
    { state: 'KA', text: 'Proposing Federal Assembly resolution: Establish national Water reserve fund. All states contribute 5% surplus.' },
    { state: 'BR', text: 'Relief aid from WB received. Trust score with WB increased to 92. Proposing long-term Energy cooperation pact.' },
    { state: 'RJ', text: 'Sand storm disrupted solar output for 3 ticks. Temporarily suspending Energy exports. Need 200 Food emergency supply.' },
    { state: 'GJ', text: 'Trade route optimization complete. Offering reduced tariff rates for states with trust score > 80.' },
    { state: 'WB', text: 'Kolkata ports expanding. Proposing trade corridor with TN for South-East resource flow optimization.' },
    { state: 'MP', text: 'Bhopal tech hub initiative launched. Requesting Tech transfers from KA. Counter-offer: 300 Food + 200 Water.' },
]

function generateMessage() {
    const msg = NEGOTIATION_MESSAGES[Math.floor(Math.random() * NEGOTIATION_MESSAGES.length)]
    return {
        id: Date.now() + Math.random(),
        state: msg.state,
        text: msg.text,
        time: new Date().toLocaleTimeString('en-IN', { hour12: false }),
    }
}

function generateInitialMessages(count = 8) {
    return Array.from({ length: count }, () => generateMessage())
}

export default function GovernorChat() {
    const [messages, setMessages] = useState(generateInitialMessages)
    const bodyRef = useRef(null)

    useEffect(() => {
        const interval = setInterval(() => {
            setMessages(prev => {
                const newMsgs = [...prev, generateMessage()]
                return newMsgs.slice(-50) // keep last 50
            })
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div className="panel zone-right" style={{ position: 'relative' }}>
            <div className="scanline-overlay" />
            <div className="panel-header">
                <span className="dot" style={{ background: '#a855f7', boxShadow: '0 0 8px #a855f7' }}></span>
                Agentic Governor Chat
                <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '9px' }}>
                    {messages.length} msgs
                </span>
            </div>
            <div className="panel-body" ref={bodyRef} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {messages.map((msg) => (
                    <div
                        className="chat-msg"
                        key={msg.id}
                        style={{ borderLeftColor: GOVERNOR_COLORS[msg.state] }}
                    >
                        <div className="chat-governor" style={{ color: GOVERNOR_COLORS[msg.state] }}>
                            {GOVERNOR_NAMES[msg.state]}
                            <span className="chat-timestamp">{msg.time}</span>
                        </div>
                        <div className="chat-text">{msg.text}</div>
                    </div>
                ))}

                {/* Typing indicator */}
                <div style={{
                    padding: '6px 10px',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '10px',
                    color: '#475569',
                    animation: 'glow-pulse 1.5s ease-in-out infinite',
                }}>
                    ● Governor is composing response...
                </div>
            </div>
        </div>
    )
}
