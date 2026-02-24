'use client'

import { useEffect, useRef, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/hooks/use-toast'
import { Spinner } from '@/components/ui/spinner'

export function AppEnhancements() {
  const [pendingCount, setPendingCount] = useState(0)
  const originalFetchRef = useRef<typeof fetch | null>(null)
  const originalUnboundRef = useRef<typeof fetch | null>(null)

  useEffect(() => {
    if (originalFetchRef.current) return
    originalUnboundRef.current = window.fetch
    originalFetchRef.current = window.fetch.bind(window) as typeof fetch

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      setPendingCount((c) => c + 1)
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
        setPendingCount((c) => Math.max(0, c - 1))
      }
    }

    return () => {
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
      {pendingCount > 0 && (
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
