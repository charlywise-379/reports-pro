// Fondo de hexágonos flotantes de toda la página (en Figma: "Fondo HEXA",
// hexágonos de contorno morado repartidos a lo largo del layout). Cada uno
// deriva lentamente (translate + giro) con CSS puro; posiciones fijas y
// deterministas para no romper la hidratación. Respeta reduced-motion.
const PURPLE = '#AD96F5'

// [x% , y% , tamaño px, trazo px, opacidad, duración s, retraso s]
const HEXES: [number, number, number, number, number, number, number][] = [
  [2, 3, 120, 3, 0.55, 70, 0], [9, 8, 60, 1.2, 0.5, 55, -10], [4, 14, 90, 1.2, 0.4, 80, -30],
  [92, 6, 150, 3, 0.5, 75, -20], [86, 12, 70, 1.2, 0.5, 60, -5], [96, 19, 100, 1.2, 0.4, 90, -40],
  [3, 25, 140, 1.2, 0.4, 85, -15], [10, 31, 70, 3, 0.5, 65, -25], [90, 30, 110, 3, 0.45, 72, -35],
  [95, 38, 60, 1.2, 0.5, 58, -8], [2, 44, 100, 3, 0.45, 78, -18], [8, 50, 60, 1.2, 0.5, 62, -45],
  [93, 47, 130, 1.2, 0.4, 88, -12], [88, 55, 80, 3, 0.5, 68, -28], [4, 60, 150, 1.2, 0.35, 92, -50],
  [96, 63, 90, 3, 0.45, 74, -22], [7, 68, 80, 1.2, 0.5, 60, -6], [91, 71, 120, 1.2, 0.4, 84, -38],
  [3, 76, 110, 3, 0.5, 70, -16], [94, 79, 70, 1.2, 0.5, 56, -32], [10, 83, 130, 1.2, 0.4, 86, -42],
  [89, 87, 100, 3, 0.45, 76, -14], [2, 90, 70, 1.2, 0.5, 64, -26], [95, 93, 140, 1.2, 0.4, 90, -48],
  [8, 96, 90, 3, 0.5, 66, -4], [50, 40, 70, 1.2, 0.18, 95, -20], [46, 74, 90, 1.2, 0.16, 100, -33],
]

const HEX_PATH = 'M50 2 L93 26 L93 74 L50 98 L7 74 L7 26 Z'

export default function FloatingHexes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: -1 }}>
      <style>{`
        @keyframes hexDrift {
          0%   { transform: translate3d(0,0,0) rotate(0deg); }
          50%  { transform: translate3d(24px,-34px,0) rotate(12deg); }
          100% { transform: translate3d(-18px,26px,0) rotate(-8deg); }
        }
        @media (prefers-reduced-motion: reduce) { .hexf { animation: none !important; } }
      `}</style>
      {HEXES.map(([x, y, size, stroke, op, dur, delay], i) => (
        <svg
          key={i}
          className="hexf absolute"
          viewBox="0 0 100 100"
          width={size}
          height={size}
          style={{
            left: `${x}%`, top: `${y}%`, opacity: op,
            marginLeft: -size / 2, marginTop: -size / 2,
            animation: `hexDrift ${dur}s ease-in-out ${delay}s infinite alternate`,
            willChange: 'transform',
          }}
        >
          <path d={HEX_PATH} fill="none" stroke={PURPLE} strokeWidth={stroke * (100 / size)} strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  )
}
