import React, { useState, useEffect, useRef } from 'react'

const STATES = ['PB', 'MH', 'TN', 'KA', 'GJ', 'UP', 'BR', 'WB', 'RJ', 'MP']
const RESOURCES = ['Water', 'Energy', 'Food', 'Tech']

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateOrder() {
    const from = STATES[Math.floor(Math.random() * STATES.length)]
    let to = from
    while (to === from) to = STATES[Math.floor(Math.random() * STATES.length)]

    const offerRes = RESOURCES[Math.floor(Math.random() * RESOURCES.length)]
    let reqRes = offerRes
    while (reqRes === offerRes) reqRes = RESOURCES[Math.floor(Math.random() * RESOURCES.length)]

    const isBid = Math.random() > 0.5
    const offerAmt = randomInt(100, 2000)
    const reqAmt = randomInt(100, 2000)

    return {
        id: Date.now() + Math.random(),
        type: isBid ? 'BID' : 'ASK',
        from,
        to,
        offer: `${offerAmt} ${offerRes}`,
        request: `${reqAmt} ${reqRes}`,
        offerAmt,
        reqAmt,
        ratio: (reqAmt / offerAmt).toFixed(2),
        time: new Date().toLocaleTimeString('en-IN', { hour12: false }),
    }
}

// Generate initial orders
function generateInitialOrders(count = 30) {
    return Array.from({ length: count }, () => generateOrder())
}

export default function FinOpsOrderBook() {
    const [orders, setOrders] = useState(generateInitialOrders)
    const bodyRef = useRef(null)

    useEffect(() => {
        const interval = setInterval(() => {
            setOrders(prev => {
                const newOrders = [generateOrder(), ...prev]
                return newOrders.slice(0, 80) // cap at 80 orders
            })
        }, 1500)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = 0
        }
    }, [orders])

    return (
        <div className="panel zone-left">
            <div className="panel-header">
                <span className="dot"></span>
                FinOps Order Book
                <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '9px' }}>LIVE</span>
            </div>

            {/* Column headers */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '40px 35px 1fr',
                gap: '6px',
                padding: '4px 8px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '9px',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderBottom: '1px solid rgba(71,85,105,0.3)',
                flexShrink: 0,
            }}>
                <span>From</span>
                <span>Type</span>
                <span>Order Details</span>
            </div>

            <div className="panel-body" ref={bodyRef}>
                {orders.map((order) => (
                    <div className="order-row" key={order.id}>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{order.from}</span>
                        <span className={`order-tag ${order.type === 'BID' ? 'bid' : 'ask'}`}>
                            {order.type}
                        </span>
                        <span className={order.type === 'BID' ? 'order-bid' : 'order-ask'}>
                            {order.from} offers {order.offer} for {order.request}
                            <span style={{ color: '#475569', marginLeft: '6px' }}>
                                [{order.ratio}x]
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
