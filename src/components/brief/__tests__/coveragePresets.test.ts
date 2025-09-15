/**
 * Simple unit tests for coverage presets functionality
 * Run with: tsx src/components/brief/__tests__/coveragePresets.test.ts
 */

// Coverage presets data (copied from BriefPanel.tsx)
const COVERAGE_PRESETS = {
  'Vehículos': [
    'asistencia',
    'robo',
    'vidrios',
    'responsabilidad civil',
    'daños propios',
    'incendio',
    'inundación',
    'terremoto',
    'hurto',
    'vandalismo',
  ],
  'Salud': [
    'hospitalización',
    'cirugía',
    'medicamentos',
    'urgencias',
    'consultas médicas',
    'laboratorios',
    'radiología',
    'terapias',
    'maternidad',
    'dental',
  ],
  'Viajes': [
    'cancelación',
    'interrupción',
    'equipaje',
    'asistencia médica',
    'evacuación',
    'repatriación',
    'responsabilidad civil',
    'muerte accidental',
    'invalidez',
    'emergencia',
  ],
  'Vida': [
    'muerte natural',
    'muerte accidental',
    'invalidez total',
    'invalidez parcial',
    'enfermedades graves',
    'gastos funerarios',
    'pensión vitalicia',
    'educación',
    'vivienda',
    'deudas',
  ],
  'Hogar': [
    'incendio',
    'inundación',
    'terremoto',
    'robo',
    'hurto',
    'vandalismo',
    'responsabilidad civil',
    'daños eléctricos',
    'daños por agua',
    'cristales',
  ],
  'Otro': [
    'responsabilidad civil',
    'daños materiales',
    'asistencia',
    'emergencias',
    'robo',
    'incendio',
    'inundación',
    'terremoto',
    'hurto',
    'vandalismo',
  ],
} as const;

// Helper function to get presets for a category
const presetsFor = (category: string | null): readonly string[] => {
  if (!category || !(category in COVERAGE_PRESETS)) {
    return COVERAGE_PRESETS['Vehículos']; // Default fallback
  }
  return COVERAGE_PRESETS[category as keyof typeof COVERAGE_PRESETS];
};

// Simple test framework
class TestRunner {
  private tests: Array<{ name: string; fn: () => void }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void) {
    this.tests.push({ name, fn });
  }

  assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertTrue(condition: boolean, message?: string) {
    if (!condition) {
      throw new Error(message || 'Expected condition to be true');
    }
  }

  assertIncludes<T>(array: T[], item: T, message?: string) {
    if (!array.includes(item)) {
      throw new Error(message || `Expected array to include ${item}`);
    }
  }

  run() {
    console.log('🧪 Running coverage presets tests...\n');

    for (const test of this.tests) {
      try {
        test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   ${error instanceof Error ? error.message : error}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('💥 Some tests failed!');
      process.exit(1);
    }
  }
}

// Test cases
const runner = new TestRunner();

// Test 1: presetsFor('Salud') returns health-specific items
runner.test('presetsFor("Salud") returns health-specific items', () => {
  const saludPresets = presetsFor('Salud');
  
  // Should include health-specific coverages
  runner.assertIncludes(saludPresets, 'hospitalización', 'Should include hospitalización');
  runner.assertIncludes(saludPresets, 'medicamentos', 'Should include medicamentos');
  runner.assertIncludes(saludPresets, 'cirugía', 'Should include cirugía');
  
  // Should not include vehicle-specific coverages
  runner.assertTrue(!saludPresets.includes('vidrios'), 'Should not include vidrios');
  runner.assertTrue(!saludPresets.includes('daños propios'), 'Should not include daños propios');
});

// Test 2: presetsFor('unknown') falls back to vehiculos
runner.test('presetsFor("unknown") falls back to vehiculos', () => {
  const unknownPresets = presetsFor('unknown');
  const vehiculosPresets = COVERAGE_PRESETS['Vehículos'];
  
  // Should return the same array as vehiculos presets
  runner.assertEqual(unknownPresets.length, vehiculosPresets.length, 'Should have same length as vehiculos');
  
  // Should include vehicle-specific coverages
  runner.assertIncludes(unknownPresets, 'asistencia', 'Should include asistencia');
  runner.assertIncludes(unknownPresets, 'robo', 'Should include robo');
  runner.assertIncludes(unknownPresets, 'vidrios', 'Should include vidrios');
});

// Test 3: presetsFor(null) falls back to vehiculos
runner.test('presetsFor(null) falls back to vehiculos', () => {
  const nullPresets = presetsFor(null);
  const vehiculosPresets = COVERAGE_PRESETS['Vehículos'];
  
  runner.assertEqual(nullPresets.length, vehiculosPresets.length, 'Should have same length as vehiculos');
  runner.assertIncludes(nullPresets, 'asistencia', 'Should include asistencia');
});

// Test 4: presetsFor('Vehículos') returns correct vehiculos presets
runner.test('presetsFor("Vehículos") returns correct vehiculos presets', () => {
  const vehiculosPresets = presetsFor('Vehículos');
  
  runner.assertEqual(vehiculosPresets.length, 10, 'Should have 10 items');
  runner.assertIncludes(vehiculosPresets, 'asistencia', 'Should include asistencia');
  runner.assertIncludes(vehiculosPresets, 'responsabilidad civil', 'Should include responsabilidad civil');
});

// Test 5: presetsFor('Viajes') returns travel-specific items
runner.test('presetsFor("Viajes") returns travel-specific items', () => {
  const viajesPresets = presetsFor('Viajes');
  
  runner.assertIncludes(viajesPresets, 'cancelación', 'Should include cancelación');
  runner.assertIncludes(viajesPresets, 'equipaje', 'Should include equipaje');
  runner.assertIncludes(viajesPresets, 'evacuación', 'Should include evacuación');
});

// Run all tests
runner.run();
