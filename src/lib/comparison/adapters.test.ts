import { fromCatalog, fromTemplate, fromSource } from './adapters';
import type { AnyPlan, PlanV2, PlanLegacy } from '@/types/plan';
import type { TemplatePlan } from '@/types/compare';
import type { NormalizedPlan } from '@/types/results';

// Simple test framework
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message || ''}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Assertion failed: ${message || ''}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function runTest(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
  }
}

console.log('🧪 Running Comparison Adapters Tests\n');

// Test fromCatalog
runTest('fromCatalog - should convert PlanV2 to ComparedPlan format - happy path', () => {
      const planV2: PlanV2 = {
        id: 'plan-123',
        name: 'Plan Básico Salud',
        name_en: 'Basic Health Plan',
        provider: 'Seguros SURA',
        category: 'salud',
        country: 'CO',
        base_price: 150000,
        currency: 'COP',
        external_link: 'https://example.com',
        brochure_link: 'https://example.com/brochure.pdf',
        benefits: ['consulta medica', 'hospitalizacion', 'emergencias'],
        benefits_en: ['medical consultation', 'hospitalization', 'emergencies'],
        tags: ['popular', 'basico'],
        _schema: 'v2'
      };

      const result = fromCatalog(planV2);

      assertEqual(result.id, 'plan-123');
      assertEqual(result.source.kind, 'catalog');
      assertEqual(result.source.ref, 'plan-123');
      assertEqual(result.provider, 'Seguros SURA');
      assertEqual(result.name, 'Plan Básico Salud');
      assertEqual(result.priceCop, 150000);
      assertEqual(result.priceEstCop, null);
      assertDeepEqual(result.coverages, ['consulta medica', 'hospitalizacion', 'emergencias']);
      assertDeepEqual(result.exclusions, []);
      assert(result.source.updatedAt !== undefined, 'updatedAt should be defined');
});

runTest('fromCatalog - should handle PlanLegacy with missing fields', () => {
      const planLegacy: PlanLegacy = {
        id: 'legacy-456',
        name: 'Plan Viejo',
        provider: 'Aseguradora XYZ',
        category: 'auto',
        country: 'CO',
        base_price: null, // missing price
        benefits: undefined, // missing benefits
        _schema: 'legacy'
      };

      const result = fromCatalog(planLegacy);

      assertEqual(result.id, 'legacy-456');
      assertEqual(result.provider, 'Aseguradora XYZ');
      assertEqual(result.name, 'Plan Viejo');
      assertEqual(result.priceCop, null);
      assertDeepEqual(result.coverages, []); // normalized empty array
      assertDeepEqual(result.exclusions, []);
});

// Test fromTemplate
runTest('fromTemplate - should convert TemplatePlan to ComparedPlan format - happy path', () => {
      const template: TemplatePlan = {
        id: 'template-789',
        title: 'Plantilla Salud Premium',
        category: 'salud',
        expectedCoverages: ['consulta especialista', 'cirugia', 'medicamentos'],
        typicalExclusions: ['enfermedades preexistentes', 'tratamientos esteticos'],
        estimatedMonthlyCopRange: [200000, 400000],
        redFlags: ['Deducible muy alto'],
        sources: [
          { type: 'pdf', ref: 'template-doc.pdf', updatedAt: '2024-01-15T10:00:00Z' }
        ]
      };

      const result = fromTemplate(template);

      assertEqual(result.id, 'template-789');
      assertEqual(result.source.kind, 'template');
      assertEqual(result.source.ref, 'template-789');
      assertEqual(result.source.updatedAt, '2024-01-15T10:00:00Z');
      assertEqual(result.provider, undefined);
      assertEqual(result.name, 'Plantilla Salud Premium');
      assertEqual(result.priceCop, null);
      assertEqual(result.priceEstCop, 300000); // average of range
      assertDeepEqual(result.coverages, ['consulta especialista', 'cirugia', 'medicamentos']);
      assertDeepEqual(result.exclusions, ['enfermedades preexistentes', 'tratamientos esteticos']);
});

runTest('fromTemplate - should handle TemplatePlan with missing fields', () => {
      const template: TemplatePlan = {
        id: 'template-minimal',
        title: 'Plantilla Mínima',
        category: 'vida',
        expectedCoverages: ['muerte natural'],
        typicalExclusions: [],
        // missing estimatedMonthlyCopRange
        sources: []
      };

      const result = fromTemplate(template);

      assertEqual(result.id, 'template-minimal');
      assertEqual(result.name, 'Plantilla Mínima');
      assertEqual(result.priceCop, null);
      assertEqual(result.priceEstCop, null); // no range provided
      assertDeepEqual(result.coverages, ['muerte natural']);
      assertDeepEqual(result.exclusions, []);
      assertEqual(result.source.updatedAt, undefined); // no sources
});

// Test fromSource
runTest('fromSource - should convert NormalizedPlan from PDF to ComparedPlan format - happy path', () => {
      const normalized: NormalizedPlan = {
        provider: 'Mapfre Colombia',
        name: 'Seguro Auto Completo',
        priceCop: 180000,
        benefits: ['responsabilidad civil', 'todo riesgo', 'asistencia vial'],
        exclusions: ['daños por guerra', 'conducir embriagado'],
        source: { kind: 'pdf', ref: 'policy-document.pdf' }
      };

      const result = fromSource(normalized, 'pdf');

      assertEqual(result.id, 'pdf-policy-document.pdf');
      assertEqual(result.source.kind, 'pdf');
      assertEqual(result.source.ref, 'policy-document.pdf');
      assertEqual(result.provider, 'Mapfre Colombia');
      assertEqual(result.name, 'Seguro Auto Completo');
      assertEqual(result.priceCop, 180000);
      assertEqual(result.priceEstCop, null);
      assertDeepEqual(result.coverages, ['responsabilidad civil', 'todo riesgo', 'asistencia vial']);
      assertDeepEqual(result.exclusions, ['danos por guerra', 'conducir embriagado']);
});

runTest('fromSource - should handle NormalizedPlan from URL with missing fields', () => {
      const normalized: NormalizedPlan = {
        // missing provider and name
        benefits: ['cobertura basica'],
        source: { kind: 'url', ref: 'https://example.com/plan' }
      };

      const result = fromSource(normalized, 'url');

      assertEqual(result.id, 'url-https://example.com/plan');
      assertEqual(result.source.kind, 'url');
      assertEqual(result.provider, undefined);
      assertEqual(result.name, undefined);
      assertEqual(result.priceCop, undefined);
      assertDeepEqual(result.coverages, ['cobertura basica']);
      assertDeepEqual(result.exclusions, []); // normalized empty array
});

runTest('fromSource - should handle NormalizedPlan from text source', () => {
      const normalized: NormalizedPlan = {
        provider: 'Seguros Bolívar',
        name: 'Plan Hogar',
        benefits: ['incendio', 'robo', 'terremoto'],
        exclusions: ['inundacion'],
        source: { kind: 'text', ref: 'user-input-text' }
      };

      const result = fromSource(normalized, 'text');

      assertEqual(result.id, 'text-user-input-text');
      assertEqual(result.source.kind, 'text');
      assertEqual(result.source.ref, 'user-input-text');
      assertEqual(result.provider, 'Seguros Bolívar');
      assertEqual(result.name, 'Plan Hogar');
      assertDeepEqual(result.coverages, ['incendio', 'robo', 'terremoto']);
      assertDeepEqual(result.exclusions, ['inundacion']);
});

console.log('\n✨ All tests completed!');
