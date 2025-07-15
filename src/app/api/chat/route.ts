import { createOpenAI } from '@ai-sdk/openai';
import { embed, streamText } from 'ai';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Configure the API route to accept larger request bodies.
// This is crucial for long chat histories or long user inputs.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // Adjust this value as needed, e.g., '1mb', '5mb', '10mb'
    },
  },
};

// Define types for better TypeScript support
interface ConstitutionSection {
  section?: string;
  chapter?: string;
  part?: string;
  content?: string;
  embedding?: number[];
}

interface ConstitutionSectionWithSimilarity extends ConstitutionSection {
  similarity: number;
}

// Initialize the OpenAI provider instance using the explicit factory
// Ensure OPENAI_API_KEY is set in your .env.local file
const openAIProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load constitutional embeddings from your public folder
// This function can be cached for better performance across requests
let constitutionData: ConstitutionSection[] | null = null;
async function loadConstitutionEmbeddings(): Promise<ConstitutionSection[]> {
  if (constitutionData) {
    return constitutionData;
  }
  try {
    const filePath = path.join(process.cwd(), 'public', 'constitution_embeddings.json');
    // Use fs.promises.readFile for async file reading, better for Next.js API routes
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    constitutionData = JSON.parse(fileContent);
    return constitutionData!;
  } catch (error) {
    console.error('Error loading constitution embeddings:', error);
    // Return an empty array if the file is not found or parsing fails
    // This allows the rest of the logic to proceed without embeddings
    return [];
  }
}

// Simple cosine similarity function for finding relevant sections
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Get embeddings for user query using the Vercel AI SDK
async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openAIProvider.embedding('text-embedding-3-small'), // Using the embedding model
      value: query,
    });
    return embedding;
  } catch (error) {
    console.error('Error getting query embedding:', error);
    return [];
  }
}

// Find relevant constitutional sections based on query embedding
async function findRelevantSections(query: string, topK: number = 3): Promise<ConstitutionSectionWithSimilarity[]> {
  const allSections = await loadConstitutionEmbeddings();

  // If no sections or no embeddings in the first section (implies no embeddings loaded)
  if (!allSections.length || !allSections[0]?.embedding) {
    console.warn('No constitution embeddings loaded or available. Returning empty relevant sections.');
    return []; // Return empty array if no embeddings are available
  }

  const queryEmbedding = await getQueryEmbedding(query);

  if (queryEmbedding.length === 0) {
    console.warn('Query embedding could not be generated. Returning empty relevant sections.');
    return []; // Return empty array if query embedding failed
  }

  const similarities: ConstitutionSectionWithSimilarity[] = allSections
    // Filter out sections without valid embeddings to prevent errors in cosineSimilarity
    .filter((section): section is Required<ConstitutionSection> => !!section.embedding && section.embedding.length > 0)
    .map((section) => ({
      ...section,
      similarity: cosineSimilarity(queryEmbedding, section.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity) // Sort by similarity in descending order
    .slice(0, topK); // Get the top K most similar sections

  return similarities;
}

// Main API handler - this handles POST requests to /api/chat
export async function POST(req: Request) {
  try {
    // Destructure `messages` from the client request body
    // The `useChat` hook sends `messages` as an array of AI SDK `Message` objects
    const { messages } = await req.json();

    // The latest message is always the last one in the `messages` array from `useChat`
    const latestMessage = messages[messages.length - 1]?.content;

    if (!latestMessage) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please check your .env.local file.' },
        { status: 500 }
      );
    }

    const relevantSections = await findRelevantSections(latestMessage);

    // Construct context string from relevant sections
    const context = relevantSections
      .map(section => {
        const parts: string[] = [];
        if (section.section) parts.push(`Section: ${section.section}`);
        if (section.chapter) parts.push(`Chapter: ${section.chapter}`);
        if (section.part) parts.push(`Part: ${section.part}`);
        if (section.content) parts.push(`Content: ${section.content}`);
        return parts.join('\n');
      })
      .join('\n\n---\n\n');

    const sectionNumbers = relevantSections
      .map(s => s.section)
      .filter(Boolean)
      // Sanitize the section numbers to ensure they only contain ASCII characters
      // This is crucial for HTTP headers which must be ByteStrings
      .map(s => String(s).replace(/[^\x00-\x7F]/g, '')) // Remove non-ASCII characters
      .join(', ');

    // System prompt for the AI assistant
    const systemPrompt = `You are AskAussie, an expert AI assistant specializing in the Australian Constitution. You help users understand the Commonwealth of Australia Constitution Act.
Your role is to:
1. Provide accurate information about the Australian Constitution
2. Explain constitutional concepts clearly and accessibly
3. Reference specific sections when relevant
4. Help users understand constitutional rights and government structure
5. Maintain a professional but friendly tone
Guidelines:
- Always base responses on actual constitutional text when possible
- Cite specific sections when relevant (e.g., "Section 51 of the Constitution...")
- Explain legal concepts in plain English
- If unsure about something, acknowledge limitations
- Focus specifically on the Australian Constitution
- Be helpful for citizens, students, and legal professionals
Relevant constitutional sections for this query: ${sectionNumbers}
${context ? `Details:\n${context}` : ''}
Please provide a helpful, accurate response based on constitutional knowledge, and cite the relevant section numbers in your answer.`;

    // Use the `messages` array directly from the client, as `useChat` already manages history
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages // `messages` array from useChat already includes the full history + latest user message
    ];

    // Stream the text response from OpenAI
    const result = await streamText({
      model: openAIProvider.chat("gpt-4.1"), // Using a valid, current model name
      messages: conversationMessages,
      maxTokens: 1000,
      temperature: 0.1, // Lower temperature for more factual/less creative responses
    });

    // Return the data stream response. This is crucial for the frontend's useChat hook.
    // Headers can be added here if you want to pass metadata to the client.
    return result.toDataStreamResponse({
      headers: {
        'x-relevant-sections': sectionNumbers, // Example: Pass relevant section numbers as a header
      }
    });

  } catch (error: unknown) { // Changed from 'any' to 'unknown'
    console.error('Error in chat API:', error);

    // Check if the error is a standard Error object to safely access its properties
    if (error instanceof Error) {
      console.error('Error Message:', error.message);
      console.error('Stack:', error.stack);

      // You can still check for API-specific properties after confirming it's an object
      // This is a simple way to check for properties on an unknown object
      const errorAsObject = error as { [key: string]: any };
      if (errorAsObject.name === 'APIError' || (errorAsObject.status && errorAsObject.headers)) {
        console.error('--- OpenAI API Error Details ---');
        console.error('Status:', errorAsObject.status);
        if (errorAsObject.code) console.error('Code:', errorAsObject.code);
        if (errorAsObject.param) console.error('Param:', errorAsObject.param);
        if (errorAsObject.type) console.error('Type:', errorAsObject.type);
      }
    } else {
      // Handle cases where the thrown value is not an Error object
      console.error('Unknown error type:', error);
    }

    // Provide a generic error message to the client for security and simplicity
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods if needed
export async function GET() {
  return NextResponse.json({ message: "Chat API is running" });
}
