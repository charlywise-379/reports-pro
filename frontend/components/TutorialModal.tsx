'use client'
import { useState } from 'react'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={finish} />
      <div className="relative w-full max-w-md bg-[#0B0B12] border border-white/10 rounded-3xl p-8">
        <button
          onClick={finish}
          aria-label="Cerrar"
          className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mb-5">
          <Sparkles size={20} className="text-white" />
        </div>

        <h2 className="text-xl font-black mb-2 pr-6">{step.title}</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">{step.body}</p>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/15'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button onClick={finish} className="text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium">
            Saltar tutorial
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex(i => i - 1)}
                className="bg-white/5 border border-white/10 text-white font-bold py-2.5 px-3.5 rounded-xl transition-all hover:bg-white/10 flex items-center justify-center"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setIndex(i => i + 1))}
              className="bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2 text-sm"
            >
              {isLast ? 'Entendido' : 'Siguiente'}<ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
