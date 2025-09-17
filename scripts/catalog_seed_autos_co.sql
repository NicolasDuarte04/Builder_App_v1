-- Seed catálogo: Autos CO (3–5 planes)
-- Esquema esperado por public.plans_v2 según API /api/plans_v2/search
-- Campos: id, provider, name, name_en, category, country, base_price, currency,
--         external_link, brochure_link, benefits, benefits_en, tags
-- Nota: La API almacena category='auto' (no 'autos') y country='CO'.

-- AXA Colpatria — Auto Esencial
INSERT INTO public.plans_v2 (
  id, provider, name, name_en, category, country, base_price, currency,
  external_link, brochure_link, benefits, benefits_en, tags
) VALUES (
  'co-auto-axa-esencial-v1',
  'AXA Colpatria',
  'Auto Esencial',
  'Essential Auto',
  'auto',
  'CO',
  69000,
  'COP',
  'https://www.axacolpatria.co/',
  NULL,
  '["responsabilidad civil","asistencia vial 24/7","grúa hasta 100 km","pérdida total por daños","pérdida total por hurto","rotura de vidrios"]'::jsonb,
  '[]'::jsonb,
  '["auto","responsabilidad civil","asistencia vial","robo total","todo riesgo","grúa","colombia"]'::jsonb
) ON CONFLICT DO NOTHING;

-- Seguros SURA — Auto Clásico
INSERT INTO public.plans_v2 (
  id, provider, name, name_en, category, country, base_price, currency,
  external_link, brochure_link, benefits, benefits_en, tags
) VALUES (
  'co-auto-sura-clasico-v1',
  'Seguros SURA',
  'Auto Clásico',
  'Classic Auto',
  'auto',
  'CO',
  85000,
  'COP',
  'https://www.segurossura.com.co/',
  NULL,
  '["responsabilidad civil","asistencia vial 24/7","cobertura por pérdida total","daños a terceros","conductor elegido","cobertura de lunas"]'::jsonb,
  '[]'::jsonb,
  '["auto","responsabilidad civil","asistencia vial","robo total","grúa","colombia"]'::jsonb
) ON CONFLICT DO NOTHING;

-- Allianz — Auto Básico
INSERT INTO public.plans_v2 (
  id, provider, name, name_en, category, country, base_price, currency,
  external_link, brochure_link, benefits, benefits_en, tags
) VALUES (
  'co-auto-allianz-basico-v1',
  'Allianz',
  'Auto Básico',
  'Basic Auto',
  'auto',
  'CO',
  72000,
  'COP',
  'https://www.allianz.co/',
  NULL,
  '["responsabilidad civil","asistencia vial 24/7","pérdida total por hurto","pérdida total por daños","auxilio de grúa","cobertura de accesorios"]'::jsonb,
  '[]'::jsonb,
  '["auto","responsabilidad civil","asistencia vial","robo total","todo riesgo","grúa"]'::jsonb
) ON CONFLICT DO NOTHING;

-- HDI Seguros — Auto Plus
INSERT INTO public.plans_v2 (
  id, provider, name, name_en, category, country, base_price, currency,
  external_link, brochure_link, benefits, benefits_en, tags
) VALUES (
  'co-auto-hdi-plus-v1',
  'HDI Seguros',
  'Auto Plus',
  'Auto Plus',
  'auto',
  'CO',
  98000,
  'COP',
  'https://www.hdi.com.co/',
  NULL,
  '["responsabilidad civil","asistencia vial 24/7","vehículo de reemplazo","pérdida total por hurto","daños a terceros","cobertura en todo el país"]'::jsonb,
  '[]'::jsonb,
  '["auto","responsabilidad civil","asistencia vial","robo total","vehículo de reemplazo","colombia"]'::jsonb
) ON CONFLICT DO NOTHING;

-- Seguros Bolívar — Auto Todo Riesgo
INSERT INTO public.plans_v2 (
  id, provider, name, name_en, category, country, base_price, currency,
  external_link, brochure_link, benefits, benefits_en, tags
) VALUES (
  'co-auto-bolivar-todo-riesgo-v1',
  'Seguros Bolívar',
  'Auto Todo Riesgo',
  'Comprehensive Auto',
  'auto',
  'CO',
  125000,
  'COP',
  'https://www.segurosbolivar.com/',
  NULL,
  '["responsabilidad civil","asistencia vial 24/7","todo riesgo","pérdida total por hurto","pérdida total por daños","protección jurídica"]'::jsonb,
  '[]'::jsonb,
  '["auto","responsabilidad civil","asistencia vial","robo total","todo riesgo","protección jurídica","colombia"]'::jsonb
) ON CONFLICT DO NOTHING;


