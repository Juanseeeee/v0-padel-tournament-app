'use client'

import { useEffect, useRef, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/hooks/use-toast'
import { Spinner } from '@/components/ui/spinner'

// Sólo mostramos el overlay bloqueante para requests que MUTAN datos
// (POST/PUT/PATCH/DELETE). Los GET de fondo (revalidaciones de SWR e
// infinite-scroll disparadas al scrollear) no deben bloquear la pantalla.
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
// Retardo antes de mostrar el overlay: si la mutación termina antes, no parpadea.
const OVERLAY_DELAY_MS = 350

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  const m = init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
  return (m || 'GET').toUpperCase()
}

export function AppEnhancements() {
  const [showOverlay, setShowOverlay] = useState(false)
  const originalFetchRef = useRef<typeof fetch | null>(null)
  const originalUnboundRef = useRef<typeof fetch | null>(null)
  const pendingMutationsRef = useRef(0)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (originalFetchRef.current) return
    originalUnboundRef.current = window.fetch
    originalFetchRef.current = window.fetch.bind(window) as typeof fetch

    const onMutationStart = () => {
      pendingMutationsRef.current += 1
      if (pendingMutationsRef.current === 1 && showTimerRef.current === null) {
        showTimerRef.current = setTimeout(() => {
          showTimerRef.current = null
          if (pendingMutationsRef.current > 0) setShowOverlay(true)
        }, OVERLAY_DELAY_MS)
      }
    }

    const onMutationEnd = () => {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1)
      if (pendingMutationsRef.current === 0) {
        if (showTimerRef.current !== null) {
          clearTimeout(showTimerRef.current)
          showTimerRef.current = null
        }
        setShowOverlay(false)
      }
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const isMutation = MUTATING_METHODS.has(getMethod(input, init))
      if (isMutation) onMutationStart()
      try {
        const res = await originalFetchRef.current!(input, init)
        if (!res.ok) {
          toast({
            title: 'Error',
            description: `Falló la operación (${res.status})`,
            variant: 'destructive',
          })
        }
        return res
      } catch (err: any) {
        toast({
          title: 'Error de red',
          description: err?.message || 'No se pudo completar la operación',
          variant: 'destructive',
        })
        throw err
      } finally {
        if (isMutation) onMutationEnd()
      }
    }

    return () => {
      if (showTimerRef.current !== null) {
        clearTimeout(showTimerRef.current)
        showTimerRef.current = null
      }
      if (originalUnboundRef.current) {
        window.fetch = originalUnboundRef.current
        originalUnboundRef.current = null
        originalFetchRef.current = null
      }
    }
  }, [])

  return (
    <>
      <Toaster />
      {showOverlay && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-card/90 px-4 py-3 border">
            <Spinner className="size-6" />
            <span className="text-sm text-muted-foreground">Cargando…</span>
          </div>
        </div>
      )}
    </>
  )
}
