import { NextResponse } from 'next/server';
import { generateRoadmap } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    // Env status logs
    console.log('OpenAI Key status:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    console.log('VALIDATE_OPENAI_RESPONSE:', process.env.VALIDATE_OPENAI_RESPONSE ?? 'undefined (default=true)');

    const body = await request.json();
    console.log('Request body:', body);

    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      console.log('Missing or invalid prompt in request');
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('Attempting to generate roadmap with prompt:', prompt);

    let roadmapContent: string;
    try {
      roadmapContent = await generateRoadmap(prompt);
      // Quick sanity-check: ensure the returned string is valid JSON before we send it to the client
      try {
        JSON.parse(roadmapContent);
      } catch {
        console.error('Sanity-check failed – raw OpenAI content is not valid JSON:', roadmapContent);
        throw new Error('OpenAI returned malformed JSON');
      }
    } catch (gError: unknown) {
      console.error('generateRoadmap threw error:', (gError as Error)?.message || gError);
      // If OpenAI APIError, surface status and body
      if ((gError as any)?.status) {
        console.error('OpenAI status:', (gError as any).status);
      }
      if ((gError as any)?.response) {
        try {
          const errorJson = await (gError as any).response.json();
          console.error('OpenAI error response JSON:', errorJson);
        } catch {
          console.error('OpenAI error response text:', await (gError as any).response.text());
        }
      }
      throw gError;
    }

    console.log('Roadmap generated successfully, length:', roadmapContent.length);

    return NextResponse.json({ roadmap: roadmapContent });
  } catch (error: unknown) {
    // Detailed error logging
    console.error('Error in roadmap generation:', {
      message: (error as Error)?.message || 'Unknown error',
      stack: (error as Error)?.stack,
    });

    return NextResponse.json(
      { error: 'Failed to generate roadmap', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 