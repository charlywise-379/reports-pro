'use client'
import { useState } from 'react'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import type { TutorialStep } from '../lib/tutorials'

// Modal de tutorial guiado, genérico y reutilizable por cualquier módulo de
// la plataforma. Solo necesita el contenido (`steps`) y una key de
// localStorage para recordar si el usuario ya lo vio o lo saltó.

export function hasSeenTutorial(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return true // si localStorage no está disponible, no insistimos con el tutorial
  }
}

export function markTutorialSeen(storageKey: string) {
  try {
    localStorage.setItem(storageKey, '1')
  } catch {
    // localStorage no disponible (modo privado, etc.) — no es crítico
  }
}

export default function TutorialModal({
  steps,
  storageKey,
  onClose,
}: {
  steps: TutorialStep[]
  storageKey: string
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const isLast = index === steps.length - 1
  const step = steps[index]

  const finish = () => {
    markTutorialSeen(storageKey)
    onClose()
  }

  // Nota: dashboard/page.tsx y onboarding/page.tsx (las dos páginas que
  // montan este modal) inyectan un <style>{`* { margin:0; padding:0 }`}</style>
  // global sin @layer. Por las reglas de CSS Cascade Layers, ese reset SIN capa
  // le gana a cualquier utilidad de Tailwind (que sí vive dentro de
  // @layer utilities) sin importar la especificidad — por eso cada clase de
  // padding/margin de este componente necesita el prefijo "!" (important),
  // que es lo único que revierte esa prioridad. Sin el "!", el modal se ve
  // sin aire alguno (fue un bug real, no solo un ajuste estético).
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center !p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={finish} />
      <div className="relative w-full max-w-lg bg-[#0E0E16] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <button
          onClick={finish}
          aria-label="Cerrar"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-gray-300 hover:text-white hover:bg-black/60 transition-colors flex items-center justify-center"
        >
          <X size={16} />
        </button>

        {step.image && (
          <div className="bg-[#060609] border-b border-white/10 h-64 flex items-center justify-center overflow-hidden">
            <img
              src={step.image}
              alt={step.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        <div className="!p-8">
          <div className="text-[11px] font-bold tracking-wider text-blue-400 !mb-3">
            PASO {index + 1} DE {steps.length}
          </div>
          <h2 className="text-lg font-black !mb-3 leading-snug">{step.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed !mb-8">{step.body}</p>

          <div className="flex items-center gap-1.5 !mb-7">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/15'}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <button onClick={finish} className="text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium">
              Saltar tutorial
            </button>
            <div className="flex items-center gap-3">
              {index > 0 && (
                <button
                  onClick={() => setIndex(i => i - 1)}
                  className="bg-white/5 border border-white/10 text-white font-bold !py-3 !px-4 rounded-xl transition-all hover:bg-white/10 flex items-center justify-center"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
              <button
                onClick={() => (isLast ? finish() : setIndex(i => i + 1))}
                className="bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold !py-3 !px-6 rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
              >
                {isLast ? 'Entendido' : 'Siguiente'}<ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
