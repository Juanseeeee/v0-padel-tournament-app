# Flujo de Generación y Validación de Llaves

Este documento detalla el proceso técnico para la generación de llaves (brackets) a partir de las posiciones finales de las zonas en un torneo, incluyendo los mecanismos de validación, auditoría cruzada y rollback automático.

## 1. Finalización de Zonas y Cálculo de Posiciones

Cuando una zona se marca como `finalizada`, el sistema calcula automáticamente las posiciones finales de las parejas en base a los resultados de sus partidos.
El criterio de desempate implementado (estándar de pádel) es:
1. Partidos ganados (Mayor a menor)
2. Diferencia de sets (Sets a favor - Sets en contra)
3. Diferencia de games (Games a favor - Games en contra)
4. Games a favor

Esto asegura que situaciones como empates en partidos ganados se resuelvan correctamente mediante la diferencia de sets o games. Las posiciones finales se guardan en la tabla `parejas_zona` en el campo `posicion_final`.

## 2. Generación de Llaves

La generación de llaves (`POST /api/admin/torneo/[id]/llaves/generar`) sigue este flujo:
1. **Validación de estado**: Se verifica que no existan llaves previas y que todas las zonas de la categoría estén cerradas (`estado = 'finalizada'`).
2. **Carga de configuración**: Se obtiene el número total de parejas inscritas y se busca la plantilla correspondiente en `lib/bracket-config.ts` (Soporta desde 3 hasta 35 parejas).
3. **Mapeo de Clasificados (Seeding)**: Se mapean las posiciones (ej. "1A" = 1ro de la Zona A) con los IDs reales de las parejas utilizando las posiciones finales calculadas en el paso anterior.
4. **Inserción de Partidos**: Se insertan los registros en la tabla `llaves` asignando `pareja1_id` y `pareja2_id` según el seeding de la plantilla.
5. **Conexión de Rondas**: Se establecen las relaciones `siguiente_llave_id` para que el sistema sepa automáticamente a qué partido avanza el ganador de cada llave.

## 3. Sistema de Validación y Control Automático (Auditoría Cruzada)

Para evitar discrepancias (ej. un 1ro de zona que aparece como 2do en las llaves), el sistema implementa una auditoría cruzada obligatoria.

### Auditoría Automática (Pre-Publicación)
Inmediatamente después de insertar las llaves en la base de datos, el endpoint de generación ejecuta la función `auditarLlaves()`. 
Este algoritmo:
- Reconstruye el mapa esperado de posiciones a partir de la tabla `parejas_zona`.
- Itera sobre cada registro insertado en `llaves` que tenga un seed definido (ej. `p1_seed = '2B'`).
- Compara el `pareja_id` insertado con el `pareja_id` que realmente finalizó en esa posición en la zona correspondiente.

### Rollback Automático
Si la función `auditarLlaves()` detecta una **inconsistencia crítica** (el ID insertado no coincide con el ID esperado), el sistema aborta la operación, ejecuta un `DELETE` de las llaves recién creadas (Rollback) y devuelve un error HTTP 400 al cliente, previniendo que se publiquen llaves corruptas.

## 4. Protocolo de Verificación Manual (Logs y Alertas)

El panel de administración incluye un botón de **Auditar Llaves**. 
Al accionarlo, se ejecuta la misma validación cruzada y se presenta un modal interactivo (Firma / Verificación del Administrador) que muestra:
- **Estado General**: "Auditoría Exitosa" o "Inconsistencias Críticas Detectadas".
- **Alertas Automáticas**: Lista detallada de cada discrepancia encontrada, indicando la llave, la posición afectada y qué pareja se esperaba versus cuál se encontró.
- **Logs de Auditoría**: Un volcado técnico detallado de cada paso de la verificación para rastreo de errores.

## 5. Testing

El sistema cuenta con una suite de pruebas unitarias y de integración (`scripts/test-bracket-configs.ts`) que valida la integridad de las plantillas de torneos desde 3 hasta 35 participantes. Las pruebas garantizan que:
- La suma de cupos de las zonas coincida con el total de parejas.
- Los 3ros puestos solo clasifiquen si provienen de zonas de 4 parejas.
- No existan seeds inválidos (ej. 4tos puestos) configurados por error.