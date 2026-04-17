import { BRACKET_CONFIGS, ZONA_LETTERS } from '../lib/bracket-config';

function runTests() {
  let hasErrors = false;
  console.log("Iniciando validación de BRACKET_CONFIGS...");

  for (const [totalStr, config] of Object.entries(BRACKET_CONFIGS)) {
    const total = parseInt(totalStr);
    
    // Test 1: Zonas suman el total de parejas
    const sumZonas = config.zonas.reduce((acc, val) => acc + val, 0);
    if (sumZonas !== total) {
      console.error(`❌ ERROR [${total} parejas]: La suma de las zonas (${sumZonas}) no coincide con el total esperado (${total}). Zonas: [${config.zonas.join(', ')}]`);
      hasErrors = true;
    }

    // Test 2: Ningún 3ro (3X) clasifica si la zona X tiene solo 3 parejas
    config.bracket.forEach((match, idx) => {
      [match.p1, match.p2].forEach(p => {
        if (p && p.startsWith('3')) {
          const letter = p.charAt(1);
          const zIndex = ZONA_LETTERS.indexOf(letter);
          if (zIndex !== -1 && config.zonas[zIndex] !== 4) {
            console.error(`❌ ERROR [${total} parejas]: El slot '${p}' está configurado en la llave (ronda: ${match.ronda}), pero la Zona ${letter} solo tiene ${config.zonas[zIndex]} parejas. ¡Los 3ros no clasifican en zonas de 3!`);
            hasErrors = true;
          }
        }
      });
    });
    
    // Test 3: Ningún 4to (4X) clasifica (nunca debería pasar en este sistema)
    config.bracket.forEach((match) => {
      [match.p1, match.p2].forEach(p => {
        if (p && p.startsWith('4')) {
          console.error(`❌ ERROR [${total} parejas]: El slot '${p}' es inválido. El sistema no clasifica 4tos lugares.`);
          hasErrors = true;
        }
      });
    });
  }

  if (hasErrors) {
    console.error("\n❌ Se encontraron errores en la configuración de las llaves. Corregir antes de usar en producción.");
    process.exit(1);
  } else {
    console.log("\n✅ Todos los tests pasaron exitosamente. Las configuraciones de llaves son consistentes con las zonas.");
    process.exit(0);
  }
}

runTests();
