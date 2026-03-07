
const assert = require('assert');

// Mock data helpers
function createPareja(id) {
  return { pareja_torneo_id: id };
}

function createPartido(id, tipo, p1, p2, results = {}) {
  return {
    id,
    tipo_partido: tipo,
    pareja1_id: p1,
    pareja2_id: p2,
    ganador_id: results.ganador_id || null,
    set1_pareja1: results.set1_pareja1 || null,
    set1_pareja2: results.set1_pareja2 || null,
    estado: results.ganador_id ? 'finalizado' : 'pendiente'
  };
}

// Logic to test (extracted from zonaId/route.ts for Zone 4)
function processZona4(parejas, partidos) {
  const byKey = {};
  partidos.forEach(p => byKey[p.tipo_partido] = p);
  
  const m1 = byKey["inicial_1"];
  const m2 = byKey["inicial_2"];
  const m3 = byKey["perdedores"];
  const m4 = byKey["ganadores"];
  
  const updates = [];

  if (m1 && m2 && m1.ganador_id && m2.ganador_id) {
    const perd1 = String(m1.ganador_id) === String(m1.pareja1_id) ? m1.pareja2_id : m1.pareja1_id;
    const perd2 = String(m2.ganador_id) === String(m2.pareja1_id) ? m2.pareja2_id : m2.pareja1_id;
    const gan1  = m1.ganador_id;
    const gan2  = m2.ganador_id;

    if (m3) {
      if (!m3.pareja1_id || String(m3.pareja1_id) !== String(perd1)) {
         updates.push({ id: m3.id, field: 'pareja1_id', val: perd1 });
      }
      if (!m3.pareja2_id || String(m3.pareja2_id) !== String(perd2)) {
         updates.push({ id: m3.id, field: 'pareja2_id', val: perd2 });
      }
    }
    if (m4) {
      if (!m4.pareja1_id || String(m4.pareja1_id) !== String(gan1)) {
         updates.push({ id: m4.id, field: 'pareja1_id', val: gan1 });
      }
      if (!m4.pareja2_id || String(m4.pareja2_id) !== String(gan2)) {
         updates.push({ id: m4.id, field: 'pareja2_id', val: gan2 });
      }
    }
  }
  return updates;
}

// --- Tests ---

console.log("Running Zone 4 Logic Tests...");

// Setup: 4 couples (IDs 201, 202, 203, 204)
// Match 1: 201 vs 202
// Match 2: 203 vs 204
// Match 3: Losers (TBD)
// Match 4: Winners (TBD)

// Case 1: No results yet
console.log("\nTest 1: No results");
const p1_empty = createPartido(1, "inicial_1", 201, 202);
const p2_empty = createPartido(2, "inicial_2", 203, 204);
const p3_empty = createPartido(3, "perdedores", null, null);
const p4_empty = createPartido(4, "ganadores", null, null);

const updates1 = processZona4(
  [createPareja(201), createPareja(202), createPareja(203), createPareja(204)],
  [p1_empty, p2_empty, p3_empty, p4_empty]
);
assert.strictEqual(updates1.length, 0, "Should have no updates with no results");
console.log("PASS: No updates generated");

// Case 2: Partial results (Only Match 1 finished)
console.log("\nTest 2: Partial results (M1 finished: 201 wins)");
const p1_fin = createPartido(1, "inicial_1", 201, 202, { ganador_id: 201 });
const updates2 = processZona4(
  [], // parejas not strictly needed for this logic part
  [p1_fin, p2_empty, p3_empty, p4_empty]
);
assert.strictEqual(updates2.length, 0, "Should wait for both matches to finish");
console.log("PASS: No updates until both matches finished");

// Case 3: All results (M1: 201 wins, M2: 204 wins)
// Expected: M3 (Losers) = 202 vs 203
// Expected: M4 (Winners) = 201 vs 204
console.log("\nTest 3: All results (201 & 204 win)");
const p2_fin = createPartido(2, "inicial_2", 203, 204, { ganador_id: 204 });
const updates3 = processZona4(
  [],
  [p1_fin, p2_fin, p3_empty, p4_empty]
);

// Check M3 updates (Losers)
const u3_p1 = updates3.find(u => u.id === 3 && u.field === 'pareja1_id');
const u3_p2 = updates3.find(u => u.id === 3 && u.field === 'pareja2_id');
assert.strictEqual(u3_p1.val, 202, "Loser M1 should be 202");
assert.strictEqual(u3_p2.val, 203, "Loser M2 should be 203");

// Check M4 updates (Winners)
const u4_p1 = updates3.find(u => u.id === 4 && u.field === 'pareja1_id');
const u4_p2 = updates3.find(u => u.id === 4 && u.field === 'pareja2_id');
assert.strictEqual(u4_p1.val, 201, "Winner M1 should be 201");
assert.strictEqual(u4_p2.val, 204, "Winner M2 should be 204");

console.log("PASS: Correct updates for Winners and Losers brackets");

// Case 4: Result correction (Change M1 winner to 202)
console.log("\nTest 4: Result correction (M1 winner changed to 202)");
// Current state in DB (wrongly set from previous logic)
const p3_filled = createPartido(3, "perdedores", 202, 203);
const p4_filled = createPartido(4, "ganadores", 201, 204);
// New result for M1: 202 wins
const p1_changed = createPartido(1, "inicial_1", 201, 202, { ganador_id: 202 });

const updates4 = processZona4(
  [],
  [p1_changed, p2_fin, p3_filled, p4_filled]
);

// Expect M3 (Losers) -> 201 (new loser) vs 203
// Expect M4 (Winners) -> 202 (new winner) vs 204
const u4_corr_p1 = updates4.find(u => u.id === 3 && u.field === 'pareja1_id');
const u4_corr_p2 = updates4.find(u => u.id === 4 && u.field === 'pareja1_id');

assert.strictEqual(u4_corr_p1.val, 201, "New Loser M1 should be 201");
assert.strictEqual(u4_corr_p2.val, 202, "New Winner M1 should be 202");

console.log("PASS: Updates correctly propagate on result change");
console.log("\nAll Zone 4 tests passed!");
