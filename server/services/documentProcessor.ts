import { 
  Document,
  VectorStoreIndex, 
  SimpleNodeParser,
  Settings
} from "llamaindex";

// Configure LlamaIndex settings using @llamaindex/openai
import { OpenAI } from "@llamaindex/openai";

Settings.llm = new OpenAI({
  model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a document from buffer content
async function createDocumentFromBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<Document> {
  let text = '';
  
  if (mimeType === 'application/pdf') {
    // Extract text from PDF using basic pattern matching
    const bufferStr = buffer.toString('latin1');
    const textMatches = bufferStr.match(/\(([^)]+)\)/g);
    
    if (textMatches) {
      text = textMatches
        .map(match => match.slice(1, -1))
        .filter(text => text.length > 2 && /[a-zA-Z]/.test(text))
        .join(' ');
    }
    
    // Clean up extracted text
    text = text.replace(/\s+/g, ' ').trim();
    
    // If extraction failed, use fallback content for PDFs
    if (text.length < 100) {
      text = `Document content could not be extracted from PDF: ${filename}. This appears to be a PDF file that requires specialized parsing.`;
    }
  } else if (mimeType === 'text/plain') {
    text = buffer.toString('utf8');
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // Basic DOCX handling - in production you'd use a proper DOCX parser
    text = buffer.toString('utf8');
    
    // If direct conversion doesn't work, provide fallback
    if (!/[a-zA-Z]/.test(text) || text.length < 50) {
      text = `Document content from DOCX file: ${filename}. This file requires specialized parsing for full text extraction.`;
    }
  }
  
  console.log(`[DEBUG] LlamaIndex: Extracted ${text.length} characters from ${filename}`);
  
  return new Document({
    text,
    metadata: {
      filename,
      mimeType,
      source: filename
    }
  });
}

// LlamaIndex-powered chunking
async function createLlamaIndexChunks(document: Document): Promise<any[]> {
  const nodeParser = new SimpleNodeParser({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  
  const nodes = await nodeParser.getNodesFromDocuments([document]);
  console.log(`[DEBUG] LlamaIndex: Created ${nodes.length} chunks from document`);
  
  return nodes;
}

export interface ProcessedDocument {
  content: string;
  chunks: Array<{
    content: string;
    metadata: any;
  }>;
}

export async function processDocument(fileBuffer: Buffer, mimeType: string, filename: string): Promise<ProcessedDocument> {
  try {
    console.log(`[DEBUG] Processing document ${filename} with LlamaIndex`);
    
    // Create LlamaIndex document
    const document = await createDocumentFromBuffer(fileBuffer, filename, mimeType);
    
    // Use LlamaIndex to create chunks
    const nodes = await createLlamaIndexChunks(document);
    
    // Convert LlamaIndex nodes to our format
    const chunks = nodes.map((node, index) => ({
      content: node.text || node.getContent(),
      metadata: {
        source: filename,
        chunkIndex: index,
        nodeId: node.id_,
        ...node.metadata
      }
    }));
    
    console.log(`[DEBUG] Extracted text, created ${chunks.length} chunks`);
    
    return {
      content: document.text,
      chunks,
    };
  } catch (error) {
    console.error("Error processing document:", error);
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Keep the existing embedding generation function but import from our OpenAI service
import { generateEmbedding } from "./openai.js";

export async function generateChunkEmbeddings(chunks: Array<{ content: string; metadata: any }>): Promise<Array<{ content: string; metadata: any; embedding: number[] }>> {
  const chunksWithEmbeddings = [];
  
  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.content);
      chunksWithEmbeddings.push({
        ...chunk,
        embedding,
      });
    } catch (error) {
      console.error(`Error generating embedding for chunk: ${error instanceof Error ? error.message : String(error)}`);
      // Continue processing other chunks even if one fails
      chunksWithEmbeddings.push({
        ...chunk,
        embedding: [],
      });
    }
  }
  
  console.log(`[DEBUG] Generated ${chunksWithEmbeddings.length} embeddings`);
  return chunksWithEmbeddings;
}

// Optional: LlamaIndex-powered query engine for future use
export async function createQueryEngine(chunks: Array<{ content: string; metadata: any; embedding: number[] }>) {
  try {
    // Convert chunks back to LlamaIndex documents for indexing
    const documents = chunks.map(chunk => new Document({
      text: chunk.content,
      metadata: chunk.metadata
    }));
    
    // Create vector index
    const index = await VectorStoreIndex.fromDocuments(documents);
    const queryEngine = index.asQueryEngine();
    
    return queryEngine;
  } catch (error) {
    console.error("Error creating LlamaIndex query engine:", error);
    return null;
  }
}