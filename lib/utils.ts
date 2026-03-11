import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateOnly(input: unknown): Date {
  // If it's already a Date, normalize to local Y/M/D
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate())
  }
  // Coerce to string safely
  const raw = input == null ? "" : String(input)
  const s = raw.slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    return new Date(y, mo - 1, d)
  }
  // Fallback: try constructing Date and normalize to local Y/M/D
  const d = new Date(raw)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Traduce errores técnicos a mensajes amigables para el usuario.
 * @param error El error técnico (objeto, string o desconocido).
 * @returns Un mensaje amigable en español.
 */
export function getFriendlyError(error: unknown): string {
  let message = "Ha ocurrido un error inesperado. Por favor, intenta nuevamente.";

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null && "error" in error) {
    message = String((error as any).error);
  }

  // Normalizar mensaje para búsqueda insensible a mayúsculas/minúsculas
  const lowerMsg = message.toLowerCase();

  // Mapeo de errores técnicos a amigables
  if (lowerMsg.includes("generar zonas") && lowerMsg.includes("finalizado")) {
    return "No se pueden generar zonas en un torneo finalizado. Si necesitas realizar cambios, primero debes reactivar el torneo o eliminar las zonas existentes.";
  }
  
  if (lowerMsg.includes("generar zonas") && (lowerMsg.includes("ya existen") || lowerMsg.includes("duplicate") || lowerMsg.includes("creadas"))) {
    return "No se pueden volver a generar las zonas porque ya fueron creadas anteriormente. Si necesitas modificarlas, por favor elimina las zonas actuales primero desde el panel de administración.";
  }

  if (lowerMsg.includes("mover parejas") && lowerMsg.includes("diferentes fases")) {
    return "No se pueden mover parejas entre diferentes fases del torneo (ej. de Octavos a Cuartos). Solo se permite intercambiar parejas dentro de la misma ronda.";
  }

  if (lowerMsg.includes("modificar partidos") && lowerMsg.includes("jugados")) {
    return "No se pueden modificar partidos que ya han sido jugados o finalizados. Debes restablecer el resultado del partido antes de realizar cambios.";
  }

  if (lowerMsg.includes("faltan datos")) {
    return "Faltan datos necesarios para completar la operación. Por favor, verifica la información e intenta nuevamente.";
  }

  if (lowerMsg.includes("no encontradas") || lowerMsg.includes("not found")) {
    return "No se encontró la información solicitada. Es posible que el recurso haya sido eliminado o no exista.";
  }

  if (lowerMsg.includes("network") || lowerMsg.includes("conexión")) {
    return "Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.";
  }

  // Si el mensaje técnico es muy críptico (ej. códigos SQL), devolver algo genérico pero útil
  if (lowerMsg.includes("sql") || lowerMsg.includes("database") || lowerMsg.includes("constraint")) {
    return "Ocurrió un problema al procesar los datos. Por favor, contacta al soporte técnico si el problema persiste.";
  }

  return message;
}
