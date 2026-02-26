import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'

/* ── Indian state approximate positions (normalized to -3..3 range) ── */
const STATE_POSITIONS = {
    PB: { pos: [-0.8, 2.5, 0], name: 'Punjab', color: '#22c55e' },
    RJ: { pos: [-1.5, 1.2, 0], name: 'Rajasthan', color: '#f59e0b' },
    GJ: { pos: [-2.2, 0.2, 0], name: 'Gujarat', color: '#3b82f6' },
    MP: { pos: [-0.3, 0.3, 0], name: 'M.Pradesh', color: '#a855f7' },
    UP: { pos: [0.4, 1.8, 0], name: 'U.Pradesh', color: '#ef4444' },
    BR: { pos: [1.5, 1.3, 0], name: 'Bihar', color: '#ec4899' },
    WB: { pos: [2.2, 0.8, 0], name: 'W.Bengal', color: '#14b8a6' },
    MH: { pos: [-1.2, -0.7, 0], name: 'Maharashtra', color: '#f97316' },
    KA: { pos: [-0.8, -1.8, 0], name: 'Karnataka', color: '#06b6d4' },
    TN: { pos: [0.0, -2.7, 0], name: 'Tamil Nadu', color: '#8b5cf6' },
}

/* ── Trade routes (animated lines between states) ── */
const TRADE_ROUTES = [
    ['PB', 'UP'], ['MH', 'GJ'], ['TN', 'KA'], ['WB', 'BR'],
    ['RJ', 'MP'], ['UP', 'BR'], ['MH', 'KA'], ['GJ', 'RJ'],
    ['MP', 'UP'], ['TN', 'MH'], ['WB', 'UP'], ['KA', 'GJ'],
]

/* ── Animated State Node ── */
function StateNode({ position, name, color }) {
    const meshRef = useRef()
    const glowRef = useRef()

    useFrame((state) => {
        const t = state.clock.elapsedTime
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0]) * 0.08
        }
        if (glowRef.current) {
            glowRef.current.scale.setScalar(1 + Math.sin(t * 2 + position[0] * 2) * 0.15)
        }
    })

    return (
        <group>
            {/* Glow sphere */}
            <mesh ref={glowRef} position={position}>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.15} />
            </mesh>
            {/* Core sphere */}
            <mesh ref={meshRef} position={position}>
                <sphereGeometry args={[0.12, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.8}
                    metalness={0.3}
                    roughness={0.4}
                />
            </mesh>
            {/* Label */}
            <Text
                position={[position[0], position[1] - 0.3, position[2]]}
                fontSize={0.14}
                color={color}
                anchorX="center"
                anchorY="top"
                font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbX2o-flEEny0FPpRoaY4OP3M4.woff2"
                outlineWidth={0.01}
                outlineColor="#000000"
            >
                {name}
            </Text>
        </group>
    )
}

/* ── Animated Trade Line ── */
function TradeLine({ from, to }) {
    const materialRef = useRef()

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.dashOffset -= 0.02
        }
    })

    const points = useMemo(() => {
        const start = new THREE.Vector3(...from)
        const end = new THREE.Vector3(...to)
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        mid.z = 0.5 + Math.random() * 0.3
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
        return curve.getPoints(30)
    }, [from, to])

    return (
        <Line
            points={points}
            color="#38bdf8"
            lineWidth={1}
            transparent
            opacity={0.35}
            dashed
            dashSize={0.15}
            dashScale={1}
            gapSize={0.1}
        />
    )
}

/* ── Background Grid ── */
function BackgroundGrid() {
    return (
        <gridHelper
            args={[12, 24, '#1e3a5f', '#0f1d30']}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -0.5]}
        />
    )
}

/* ── Floating Particles ── */
function Particles() {
    const count = 200
    const meshRef = useRef()

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10
            pos[i * 3 + 2] = (Math.random() - 0.5) * 4
        }
        return pos
    }, [])

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.02
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.01
        }
    })

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.03} color="#38bdf8" transparent opacity={0.4} sizeAttenuation />
        </points>
    )
}

/* ── Main TradeMap Component ── */
export default function TradeMap() {
    return (
        <Canvas
            camera={{ position: [0, 0, 6], fov: 50 }}
            style={{ background: 'transparent' }}
            gl={{ antialias: true, alpha: true }}
        >
            <color attach="background" args={['#080c16']} />
            <ambientLight intensity={0.4} />
            <pointLight position={[5, 5, 5]} intensity={0.8} color="#38bdf8" />
            <pointLight position={[-5, -5, 3]} intensity={0.4} color="#a855f7" />

            <BackgroundGrid />
            <Particles />

            {/* State Nodes */}
            {Object.entries(STATE_POSITIONS).map(([code, data]) => (
                <StateNode key={code} position={data.pos} name={data.name} color={data.color} />
            ))}

            {/* Trade Lines */}
            {TRADE_ROUTES.map(([fromCode, toCode], i) => (
                <TradeLine
                    key={i}
                    from={STATE_POSITIONS[fromCode].pos}
                    to={STATE_POSITIONS[toCode].pos}
                />
            ))}

            <OrbitControls
                enablePan={false}
                enableZoom={true}
                minDistance={3}
                maxDistance={10}
                autoRotate
                autoRotateSpeed={0.5}
                target={[0, 0, 0]}
            />
        </Canvas>
    )
}
