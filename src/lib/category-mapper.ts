import { getInsuranceTypes } from './render-db';

// Natural language mappings for categories
// Maps user input terms to actual database categories
export const CATEGORY_MAPPINGS: Record<string, string[]> = {
  // Business/Corporate Insurance
  'laboral_empresarial': [
    'business', 'business insurance', 'commercial', 'corporate', 'company',
    'empresa', 'empresarial', 'negocio', 'comercial', 'corporativo',
    'laboral', 'trabajo', 'empleados', 'workers', 'employee',
    'professional liability', 'responsabilidad profesional'
  ],
  
  // Home Insurance
  'hogar': [
    'home', 'house', 'property', 'homeowners', 'renters',
    'casa', 'vivienda', 'propiedad', 'inmueble', 'apartamento',
    'apartment', 'condo', 'condominio', 'arrendamiento'
  ],
  
  // Travel Insurance
  'viajes': [
    'travel', 'trip', 'vacation', 'journey', 'tourism',
    'viaje', 'vacaciones', 'turismo', 'excursion',
    'flight', 'vuelo', 'internacional', 'international'
  ],
  
  // Agricultural/Rural Insurance
  'agricola_rural': [
    'agricultural', 'farm', 'farming', 'rural', 'crops',
    'agricola', 'agricultura', 'campo', 'cultivo', 'granja',
    'livestock', 'ganado', 'cosecha', 'harvest'
  ],
  
  // Specialized Health Insurance
  'salud especializada': [
    'health', 'medical', 'healthcare', 'dental', 'vision',
    'salud', 'medico', 'medicina', 'dental', 'vision',
    'especializada', 'specialized health', 'prepagada', 'eps'
  ],
  
  // Life/Financial Insurance
  'vida_financiera': [
    'life', 'life insurance', 'death', 'mortality',
    'vida', 'seguro de vida', 'muerte', 'fallecimiento',
    'financial', 'financiero', 'investment', 'inversion'
  ],
  
  // Education Insurance
  'educacion': [
    'education', 'educational', 'student', 'school', 'university',
    'educacion', 'educativo', 'estudiante', 'escuela', 'universidad',
    'college', 'colegio', 'estudios', 'academic', 'academico'
  ],
  
  // Pets and Objects Insurance
  'mascotas y objetos': [
    'pet', 'pets', 'dog', 'cat', 'animal',
    'mascota', 'mascotas', 'perro', 'gato', 'animal',
    'objects', 'objetos', 'belongings', 'pertenencias',
    'valuable', 'valioso', 'electronics', 'electronica'
  ],
  
  // Technology/Digital Insurance
  'nuevas tecnologías y digitales': [
    'technology', 'tech', 'digital', 'cyber', 'cybersecurity',
    'tecnologia', 'digital', 'cibernetico', 'ciberseguridad',
    'data', 'datos', 'online', 'internet', 'software',
    'hacking', 'breach', 'violacion de datos'
  ],
  
  // Savings Insurance
  'ahorro': [
    'savings', 'save', 'retirement', 'pension',
    'ahorro', 'ahorros', 'jubilacion', 'pension',
    'retiro', 'futuro', 'future', 'investment'
  ],
  
  // Others
  'otros': [
    'other', 'others', 'miscellaneous', 'special',
    'otro', 'otros', 'especial', 'miscelaneo',
    'unique', 'unico', 'custom', 'personalizado'
  ]
};

// Fuzzy match function to find the best category match
export function findBestCategoryMatch(userInput: string): string | null {
  const input = userInput.toLowerCase().trim();
  
  // First, check for exact category name match
  for (const category of Object.keys(CATEGORY_MAPPINGS)) {
    if (input === category || input === category.replace('_', ' ')) {
      return category;
    }
  }
  
  // Then check for keyword matches
  for (const [category, keywords] of Object.entries(CATEGORY_MAPPINGS)) {
    for (const keyword of keywords) {
      if (input.includes(keyword) || keyword.includes(input)) {
        return category;
      }
    }
  }
  
  // Check for partial word matches
  const words = input.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue; // Skip very short words
    
    for (const [category, keywords] of Object.entries(CATEGORY_MAPPINGS)) {
      for (const keyword of keywords) {
        if (keyword.includes(word) || word.includes(keyword)) {
          return category;
        }
      }
    }
  }
  
  return null;
}

// Get all available categories from the database
export async function getDynamicCategories(): Promise<string[]> {
  try {
    const categories = await getInsuranceTypes();
    return categories;
  } catch (error) {
    console.error('Error fetching dynamic categories:', error);
    // Return static fallback if database is unavailable
    return Object.keys(CATEGORY_MAPPINGS);
  }
}

// Map user input to a valid category
export async function mapUserInputToCategory(userInput: string): Promise<{
  category: string | null;
  confidence: 'high' | 'medium' | 'low';
  availableCategories: string[];
}> {
  const availableCategories = await getDynamicCategories();
  
  // Clean the input
  const cleanInput = userInput.toLowerCase().trim();
  
  // Check if it's already a valid category
  if (availableCategories.includes(cleanInput)) {
    return {
      category: cleanInput,
      confidence: 'high',
      availableCategories
    };
  }
  
  // Try fuzzy matching
  const matchedCategory = findBestCategoryMatch(userInput);
  
  if (matchedCategory && availableCategories.includes(matchedCategory)) {
    return {
      category: matchedCategory,
      confidence: 'medium',
      availableCategories
    };
  }
  
  // No match found
  return {
    category: null,
    confidence: 'low',
    availableCategories
  };
}

// Generate category suggestions for the AI
export async function getCategorySuggestions(): Promise<string> {
  const categories = await getDynamicCategories();
  
  // Map database categories to user-friendly names
  const friendlyNames = categories.map(cat => {
    switch(cat) {
      case 'laboral_empresarial': return 'empresarial/laboral';
      case 'agricola_rural': return 'agrícola/rural';
      case 'salud especializada': return 'salud especializada';
      case 'vida_financiera': return 'vida/financiero';
      case 'nuevas tecnologías y digitales': return 'tecnología/digital';
      case 'mascotas y objetos': return 'mascotas y objetos';
      default: return cat;
    }
  });
  
  return friendlyNames.join(', ');
}
