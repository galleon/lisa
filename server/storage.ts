import { documents, chunks, chatMessages, type Document, type InsertDocument, type Chunk, type InsertChunk, type ChatMessage, type InsertChatMessage } from "@shared/schema";

export interface IStorage {
  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(userId?: string): Promise<Document[]>;
  getUserDocuments(userId: string): Promise<Document[]>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  updateDocumentProgress(id: number, progress: number, status?: string): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // Chunks
  createChunk(chunk: InsertChunk): Promise<Chunk>;
  getChunksByDocument(documentId: number): Promise<Chunk[]>;
  getAllChunks(): Promise<Chunk[]>;
  deleteChunksByDocument(documentId: number): Promise<boolean>;

  // Chat Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getAllChatMessages(userId?: string): Promise<ChatMessage[]>;
  getUserChatMessages(userId: string): Promise<ChatMessage[]>;
  clearChatMessages(userId?: string): Promise<boolean>;

  // Vector search with access control
  findSimilarChunks(embedding: number[], userId?: string, limit?: number): Promise<Array<Chunk & { similarity: number }>>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private chunks: Map<number, Chunk>;
  private chatMessages: Map<number, ChatMessage>;
  private currentDocumentId: number;
  private currentChunkId: number;
  private currentMessageId: number;

  constructor() {
    this.documents = new Map();
    this.chunks = new Map();
    this.chatMessages = new Map();
    this.currentDocumentId = 1;
    this.currentChunkId = 1;
    this.currentMessageId = 1;
  }

  // Documents
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = {
      ...insertDocument,
      chunkCount: insertDocument.chunkCount ?? 0,
      progress: insertDocument.progress ?? 0,
      status: insertDocument.status ?? "processing",
      userId: insertDocument.userId ?? null,
      id,
      uploadedAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(userId?: string): Promise<Document[]> {
    let docs = Array.from(this.documents.values());
    if (userId) {
      docs = docs.filter(doc => doc.userId === userId);
    }
    return docs.sort((a, b) => 
      new Date(b.uploadedAt!).getTime() - new Date(a.uploadedAt!).getTime()
    );
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return this.getAllDocuments(userId);
  }

  async updateDocumentProgress(id: number, progress: number, status?: string): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updates: Partial<Document> = { progress };
    if (status) updates.status = status;
    
    const updated = { ...document, ...updates };
    this.documents.set(id, updated);
    return updated;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updated = { ...document, ...updates };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const deleted = this.documents.delete(id);
    if (deleted) {
      // Also delete associated chunks
      await this.deleteChunksByDocument(id);
    }
    return deleted;
  }

  // Chunks
  async createChunk(insertChunk: InsertChunk): Promise<Chunk> {
    const id = this.currentChunkId++;
    const chunk: Chunk = {
      ...insertChunk,
      embedding: insertChunk.embedding ?? [],
      metadata: insertChunk.metadata ?? null,
      id,
      createdAt: new Date(),
    };
    this.chunks.set(id, chunk);
    return chunk;
  }

  async getChunksByDocument(documentId: number): Promise<Chunk[]> {
    return Array.from(this.chunks.values()).filter(chunk => chunk.documentId === documentId);
  }

  async getAllChunks(): Promise<Chunk[]> {
    return Array.from(this.chunks.values());
  }

  async deleteChunksByDocument(documentId: number): Promise<boolean> {
    const chunkIds = Array.from(this.chunks.values())
      .filter(chunk => chunk.documentId === documentId)
      .map(chunk => chunk.id);
    
    chunkIds.forEach(id => this.chunks.delete(id));
    return chunkIds.length > 0;
  }

  // Chat Messages
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentMessageId++;
    const message: ChatMessage = {
      ...insertMessage,
      sources: insertMessage.sources ?? null,
      userId: insertMessage.userId ?? null,
      id,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getAllChatMessages(userId?: string): Promise<ChatMessage[]> {
    let messages = Array.from(this.chatMessages.values());
    if (userId) {
      messages = messages.filter(msg => msg.userId === userId);
    }
    return messages.sort((a, b) => 
      new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
    );
  }

  async getUserChatMessages(userId: string): Promise<ChatMessage[]> {
    return this.getAllChatMessages(userId);
  }

  async clearChatMessages(userId?: string): Promise<boolean> {
    if (userId) {
      const userMessages = Array.from(this.chatMessages.values()).filter(msg => msg.userId === userId);
      userMessages.forEach(msg => this.chatMessages.delete(msg.id));
    } else {
      this.chatMessages.clear();
    }
    return true;
  }

  // Vector search using cosine similarity with access control
  async findSimilarChunks(queryEmbedding: number[], userId?: string, limit: number = 5): Promise<Array<Chunk & { similarity: number }>> {
    let chunks = Array.from(this.chunks.values()).filter(chunk => chunk.embedding && chunk.embedding.length > 0);
    
    // Filter chunks by user access if userId is provided
    if (userId) {
      const userDocuments = await this.getUserDocuments(userId);
      const userDocumentIds = new Set(userDocuments.map(doc => doc.id));
      chunks = chunks.filter(chunk => userDocumentIds.has(chunk.documentId));
    }
    
    const similarities = chunks.map(chunk => {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding!);
      return { ...chunk, similarity };
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const storage = new MemStorage();
