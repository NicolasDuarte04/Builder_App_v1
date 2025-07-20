const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.error('Warning: Could not load .env.local file:', error.message);
  }
}

// Load environment variables
loadEnvFile();

async function enrichPlans() {
  const dbUrl = process.env.RENDER_POSTGRES_URL || process.env.RENDER_DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ Error: RENDER_POSTGRES_URL not found in environment variables');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Starting Phase 3: Enriching existing plans with new field data...\n');

    // First, let's see what plans we have
    const existingPlansQuery = 'SELECT id, name, provider, category FROM insurance_plans ORDER BY id LIMIT 10';
    const existingPlans = await pool.query(existingPlansQuery);
    
    console.log('📋 Current plans in database:');
    existingPlans.rows.forEach(plan => {
      console.log(`   ID ${plan.id}: ${plan.name} by ${plan.provider} (${plan.category})`);
    });
    console.log('\n');

    // Define enrichment data for 5 plans
    const enrichmentData = [
      {
        id: existingPlans.rows[0]?.id,
        plan_name_es: 'Plan Viaje Norteamérica Premium',
        plan_name_en: 'North America Travel Plan Premium',
        description_es: 'Cobertura completa para viajes a Estados Unidos, Canadá y México. Incluye gastos médicos, pérdida de equipaje y cancelación de viaje.',
        description_en: 'Complete coverage for travel to USA, Canada, and Mexico. Includes medical expenses, lost luggage, and trip cancellation.',
        tags: ['viaje internacional', 'cobertura médica', 'popular'],
        target_demographic: ['viajeros frecuentes', 'turistas', 'estudiantes internacionales'],
        coverage_type: 'viaje',
        monthly_premium: 200000,
        deductible: 100000,
        requires_medical: false,
        price_range: '150.000 - 250.000 COP/mes',
        features: {
          medical_coverage: '50,000 USD',
          trip_cancellation: '5,000 USD',
          lost_baggage: '2,000 USD',
          emergency_evacuation: true,
          assistance_24_7: true
        },
        external_link: 'https://www.sevencorners.com/es/seguro-de-viaje/norteamerica'
      },
      {
        id: existingPlans.rows[1]?.id,
        plan_name_es: 'Plan Autos Todo Riesgo SURA',
        plan_name_en: 'SURA Full Coverage Auto Insurance',
        description_es: 'Protección completa para tu vehículo con cobertura todo riesgo. Incluye daños propios, terceros, asistencia en carretera y vehículo de reemplazo.',
        description_en: 'Complete protection for your vehicle with full coverage. Includes own damages, third party, roadside assistance and replacement vehicle.',
        tags: ['todo riesgo', 'mejor cobertura', 'asistencia 24/7'],
        target_demographic: ['propietarios de vehículos nuevos', 'conductores frecuentes', 'familias'],
        coverage_type: 'auto',
        monthly_premium: 1500000,
        deductible: 800000,
        requires_medical: false,
        price_range: '1.200.000 - 1.800.000 COP/mes',
        features: {
          own_damage_coverage: true,
          third_party_liability: '1,000,000,000 COP',
          roadside_assistance: '24/7',
          replacement_vehicle: '30 días',
          legal_assistance: true
        },
        external_link: 'https://www.sura.com/seguro-autos/cotizar'
      },
      {
        id: existingPlans.rows[2]?.id,
        plan_name_es: 'Plan Salud Familiar Coomeva',
        plan_name_en: 'Coomeva Family Health Plan',
        description_es: 'Plan de salud integral para toda la familia. Acceso a red nacional de clínicas, especialistas sin autorización y medicina preventiva incluida.',
        description_en: 'Comprehensive health plan for the whole family. Access to national clinic network, specialists without authorization and preventive medicine included.',
        tags: ['salud familiar', 'sin copagos', 'medicina preventiva'],
        target_demographic: ['familias', 'parejas con hijos', 'adultos mayores'],
        coverage_type: 'salud',
        monthly_premium: 450000,
        deductible: 0,
        requires_medical: true,
        price_range: '400.000 - 500.000 COP/mes por familia',
        features: {
          preventive_care: 'incluido',
          specialist_access: 'sin autorización',
          dental_coverage: 'básico incluido',
          maternity_coverage: true,
          international_coverage: 'emergencias'
        },
        external_link: 'https://www.coomeva.com.co/publicaciones/planes_de_salud'
      },
      {
        id: existingPlans.rows[3]?.id,
        plan_name_es: 'Seguro Hogar Integral Liberty',
        plan_name_en: 'Liberty Complete Home Insurance',
        description_es: 'Protección completa para tu hogar y contenidos. Cubre incendio, robo, daños por agua, terremoto y responsabilidad civil familiar.',
        description_en: 'Complete protection for your home and contents. Covers fire, theft, water damage, earthquake and family liability.',
        tags: ['hogar seguro', 'cobertura terremoto', 'más barato'],
        target_demographic: ['propietarios de vivienda', 'arrendatarios', 'familias'],
        coverage_type: 'hogar',
        monthly_premium: 85000,
        deductible: 500000,
        requires_medical: false,
        price_range: '70.000 - 120.000 COP/mes',
        features: {
          building_coverage: '500,000,000 COP',
          contents_coverage: '100,000,000 COP',
          earthquake_coverage: true,
          flood_coverage: true,
          liability_coverage: '200,000,000 COP'
        },
        external_link: 'https://www.liberty.com.co/personas/seguros/hogar'
      },
      {
        id: existingPlans.rows[4]?.id,
        plan_name_es: 'Plan Dental Premium Mapfre',
        plan_name_en: 'Mapfre Premium Dental Plan',
        description_es: 'Cobertura dental completa con acceso a red de especialistas. Incluye ortodoncia, implantes y blanqueamiento sin períodos de carencia.',
        description_en: 'Complete dental coverage with access to specialist network. Includes orthodontics, implants and whitening without waiting periods.',
        tags: ['dental completo', 'sin carencias', 'ortodoncia incluida'],
        target_demographic: ['profesionales', 'familias con niños', 'adultos jóvenes'],
        coverage_type: 'dental',
        monthly_premium: 120000,
        deductible: 50000,
        requires_medical: false,
        price_range: '100.000 - 150.000 COP/mes',
        features: {
          preventive_care: '100% cubierto',
          orthodontics: '70% cubierto',
          implants: '60% cubierto',
          whitening: '1 vez al año',
          emergency_care: '24/7'
        },
        external_link: 'https://www.mapfre.com.co/seguros-co/personas/seguros-salud/dental/'
      }
    ];

    // Update each plan
    console.log('📝 Enriching plans with new field data...\n');
    
    for (const planData of enrichmentData) {
      if (!planData.id) {
        console.log('⚠️  Skipping plan - no ID found');
        continue;
      }

      const updateQuery = `
        UPDATE insurance_plans
        SET 
          plan_name_es = $1,
          plan_name_en = $2,
          description_es = $3,
          description_en = $4,
          tags = $5,
          target_demographic = $6,
          coverage_type = $7,
          monthly_premium = $8,
          deductible = $9,
          requires_medical = $10,
          price_range = $11,
          features = $12,
          external_link = COALESCE($13, external_link),
          updated_at = NOW()
        WHERE id = $14
        RETURNING id, name, provider, coverage_type;
      `;

      const values = [
        planData.plan_name_es,
        planData.plan_name_en,
        planData.description_es,
        planData.description_en,
        planData.tags,
        planData.target_demographic,
        planData.coverage_type,
        planData.monthly_premium,
        planData.deductible,
        planData.requires_medical,
        planData.price_range,
        JSON.stringify(planData.features),
        planData.external_link,
        planData.id
      ];

      try {
        const result = await pool.query(updateQuery, values);
        if (result.rows.length > 0) {
          console.log(`✅ Updated Plan ID ${result.rows[0].id}: ${result.rows[0].name} - Type: ${result.rows[0].coverage_type}`);
        }
      } catch (error) {
        console.error(`❌ Error updating plan ID ${planData.id}:`, error.message);
      }
    }

    // Verify the updates
    console.log('\n🔍 Verifying enrichment...\n');
    
    const verifyQuery = `
      SELECT 
        id, name, provider, coverage_type,
        plan_name_es, plan_name_en,
        tags, target_demographic,
        monthly_premium, deductible
      FROM insurance_plans
      WHERE plan_name_es IS NOT NULL
      ORDER BY id
      LIMIT 5;
    `;

    const verifyResult = await pool.query(verifyQuery);
    
    console.log('📊 Enriched plans summary:');
    console.log('┌────────┬─────────────────────────────────┬──────────────┬─────────────────┐');
    console.log('│ ID     │ Spanish Name                    │ Type         │ Monthly Premium │');
    console.log('├────────┼─────────────────────────────────┼──────────────┼─────────────────┤');
    
    verifyResult.rows.forEach(plan => {
      const id = plan.id.toString().padEnd(6);
      const name = (plan.plan_name_es || plan.name).substring(0, 31).padEnd(31);
      const type = (plan.coverage_type || 'N/A').padEnd(12);
      const premium = plan.monthly_premium 
        ? new Intl.NumberFormat('es-CO').format(plan.monthly_premium) + ' COP'
        : 'N/A';
      console.log(`│ ${id} │ ${name} │ ${type} │ ${premium.padEnd(15)} │`);
    });
    
    console.log('└────────┴─────────────────────────────────┴──────────────┴─────────────────┘');

    // Count enriched plans
    const countQuery = 'SELECT COUNT(*) as enriched FROM insurance_plans WHERE plan_name_es IS NOT NULL';
    const countResult = await pool.query(countQuery);
    
    console.log(`\n✅ Total enriched plans: ${countResult.rows[0].enriched}`);

  } catch (error) {
    console.error('\n❌ Enrichment failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🎉 Phase 3 complete! Plans successfully enriched with new field data.');
  }
}

// Execute the enrichment
enrichPlans(); 