import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';


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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load constitutional embeddings from your public folder
async function loadConstitutionEmbeddings(): Promise<ConstitutionSection[]> {
  try {
    // In production, you might want to use a different approach

    const filePath = path.join(process.cwd(), 'public', 'constitution_embeddings.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading constitution embeddings:', error);
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

// Get embeddings for user query
async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // Use the appropriate model for embeddings
      input: query,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error getting query embedding:', error);
    return [];
  }
}

// Find relevant constitutional sections
async function findRelevantSections(query: string, topK: number = 3): Promise<ConstitutionSectionWithSimilarity[]> {
  const constitutionData = await loadConstitutionEmbeddings();
  
  // If your JSON doesn't have embeddings yet, we'll skip semantic search for now
  if (!constitutionData.length || !constitutionData[0]?.embedding) {
    // Return first few sections as fallback with similarity 0
    return constitutionData.slice(0, topK).map(section => ({
      ...section,
      similarity: 0
    }));
  }

  const queryEmbedding = await getQueryEmbedding(query);
  
  if (queryEmbedding.length === 0) {
    return constitutionData.slice(0, topK).map(section => ({
      ...section,
      similarity: 0
    }));
  }

  // Calculate similarities and return top matches
  const similarities: ConstitutionSectionWithSimilarity[] = constitutionData
    .filter((section: ConstitutionSection) => section.embedding && section.embedding.length > 0)
    .map((section: ConstitutionSection) => ({
      ...section,
      similarity: cosineSimilarity(queryEmbedding, section.embedding!)
    }))
    .sort((a: ConstitutionSectionWithSimilarity, b: ConstitutionSectionWithSimilarity) => b.similarity - a.similarity)
    .slice(0, topK);

  return similarities;
}

// Main API handler - this handles POST requests to /api/chat
export async function POST(request: NextRequest) {
  try {
    const { message, chatHistory } = await request.json();

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // Find relevant constitutional sections (if embeddings are available)
    const relevantSections = await findRelevantSections(message);
    
    // Build context from relevant sections
    const context = relevantSections
      .map((section: ConstitutionSectionWithSimilarity) => {
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
      .join(', ');

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

Please provide a helpful, accurate response based on constitutional knowledge, and cite the relevant section numbers in your answer.
`;

    // Build conversation history (keep last 10 messages for context)
    const conversationHistory = (chatHistory || [])
      .slice(-10)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      }));

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4.1", // or "gpt-3.5-turbo" if you prefer
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message }
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const assistantResponse = response.choices[0]?.message?.content || 
      "I apologize, but I couldn't generate a response. Please try again.";

    return NextResponse.json({ 
      response: assistantResponse,
      relevantSections: relevantSections.map((s: ConstitutionSectionWithSimilarity) => ({
        section: s.section || 'Unknown',
        chapter: s.chapter || 'Unknown',
        similarity: s.similarity || 0
      })),
      sectionNumbers
    });

  } catch (error) {
    console.error('Error in chat API:', error);
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