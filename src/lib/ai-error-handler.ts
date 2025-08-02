import { toast } from "@/hooks/use-toast";

interface ToolError {
  toolName: string;
  error: any;
  context?: Record<string, any>;
}

export class AIToolError extends Error {
  constructor(
    public toolName: string,
    public originalError: any,
    public context?: Record<string, any>
  ) {
    super(`AI Tool Error in ${toolName}: ${originalError?.message || 'Unknown error'}`);
    this.name = 'AIToolError';
  }
}

// Centralized error logger for AI tools
export function logToolError({ toolName, error, context }: ToolError) {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    toolName,
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    context,
    type: error?.constructor?.name || 'Error'
  };

  // Log to console with structured format
  console.error(`🔴 AI Tool Error [${toolName}]`, errorDetails);

  // In development, log full error object
  if (process.env.NODE_ENV === 'development') {
    console.error('Full error object:', error);
  }

  // Send to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry, LogRocket, etc.
  }
}

// Wrapper for safe tool execution with error handling
export async function executeTool<T>(
  toolName: string,
  toolFunction: () => Promise<T>,
  fallbackValue: T,
  context?: Record<string, any>
): Promise<T> {
  try {
    console.log(`🔧 Executing tool: ${toolName}`, context);
    const result = await toolFunction();
    console.log(`✅ Tool ${toolName} completed successfully`);
    return result;
  } catch (error) {
    logToolError({ toolName, error, context });
    
    // Throw AIToolError for upstream handling
    throw new AIToolError(toolName, error, context);
  }
}

// Client-side error handler for displaying user-friendly messages
export function handleAIError(error: any, showToast: boolean = true) {
  let userMessage = "Lo sentimos, ocurrió un error al procesar tu solicitud.";
  let technicalDetails = "";

  if (error instanceof AIToolError) {
    switch (error.toolName) {
      case 'get_insurance_plans':
        userMessage = "No pudimos obtener los planes de seguro en este momento.";
        break;
      case 'analyze_policy':
        userMessage = "Error al analizar la póliza. Por favor, intenta de nuevo.";
        break;
      case 'save_policy':
        userMessage = "No se pudo guardar el análisis. Verifica tu conexión.";
        break;
      default:
        userMessage = `Error en ${error.toolName}. Por favor, intenta de nuevo.`;
    }
    technicalDetails = error.originalError?.message || "";
  } else if (error?.message) {
    technicalDetails = error.message;
  }

  if (showToast && typeof window !== 'undefined') {
    // This will only run on the client side
    const toastMessage = process.env.NODE_ENV === 'development' && technicalDetails
      ? `${userMessage}\n\nDetalles: ${technicalDetails}`
      : userMessage;

    // Note: This assumes toast is available in the component context
    console.error('Toast message:', toastMessage);
  }

  return {
    userMessage,
    technicalDetails,
    isRetryable: !error?.message?.includes('401') && !error?.message?.includes('403')
  };
}