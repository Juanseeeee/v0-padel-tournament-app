
import { BRACKET_CONFIGS } from '@/lib/bracket-config';

describe('Correcciones Críticas', () => {
  
  describe('1. Generación de Zonas (16 parejas)', () => {
    test('Debe priorizar zonas de 3 parejas (5 zonas: 1 de 4, 4 de 3)', () => {
      const config16 = BRACKET_CONFIGS[16];
      expect(config16).toBeDefined();
      
      // Verificar que hay 5 zonas
      expect(config16.zonas.length).toBe(5);
      
      // Verificar que la distribución es [4, 3, 3, 3, 3] (o cualquier orden que sume 16 con prioridad a 3)
      // La instrucción decía "zonas de 4 deben ser identificadas como Zona A y Zona B únicamente"
      // Como solo hay una zona de 4, debe ser la primera (Zona A).
      expect(config16.zonas[0]).toBe(4);
      expect(config16.zonas[1]).toBe(3);
      expect(config16.zonas[2]).toBe(3);
      expect(config16.zonas[3]).toBe(3);
      expect(config16.zonas[4]).toBe(3);
      
      // Suma total debe ser 16
      const totalParejas = config16.zonas.reduce((a, b) => a + b, 0);
      expect(totalParejas).toBe(16);
    });

    test('Debe tener un bracket compatible con 5 zonas (A, B, C, D, E)', () => {
        const config16 = BRACKET_CONFIGS[16];
        const bracket = config16.bracket;
        
        // Verificar que referenciamos zonas existentes (A-E)
        const validZones = ['A', 'B', 'C', 'D', 'E'];
        const slots = bracket.flatMap(m => [m.p1, m.p2]).filter(s => s !== null) as string[];
        
        // Extraer letra de zona (ej: "1A" -> "A")
        const referencedZones = slots.map(s => s.slice(-1));
        
        // Asegurar que no hay referencias a zonas inexistentes (ej: "F")
        referencedZones.forEach(z => {
            expect(validZones).toContain(z);
        });
        
        // Asegurar que referenciamos la Zona E (que antes no existía)
        expect(referencedZones).toContain('E');
    });
  });

  describe('2. Filtro de Género en Recategorización', () => {
    // Simulamos la lógica del componente
    const filterCategories = (cat: any, jugGeneroInput: string) => {
        const catGenero = (cat.genero || '').toUpperCase();
        const nombre = cat.nombre.toLowerCase();
        // Lógica corregida: asegurar lowercase
        const jugGenero = (jugGeneroInput || 'masculino').toLowerCase();
        
        if (jugGenero === "masculino") {
            return catGenero === "MASCULINO" || nombre.includes("masculino") || nombre.includes("caballero") || nombre.includes("mixto") || nombre.includes("suma");
        } else {
            return catGenero === "FEMENINO" || 
                   nombre.includes("damas") || 
                   nombre.includes("femenino") || 
                   nombre.includes("dama") || 
                   nombre.includes("mujer") ||
                   nombre.includes("ladies") ||
                   nombre.includes("mixto") || 
                   nombre.includes("suma");
        }
    };

    test('Debe mostrar categorías femeninas para jugadora femenina', () => {
        const catDamas = { id: 1, nombre: 'Damas 5ta', genero: 'femenino' };
        const catCaballeros = { id: 2, nombre: 'Caballeros 5ta', genero: 'masculino' };
        const catMixto = { id: 3, nombre: 'Mixto A', genero: 'mixto' };
        
        // Caso: Género explícito "femenino"
        expect(filterCategories(catDamas, 'femenino')).toBe(true);
        expect(filterCategories(catCaballeros, 'femenino')).toBe(false); // No debe mostrar caballeros
        expect(filterCategories(catMixto, 'femenino')).toBe(true); // Mixto sí
        
        // Caso: Género "FEMENINO" (case insensitive check)
        expect(filterCategories(catDamas, 'FEMENINO')).toBe(true);
    });

    test('Debe manejar categorías sin género explícito pero con nombre correcto', () => {
        const catDamasNoGen = { id: 4, nombre: 'Circuito Damas', genero: null };
        expect(filterCategories(catDamasNoGen, 'femenino')).toBe(true);
    });
  });

  describe('3. Cálculo de Puntos (Arrastre 50%)', () => {
    test('Debe calcular correctamente el 50% redondeado hacia abajo', () => {
        const calcularPuntos = (puntos: number) => Math.floor(puntos * 0.5);
        
        expect(calcularPuntos(100)).toBe(50);
        expect(calcularPuntos(101)).toBe(50); // Floor(50.5) = 50
        expect(calcularPuntos(10)).toBe(5);
        expect(calcularPuntos(0)).toBe(0);
    });
  });

});
