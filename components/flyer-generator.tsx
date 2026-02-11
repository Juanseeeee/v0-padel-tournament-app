"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Download, ImageIcon } from "lucide-react"

interface FlyerData {
  nombreTorneo: string
  numeroFecha: number
  categoriaNombre: string
  fechaCalendario: string
  sede: string
  horaViernes: string
  horaSabado: string
}

export function FlyerGenerator({ data, open, onOpenChange }: { data: FlyerData; open: boolean; onOpenChange: (v: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (open && canvasRef.current) {
      renderFlyer()
    }
  }, [open, data])

  function renderFlyer() {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = 1080
    const H = 1350
    canvas.width = W
    canvas.height = H

    // Background gradient - dark sporty theme
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
    bgGrad.addColorStop(0, "#0a0a0a")
    bgGrad.addColorStop(0.4, "#111827")
    bgGrad.addColorStop(1, "#0a0a0a")
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // Diagonal accent stripes
    ctx.save()
    ctx.globalAlpha = 0.06
    for (let i = -H; i < W + H; i += 60) {
      ctx.fillStyle = "#f59e0b"
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + 30, 0)
      ctx.lineTo(i + 30 + H, H)
      ctx.lineTo(i + H, H)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()

    // Top accent bar
    const accentGrad = ctx.createLinearGradient(0, 0, W, 0)
    accentGrad.addColorStop(0, "#f59e0b")
    accentGrad.addColorStop(0.5, "#f97316")
    accentGrad.addColorStop(1, "#ef4444")
    ctx.fillStyle = accentGrad
    ctx.fillRect(0, 0, W, 8)

    // Glow circle behind main text
    const glowGrad = ctx.createRadialGradient(W / 2, 450, 50, W / 2, 450, 400)
    glowGrad.addColorStop(0, "rgba(245, 158, 11, 0.15)")
    glowGrad.addColorStop(1, "rgba(245, 158, 11, 0)")
    ctx.fillStyle = glowGrad
    ctx.fillRect(0, 100, W, 700)

    // "TORNEO ANUAL" header
    ctx.textAlign = "center"
    ctx.fillStyle = "#f59e0b"
    ctx.font = "bold 36px 'Arial', sans-serif"
    ctx.letterSpacing = "12px"
    ctx.fillText("TORNEO ANUAL", W / 2, 100)
    ctx.letterSpacing = "0px"

    // League name
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 60px 'Arial', sans-serif"
    ctx.fillText("LIGA DE PADEL", W / 2, 175)

    // Separator line
    const lineGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0)
    lineGrad.addColorStop(0, "rgba(245, 158, 11, 0)")
    lineGrad.addColorStop(0.5, "rgba(245, 158, 11, 1)")
    lineGrad.addColorStop(1, "rgba(245, 158, 11, 0)")
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2 - 200, 210)
    ctx.lineTo(W / 2 + 200, 210)
    ctx.stroke()

    // FECHA number - big
    ctx.fillStyle = "rgba(245, 158, 11, 0.08)"
    ctx.font = "bold 350px 'Arial', sans-serif"
    ctx.fillText(String(data.numeroFecha), W / 2, 520)

    ctx.fillStyle = "#f59e0b"
    ctx.font = "bold 44px 'Arial', sans-serif"
    ctx.fillText("FECHA", W / 2, 330)

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 160px 'Arial', sans-serif"
    ctx.fillText(String(data.numeroFecha), W / 2, 490)

    // Category badge
    const catText = data.categoriaNombre.toUpperCase()
    ctx.font = "bold 32px 'Arial', sans-serif"
    const catWidth = ctx.measureText(catText).width + 60
    const catX = (W - catWidth) / 2
    const catY = 540

    // Badge background
    const badgeGrad = ctx.createLinearGradient(catX, catY, catX + catWidth, catY + 50)
    badgeGrad.addColorStop(0, "#f59e0b")
    badgeGrad.addColorStop(1, "#f97316")
    roundRect(ctx, catX, catY, catWidth, 50, 25)
    ctx.fillStyle = badgeGrad
    ctx.fill()

    ctx.fillStyle = "#000000"
    ctx.font = "bold 28px 'Arial', sans-serif"
    ctx.fillText(catText, W / 2, catY + 35)

    // Date formatted
    let dateFormatted = ""
    if (data.fechaCalendario) {
      const d = new Date(data.fechaCalendario)
      dateFormatted = d.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1)
    }

    // Info cards section
    const cardY = 660
    const cardW = W - 120
    const cardX = 60
    const cardH = 420
    
    // Card background
    roundRect(ctx, cardX, cardY, cardW, cardH, 20)
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"
    ctx.fill()
    ctx.strokeStyle = "rgba(245, 158, 11, 0.3)"
    ctx.lineWidth = 1
    ctx.stroke()

    // Date info
    ctx.fillStyle = "#f59e0b"
    ctx.font = "bold 22px 'Arial', sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("FECHA", cardX + 40, cardY + 55)
    ctx.fillStyle = "#ffffff"
    ctx.font = "28px 'Arial', sans-serif"
    ctx.fillText(dateFormatted || "A confirmar", cardX + 40, cardY + 95)

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cardX + 40, cardY + 125)
    ctx.lineTo(cardX + cardW - 40, cardY + 125)
    ctx.stroke()

    // Venue
    ctx.fillStyle = "#f59e0b"
    ctx.font = "bold 22px 'Arial', sans-serif"
    ctx.fillText("SEDE", cardX + 40, cardY + 170)
    ctx.fillStyle = "#ffffff"
    ctx.font = "28px 'Arial', sans-serif"
    ctx.fillText(data.sede || "A confirmar", cardX + 40, cardY + 210)

    // Divider
    ctx.beginPath()
    ctx.moveTo(cardX + 40, cardY + 240)
    ctx.lineTo(cardX + cardW - 40, cardY + 240)
    ctx.stroke()

    // Schedule
    ctx.fillStyle = "#f59e0b"
    ctx.font = "bold 22px 'Arial', sans-serif"
    ctx.fillText("HORARIOS", cardX + 40, cardY + 285)

    if (data.horaViernes) {
      ctx.fillStyle = "#ffffff"
      ctx.font = "26px 'Arial', sans-serif"
      ctx.fillText(`Viernes: ${data.horaViernes} hs`, cardX + 40, cardY + 325)
    }
    if (data.horaSabado) {
      ctx.fillStyle = "#ffffff"
      ctx.font = "26px 'Arial', sans-serif"
      ctx.fillText(`Sabado: ${data.horaSabado} hs`, cardX + 40, cardY + 365)
    }

    // Bottom accent
    const bottomGrad = ctx.createLinearGradient(0, H - 200, 0, H)
    bottomGrad.addColorStop(0, "rgba(245, 158, 11, 0)")
    bottomGrad.addColorStop(1, "rgba(245, 158, 11, 0.1)")
    ctx.fillStyle = bottomGrad
    ctx.fillRect(0, H - 200, W, 200)

    // Bottom bar
    ctx.fillStyle = accentGrad
    ctx.fillRect(0, H - 8, W, 8)

    // Footer text
    ctx.textAlign = "center"
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
    ctx.font = "18px 'Arial', sans-serif"
    ctx.fillText("INSCRIPCIONES ABIERTAS", W / 2, H - 50)

    setRendered(true)
  }

  function downloadFlyer() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `flyer-fecha-${data.numeroFecha}-${data.categoriaNombre.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Flyer del Torneo
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center overflow-hidden rounded-lg bg-muted/30">
          <canvas
            ref={canvasRef}
            className="w-full max-h-[500px] object-contain"
            style={{ imageRendering: "auto" }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={downloadFlyer} disabled={!rendered} className="gap-2">
            <Download className="h-4 w-4" />
            Descargar PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
