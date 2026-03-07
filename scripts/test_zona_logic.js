
const assert = require('assert');

// -----------------------------------------------------------------------------
// Mock Data Helpers
// -----------------------------------------------------------------------------
function createPareja(id) {
  return { pareja_torneo_id: id };
}

function createPartido(id, tipo, p1, p2, sets = {}) {
  return {
    id,
    tipo_partido: tipo,
    pareja1_id: p1,
    pareja2_id: p2,
    ganador_id: null,
    estado: 'pendiente',
    set1_pareja1: null, set1_pareja2: null,
    set2_pareja1: null, set2_pareja2: null,
    set3_pareja1: null, set3_pareja2: null,
    ...sets
  };
}

// -----------------------------------------------------------------------------
// Logic Under Test (Simulating Backend Logic)
// -----------------------------------------------------------------------------

function computeWinnerId(p) {
  let sp1 = 0, sp2 = 0;
  
  const s1p1 = p.set1_pareja1; const s1p2 = p.set1_pareja2;
  const s2p1 = p.set2_pareja1; const s2p2 = p.set2_pareja2;
  const s3p1 = p.set3_pareja1; const s3p2 = p.set3_pareja2;

  if (s1p1 !== null && s1p2 !== null) { if (s1p1 > s1p2) sp1++; else if (s1p2 > s1p1) sp2++; }
  if (s2p1 !== null && s2p2 !== null) { if (s2p1 > s2p2) sp1++; else if (s2p2 > s2p1) sp2++; }
  if (s3p1 !== null && s3p2 !== null) { if (s3p1 > s3p2) sp1++; else if (s3p2 > s3p1) sp2++; }

  if (!p.pareja1_id || !p.pareja2_id) return null;
  if (sp1 > sp2) return p.pareja1_id;
  if (sp2 > sp1) return p.pareja2_id;
  return null;
}

// SIMULATED BACKEND LOGIC FOR ZONE UPDATE
function processZona(parejas, partidos) {
  const updates = [];
  const len = parejas.length;
  const norm = (s) => (s || "").trim().toLowerCase();
  const byKey = {};
  
  for (const p of partidos) {
    byKey[norm(p.tipo_partido)] = p;
  }

  // --- LOGIC FOR 3 PAIRS ---
  if (len === 3) {
    const m1 = byKey["inicial"] || byKey["incial"] || byKey["inicial_1"];
    const allParejaIds = parejas.map(p => p.pareja_torneo_id);
    
    // Fix 1: Type-safe comparison for ID3
    const id3 = (m1 && allParejaIds.length === 3) 
      ? allParejaIds.find(pid => String(pid) !== String(m1.pareja1_id) && String(pid) !== String(m1.pareja2_id)) 
      : null;

    if (m1) {
      const ganadorInicial = m1.ganador_id || computeWinnerId(m1);
      const perdedorInicial = (ganadorInicial && m1.pareja1_id && m1.pareja2_id)
        ? (String(ganadorInicial) === String(m1.pareja1_id) ? m1.pareja2_id : m1.pareja1_id)
        : null;

      const perdMatch = byKey["perdedor_vs_3"] || byKey["perderdor_vs_3"] || byKey["perdedores"];
      const ganMatch  = byKey["ganador_vs_3"] || byKey["ganadores"];

      if (perdMatch) {
        // Fix 2: Overwrite if different (perdedor)
        if (perdedorInicial && (!perdMatch.pareja1_id || String(perdMatch.pareja1_id) !== String(perdedorInicial))) {
          updates.push({ id: perdMatch.id, field: 'pareja1_id', val: perdedorInicial, note: 'Fix applied' });
        }
        // Fix 2: Overwrite if different (id3)
        if (id3 && (!perdMatch.pareja2_id || String(perdMatch.pareja2_id) !== String(id3))) {
          updates.push({ id: perdMatch.id, field: 'pareja2_id', val: id3, note: 'Fix applied' });
        }
      }
      if (ganMatch) {
        if (ganadorInicial && (!ganMatch.pareja1_id || String(ganMatch.pareja1_id) !== String(ganadorInicial))) {
          updates.push({ id: ganMatch.id, field: 'pareja1_id', val: ganadorInicial, note: 'Fix applied' });
        }
        if (id3 && (!ganMatch.pareja2_id || String(ganMatch.pareja2_id) !== String(id3))) {
          updates.push({ id: ganMatch.id, field: 'pareja2_id', val: id3, note: 'Fix applied' });
        }
      }
    }
  }

  // --- LOGIC FOR 4 PAIRS ---
  if (len === 4) {
    const m1 = byKey["inicial_1"];
    const m2 = byKey["inicial_2"];
    const m3 = byKey["perdedores"];
    const m4 = byKey["ganadores"];

    // Only proceed if both initial matches have winners
    const w1 = m1 ? (m1.ganador_id || computeWinnerId(m1)) : null;
    const w2 = m2 ? (m2.ganador_id || computeWinnerId(m2)) : null;

    if (m1 && m2 && w1 && w2) {
      const perd1 = String(w1) === String(m1.pareja1_id) ? m1.pareja2_id : m1.pareja1_id;
      const perd2 = String(w2) === String(m2.pareja1_id) ? m2.pareja2_id : m2.pareja1_id;
      const gan1  = w1;
      const gan2  = w2;

      if (m3) {
        if (!m3.pareja1_id || String(m3.pareja1_id) !== String(perd1)) {
           updates.push({ id: m3.id, field: 'pareja1_id', val: perd1, note: 'Fix applied 4-pair' });
        }
        if (!m3.pareja2_id || String(m3.pareja2_id) !== String(perd2)) {
           updates.push({ id: m3.id, field: 'pareja2_id', val: perd2, note: 'Fix applied 4-pair' });
        }
      }
      if (m4) {
        if (!m4.pareja1_id || String(m4.pareja1_id) !== String(gan1)) {
           updates.push({ id: m4.id, field: 'pareja1_id', val: gan1, note: 'Fix applied 4-pair' });
        }
        if (!m4.pareja2_id || String(m4.pareja2_id) !== String(gan2)) {
           updates.push({ id: m4.id, field: 'pareja2_id', val: gan2, note: 'Fix applied 4-pair' });
        }
      }
    }
  }

  return updates;
}

// -----------------------------------------------------------------------------
// Test Suite
// -----------------------------------------------------------------------------

console.log("=== STARTING TESTS ===");

// --- TEST CASE 1: ZONE 3 PAIRS (Basic & Fix Verification) ---
console.log("\n--- TEST CASE 1: ZONE 3 PAIRS ---");

// 1.1 Fresh Start
console.log("1.1 Fresh Start (No results)");
const z3_p1 = createPartido(1, "inicial", 101, 102);
const z3_p2 = createPartido(2, "perdedor_vs_3", null, null);
const z3_p3 = createPartido(3, "ganador_vs_3", null, null);
const u3_1 = processZona(
  [createPareja(101), createPareja(102), createPareja(103)],
  [z3_p1, z3_p2, z3_p3]
);
// Expect ID3 (103) to be assigned to p2 and p3 immediately
assert(u3_1.find(u => u.id === 2 && u.field === 'pareja2_id' && u.val === 103), "Failed to assign ID3 to perdedor match");
assert(u3_1.find(u => u.id === 3 && u.field === 'pareja2_id' && u.val === 103), "Failed to assign ID3 to ganador match");
console.log("PASS: Fresh start assigns ID3 correctly");

// 1.2 Result Registered (101 Wins)
console.log("1.2 Result Registered (101 Wins)");
const z3_p1_win = createPartido(1, "inicial", 101, 102, { set1_pareja1: 6, set1_pareja2: 0, set2_pareja1: 6, set2_pareja2: 0 });
const u3_2 = processZona(
  [createPareja(101), createPareja(102), createPareja(103)],
  [z3_p1_win, z3_p2, z3_p3]
);
// Expect 102 (loser) to p2, 101 (winner) to p3
assert(u3_2.find(u => u.id === 2 && u.field === 'pareja1_id' && u.val === 102), "Failed to assign Loser (102) to perdedor match");
assert(u3_2.find(u => u.id === 3 && u.field === 'pareja1_id' && u.val === 101), "Failed to assign Winner (101) to ganador match");
console.log("PASS: Result registration updates dependent matches");

// 1.3 Result Changed (Correction: 102 Wins) - CRITICAL FIX TEST
console.log("1.3 Result Changed (Correction: 102 Wins) - CRITICAL FIX TEST");
// Simulate WRONG existing state (from previous 101 win)
const z3_p2_wrong = createPartido(2, "perdedor_vs_3", 102, 103); 
const z3_p3_wrong = createPartido(3, "ganador_vs_3", 101, 103);
// New result: 102 wins
const z3_p1_win2 = createPartido(1, "inicial", 101, 102, { set1_pareja1: 0, set1_pareja2: 6, set2_pareja1: 0, set2_pareja2: 6 });

const u3_3 = processZona(
  [createPareja(101), createPareja(102), createPareja(103)],
  [z3_p1_win2, z3_p2_wrong, z3_p3_wrong]
);
// Expect update to CORRECT the values (Loser 101 -> p2, Winner 102 -> p3)
assert(u3_3.find(u => u.id === 2 && u.field === 'pareja1_id' && u.val === 101), "Failed to CORRECT Loser (101)");
assert(u3_3.find(u => u.id === 3 && u.field === 'pareja1_id' && u.val === 102), "Failed to CORRECT Winner (102)");
console.log("PASS: Result change overwrites incorrect existing values");


// --- TEST CASE 2: ZONE 4 PAIRS (New Logic Validation) ---
console.log("\n--- TEST CASE 2: ZONE 4 PAIRS ---");

// 2.1 Fresh Start (No results)
console.log("2.1 Fresh Start");
const z4_p1 = createPartido(1, "inicial_1", 101, 102);
const z4_p2 = createPartido(2, "inicial_2", 103, 104);
const z4_p3 = createPartido(3, "perdedores", null, null);
const z4_p4 = createPartido(4, "ganadores", null, null);

const u4_1 = processZona(
  [createPareja(101), createPareja(102), createPareja(103), createPareja(104)],
  [z4_p1, z4_p2, z4_p3, z4_p4]
);
assert.strictEqual(u4_1.length, 0, "Should have no updates when no results");
console.log("PASS: No updates on fresh start");

// 2.2 Results Registered (101 wins, 104 wins)
console.log("2.2 Results Registered (101 & 104 win)");
const z4_p1_win = createPartido(1, "inicial_1", 101, 102, { set1_pareja1: 6, set1_pareja2: 0, set2_pareja1: 6, set2_pareja2: 0 }); // 101 wins
const z4_p2_win = createPartido(2, "inicial_2", 103, 104, { set1_pareja1: 0, set1_pareja2: 6, set2_pareja1: 0, set2_pareja2: 6 }); // 104 wins

const u4_2 = processZona(
  [createPareja(101), createPareja(102), createPareja(103), createPareja(104)],
  [z4_p1_win, z4_p2_win, z4_p3, z4_p4]
);

// Perdedores (p3): 102 vs 103
assert(u4_2.find(u => u.id === 3 && u.field === 'pareja1_id' && u.val === 102), "Failed 4-pair Loser 1");
assert(u4_2.find(u => u.id === 3 && u.field === 'pareja2_id' && u.val === 103), "Failed 4-pair Loser 2");
// Ganadores (p4): 101 vs 104
assert(u4_2.find(u => u.id === 4 && u.field === 'pareja1_id' && u.val === 101), "Failed 4-pair Winner 1");
assert(u4_2.find(u => u.id === 4 && u.field === 'pareja2_id' && u.val === 104), "Failed 4-pair Winner 2");
console.log("PASS: 4-pair results propagate correctly");


// --- TEST CASE 3: ZONE 5 PAIRS (Pass-through Check) ---
console.log("\n--- TEST CASE 3: ZONE 5 PAIRS ---");
// 5 pairs typically round-robin or no special logic in this file
const z5_p1 = createPartido(1, "round_robin", 101, 102);
const u5_1 = processZona(
  [createPareja(101), createPareja(102), createPareja(103), createPareja(104), createPareja(105)],
  [z5_p1]
);
assert.strictEqual(u5_1.length, 0, "Should have no updates for 5 pairs (no special logic)");
console.log("PASS: 5-pair zone ignored safely");

console.log("\n=== ALL TESTS PASSED ===");
