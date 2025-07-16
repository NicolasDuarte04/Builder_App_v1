import pdf from 'pdf-parse';

export interface PolicyAnalysis {
  policyType: string;
  premium: {
    amount: number;
    currency: string;
    frequency: string;
  };
  coverage: {
    limits: Record<string, number>;
    deductibles: Record<string, number>;
    exclusions: string[];
  };
  policyDetails: {
    policyNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    insured: string[];
  };
  keyFeatures: string[];
  recommendations: string[];
  riskScore: number; // 1-10 scale
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function analyzeInsurancePolicy(pdfText: string): Promise<PolicyAnalysis> {
  // This would be called by the AI to analyze the policy
  // For now, return a mock analysis
  return {
    policyType: "Health Insurance",
    premium: {
      amount: 150000,
      currency: "COP",
      frequency: "monthly"
    },
    coverage: {
      limits: {
        "Hospitalization": 50000000,
        "Outpatient": 10000000,
        "Medications": 5000000
      },
      deductibles: {
        "General": 50000,
        "Specialists": 100000
      },
      exclusions: [
        "Pre-existing conditions",
        "Cosmetic procedures",
        "Experimental treatments"
      ]
    },
    policyDetails: {
      policyNumber: "POL-2024-001",
      effectiveDate: "2024-01-01",
      expirationDate: "2024-12-31",
      insured: ["John Doe", "Jane Doe"]
    },
    keyFeatures: [
      "Network coverage nationwide",
      "Telemedicine included",
      "Prescription drug coverage",
      "Preventive care at 100%"
    ],
    recommendations: [
      "Consider increasing outpatient coverage",
      "Review medication coverage limits",
      "Add dental coverage if needed"
    ],
    riskScore: 7
  };
} 