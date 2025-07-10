import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Export a function to generate roadmap based on user prompt
export async function generateRoadmap(prompt: string) {
  try {
    console.log('Creating OpenAI chat completion with prompt:', prompt);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a project roadmap generator. Your task is to create structured roadmap steps for software development projects.
          
Your response should be a JSON object with the following structure:
{
  "steps": [
    {
      "title": "Project Setup",
      "description": "Initialize repository and install core dependencies",
      "dependencies": [],
      "estimatedTime": 2,
      "priority": "high",
      "category": "setup"
    }
  ],
  "title": "Project Name",
  "description": "Brief project description"
}

Requirements:
- title: A concise name for the step (string)
- description: Detailed explanation of what needs to be done (string)
- dependencies: Array of step numbers this step depends on (number[])
- estimatedTime: Estimated time in hours (number)
- priority: Must be exactly "high", "medium", or "low" (string)
- category: Must be exactly "setup", "development", "testing", "deployment", or "maintenance" (string)

Always return a valid JSON object with all required fields.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }
    
    console.log('Raw OpenAI response:', content);

    // Enable or disable validation via environment variable
    const shouldValidate = process.env.VALIDATE_OPENAI_RESPONSE !== 'false';
    if (!shouldValidate) {
      console.warn('Skipping OpenAI response validation (VALIDATE_OPENAI_RESPONSE=false)');
      return content;
    }

    // Validate response format (only if enabled)
    try {
      const parsed = JSON.parse(content);
      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        throw new Error('Response missing steps array');
      }
      
      // Validate each step
      parsed.steps.forEach((step: any, index: number) => {
        if (!step.title || typeof step.title !== 'string') {
          throw new Error(`Step ${index + 1} missing or invalid title`);
        }
        if (!step.description || typeof step.description !== 'string') {
          throw new Error(`Step ${index + 1} missing or invalid description`);
        }
        if (!Array.isArray(step.dependencies)) {
          throw new Error(`Step ${index + 1} missing or invalid dependencies array`);
        }
        if (typeof step.estimatedTime !== 'number') {
          throw new Error(`Step ${index + 1} missing or invalid estimatedTime`);
        }
        if (!['high', 'medium', 'low'].includes(step.priority)) {
          throw new Error(`Step ${index + 1} invalid priority value`);
        }
        if (!['setup', 'development', 'testing', 'deployment', 'maintenance'].includes(step.category)) {
          throw new Error(`Step ${index + 1} invalid category value`);
        }
      });

      console.log('OpenAI response validated successfully');
      return content;
    } catch (error) {
      console.error('Response validation failed:', error);
      throw new Error(`Invalid response format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error in OpenAI request:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      prompt,
    });
    
    // Enhance error message for common issues
    if (error instanceof OpenAI.APIError) {
      switch (error.code) {
        case 'rate_limit_exceeded':
          throw new Error('Rate limit exceeded. Please try again in a few seconds.');
        case 'invalid_request_error':
          throw new Error('Invalid request. Please check your input and try again.');
        case 'context_length_exceeded':
          throw new Error('Input too long. Please provide a shorter description.');
        default:
          throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
    
    throw error;
  }
}

export default openai; 