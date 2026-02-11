import { NextResponse } from "next/server";

// Localidades del norte de la provincia de Buenos Aires
// Distrito General Arenales y distritos aledaños
const localidades = [
  // General Arenales
  "General Arenales",
  "Ferre",
  "Ascension",
  "La Angelita",
  "Arribeños",
  "La Trinidad",
  "Estacion Arenales",
  // Junin
  "Junin",
  "Morse",
  "Agustin Roca",
  "Saforcada",
  "Laplace",
  "Fortín Tiburcio",
  // Lincoln
  "Lincoln",
  "Roberts",
  "El Triunfo",
  "Pasteur",
  "Carlos Salas",
  "Las Toscas",
  "Bayauca",
  // Leandro N. Alem
  "Leandro N. Alem",
  "Vedia",
  "Alberdi",
  "Juan Bautista Alberdi",
  // General Pinto
  "General Pinto",
  "Germania",
  "Colonia San Ricardo",
  "Villa Francia",
  // General Viamonte
  "General Viamonte",
  "Los Toldos",
  "San Emilio",
  "Zavalia",
  // Rojas
  "Rojas",
  "Carabelas",
  "Rafael Obligado",
  "Las Cavas",
  "Roberto Cano",
  // Colon
  "Colon",
  "Sarasa",
  "Pearson",
  // Chacabuco
  "Chacabuco",
  "Rawson",
  "O'Higgins",
  "Castilla",
  // General Arenales aledaños
  "Ameghino",
  "Florentino Ameghino",
  "Blaquier",
  "General Villegas",
  "Piedritas",
].sort();

export async function GET() {
  const result = localidades.map((nombre, idx) => ({ id: idx + 1, nombre }));
  return NextResponse.json(result);
}
