import React, { useState, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api'

/* ── State Data ────────────────────────────────────────────────── */
const STATES_DATA = {
    PB: { name: 'Punjab', lat: 31.1471, lng: 75.3412, color: '#22c55e', water: 8500, energy: 12000, food: 9800, tech: 3200, gdp: 48.2, welfare: 55.4 },
    MH: { name: 'Maharashtra', lat: 19.7515, lng: 75.7139, color: '#3b82f6', water: 3200, energy: 9500, food: 4200, tech: 15700, gdp: 18.9, welfare: 32.1 },
    TN: { name: 'Tamil Nadu', lat: 11.1271, lng: 78.6569, color: '#f97316', water: 1800, energy: 3700, food: 2300, tech: 18000, gdp: 9.6, welfare: 37.4 },
    KA: { name: 'Karnataka', lat: 15.3173, lng: 75.7139, color: '#10b981', water: 4500, energy: 3000, food: 5300, tech: 17200, gdp: 8.8, welfare: 60.0 },
    GJ: { name: 'Gujarat', lat: 22.2587, lng: 71.1924, color: '#a855f7', water: 2100, energy: 10600, food: 3100, tech: 14000, gdp: 26.1, welfare: 28.5 },
    UP: { name: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, color: '#ef4444', water: 1200, energy: 2800, food: 1500, tech: 3600, gdp: 1.4, welfare: 12.0 },
    BR: { name: 'Bihar', lat: 25.0961, lng: 85.3131, color: '#ec4899', water: 2800, energy: 3900, food: 1800, tech: 3500, gdp: 3.1, welfare: 18.3 },
    WB: { name: 'West Bengal', lat: 22.9868, lng: 87.8550, color: '#14b8a6', water: 5200, energy: 4400, food: 2200, tech: 700, gdp: 0.2, welfare: 58.9 },
    RJ: { name: 'Rajasthan', lat: 27.0238, lng: 74.2179, color: '#f59e0b', water: 800, energy: 10800, food: 1200, tech: 2000, gdp: 6.5, welfare: 15.2 },
    MP: { name: 'Madhya Pradesh', lat: 22.9734, lng: 78.6569, color: '#6366f1', water: 1500, energy: 3400, food: 2800, tech: 5800, gdp: 3.9, welfare: 22.1 },
}

/* ── Map Configuration ─────────────────────────────────────────── */
const MAP_CENTER = { lat: 22.5, lng: 79.5 }
const MAP_ZOOM = 5

const MAP_STYLES = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#94a3b8', visibility: 'on', weight: 1 }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#64748b', visibility: 'on', weight: 2 }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d5e0' }] },
    { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

const MAP_OPTIONS = {
    styles: MAP_STYLES,
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: false,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false,
    minZoom: 4,
    maxZoom: 9,
    restriction: {
        latLngBounds: { north: 37, south: 6, west: 65, east: 100 },
        strictBounds: true,
    },
}

/* ── Welfare Color ─────────────────────────────────────────────── */
function welfareColor(welfare) {
    if (welfare >= 50) return '#10b981'
    if (welfare >= 30) return '#f59e0b'
    return '#ef4444'
}

function welfareLabel(welfare) {
    if (welfare >= 50) return 'Healthy'
    if (welfare >= 30) return 'At Risk'
    return 'Critical'
}

/* ── State Info Panel (Right Side) ─────────────────────────────── */
function StateInfoPanel({ state, onClose }) {
    if (!state) return null
    const data = STATES_DATA[state]
    const wColor = welfareColor(data.welfare)

    return (
        <aside className="absolute right-6 top-6 bottom-6 w-80 glass-panel rounded-2xl shadow-lg flex flex-col z-20">
            <div className="p-5 border-b border-slate-200/50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                    {data.name}
                </h3>
                <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-area">
                {/* Welfare */}
                <div className="p-4 rounded-xl border border-slate-100 bg-white/60">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Welfare Index</p>
                    <div className="flex items-end gap-3">
                        <span className="text-3xl font-bold" style={{ color: wColor }}>{data.welfare}%</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full mb-1" style={{ backgroundColor: wColor + '20', color: wColor }}>{welfareLabel(data.welfare)}</span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${data.welfare}%`, backgroundColor: wColor }} />
                    </div>
                </div>

                {/* GDP */}
                <div className="p-4 rounded-xl border border-slate-100 bg-white/60">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">GDP Score</p>
                    <span className="text-2xl font-bold text-slate-800">{data.gdp}</span>
                </div>

                {/* Resources */}
                <div className="p-4 rounded-xl border border-slate-100 bg-white/60 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resources</p>
                    {[
                        { label: 'Water', value: data.water, max: 15000, color: '#06b6d4', icon: 'water_drop' },
                        { label: 'Energy', value: data.energy, max: 15000, color: '#f59e0b', icon: 'bolt' },
                        { label: 'Food', value: data.food, max: 15000, color: '#10b981', icon: 'nutrition' },
                        { label: 'Tech', value: data.tech, max: 12000, color: '#6366f1', icon: 'memory' },
                    ].map(res => (
                        <div key={res.label}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                                    <span className="material-symbols-outlined text-[14px]" style={{ color: res.color }}>{res.icon}</span>
                                    {res.label}
                                </span>
                                <span className="text-xs font-semibold text-slate-700">{res.value.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (res.value / res.max) * 100)}%`, backgroundColor: res.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    )
}

/* ── Legend Panel (Left Side) ──────────────────────────────────── */
function LegendPanel({ onSelectState }) {
    return (
        <aside className="absolute left-6 top-6 w-72 glass-panel rounded-2xl shadow-lg z-20">
            <div className="p-4 border-b border-slate-200/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-[#137fec] text-[18px]">pin_drop</span>
                    State Governors
                </h3>
            </div>
            <div className="p-3 space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto scroll-area">
                {Object.entries(STATES_DATA).map(([code, data]) => {
                    const wColor = welfareColor(data.welfare)
                    return (
                        <button
                            key={code}
                            onClick={() => onSelectState(code)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/80 transition-all text-left group"
                        >
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 truncate">{data.name}</p>
                                <p className="text-[11px] text-slate-400">{code} · GDP {data.gdp}</p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: wColor + '15', color: wColor }}>
                                {data.welfare}%
                            </span>
                        </button>
                    )
                })}
            </div>
        </aside>
    )
}

/* ── Main India Map Tab ────────────────────────────────────────── */
export default function IndiaMapTab({ tick }) {
    const [selectedState, setSelectedState] = useState(null)
    const [activeInfoWindow, setActiveInfoWindow] = useState(null)
    const mapRef = useRef(null)

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8', // Demo key
    })

    const onMapLoad = useCallback((map) => {
        mapRef.current = map
    }, [])

    const onMarkerClick = useCallback((stateCode) => {
        setSelectedState(stateCode)
        setActiveInfoWindow(stateCode)
        const data = STATES_DATA[stateCode]
        if (mapRef.current) {
            mapRef.current.panTo({ lat: data.lat, lng: data.lng })
        }
    }, [])

    if (loadError) {
        return (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-50">
                <div className="glass-panel rounded-2xl p-8 text-center max-w-md">
                    <span className="material-symbols-outlined text-[48px] text-slate-300 mb-4">map</span>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Google Maps Unavailable</h3>
                    <p className="text-sm text-slate-500">
                        Could not load Google Maps API. Please check your API key configuration and try again.
                    </p>
                </div>
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-50">
                <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-[#137fec] rounded-full animate-spin" />
                    <span className="text-sm font-medium">Loading India Map...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full h-full">
            <GoogleMap
                mapContainerClassName="gmap-container"
                center={MAP_CENTER}
                zoom={MAP_ZOOM}
                options={MAP_OPTIONS}
                onLoad={onMapLoad}
                onClick={() => { setActiveInfoWindow(null) }}
            >
                {Object.entries(STATES_DATA).map(([code, data]) => {
                    const wColor = welfareColor(data.welfare)
                    return (
                        <React.Fragment key={code}>
                            {/* Welfare radius circle */}
                            <Circle
                                center={{ lat: data.lat, lng: data.lng }}
                                radius={data.welfare * 1500}
                                options={{
                                    fillColor: wColor,
                                    fillOpacity: 0.12,
                                    strokeColor: wColor,
                                    strokeOpacity: 0.3,
                                    strokeWeight: 1,
                                    clickable: false,
                                }}
                            />

                            {/* State marker */}
                            <Marker
                                position={{ lat: data.lat, lng: data.lng }}
                                onClick={() => onMarkerClick(code)}
                                icon={{
                                    path: 'M 0, 0 m -8, 0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0',
                                    fillColor: data.color,
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 3,
                                    scale: 1.2,
                                }}
                                label={{
                                    text: code,
                                    color: '#1e293b',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    fontFamily: 'Inter',
                                    className: 'mt-5',
                                }}
                            />

                            {/* Info window on click */}
                            {activeInfoWindow === code && (
                                <InfoWindow
                                    position={{ lat: data.lat, lng: data.lng }}
                                    onCloseClick={() => setActiveInfoWindow(null)}
                                    options={{ pixelOffset: new window.google.maps.Size(0, -12) }}
                                >
                                    <div className="map-info-window">
                                        <h3 style={{ color: data.color }}>{data.name}</h3>
                                        <div className="stat-row"><span className="label">GDP</span><span>{data.gdp}</span></div>
                                        <div className="stat-row"><span className="label">Welfare</span><span style={{ color: wColor, fontWeight: 600 }}>{data.welfare}%</span></div>
                                        <div className="stat-row"><span className="label">Water</span><span>{data.water.toLocaleString()}</span></div>
                                        <div className="stat-row"><span className="label">Energy</span><span>{data.energy.toLocaleString()}</span></div>
                                        <div className="stat-row"><span className="label">Food</span><span>{data.food.toLocaleString()}</span></div>
                                        <div className="stat-row"><span className="label">Tech</span><span>{data.tech.toLocaleString()}</span></div>
                                    </div>
                                </InfoWindow>
                            )}
                        </React.Fragment>
                    )
                })}
            </GoogleMap>

            {/* Legend */}
            <LegendPanel onSelectState={onMarkerClick} />

            {/* State Info Panel */}
            <StateInfoPanel state={selectedState} onClose={() => setSelectedState(null)} />
        </div>
    )
}
