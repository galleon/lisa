import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { z } from "zod";
import { storage } from "./storage.js";
import { processDocument, generateChunkEmbeddings } from "./services/documentProcessor.js";
import { generateEmbedding, streamChatResponse } from "./services/openai.js";
import { insertDocumentSchema, insertChatMessageSchema, updateDocumentProgressSchema } from "@shared/schema.js";

// Simple user session middleware
function getUserId(req: any): string {
  // For now, use a simple session-based approach
  // In production, this would integrate with proper authentication
  if (!req.session.userId) {
    req.session.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return req.session.userId;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get user documents
  app.get("/api/documents", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const documents = await storage.getUserDocuments(userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Upload document
  app.post("/api/documents/upload", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { originalname, mimetype, size, buffer } = req.file;
      const userId = getUserId(req);

      // Create document record with user ownership
      const document = await storage.createDocument({
        name: originalname,
        originalName: originalname,
        mimeType: mimetype,
        size,
        content: "",
        chunkCount: 0,
        status: "processing",
        progress: 0,
        userId,
      });

      res.json(document);

      // Process document asynchronously with progress tracking
      try {
        console.log(`[DEBUG] Processing document ${document.id}: ${originalname}`);
        
        // Step 1: Extract text (25% progress)
        await storage.updateDocumentProgress(document.id, 25, "processing");
        const processed = await processDocument(buffer, mimetype, originalname);
        console.log(`[DEBUG] Extracted text, created ${processed.chunks.length} chunks`);

        // Step 2: Generate embeddings (50% progress)
        await storage.updateDocumentProgress(document.id, 50);
        const chunksWithEmbeddings = await generateChunkEmbeddings(processed.chunks);
        console.log(`[DEBUG] Generated ${chunksWithEmbeddings.length} embeddings`);

        // Step 3: Save chunks (75% progress)
        await storage.updateDocumentProgress(document.id, 75);
        for (const chunkData of chunksWithEmbeddings) {
          await storage.createChunk({
            documentId: document.id,
            content: chunkData.content,
            embedding: chunkData.embedding,
            metadata: chunkData.metadata,
          });
        }
        console.log(`[DEBUG] Saved ${chunksWithEmbeddings.length} chunks to storage`);

        // Step 4: Complete (100% progress)
        await storage.updateDocument(document.id, {
          content: processed.content,
          chunkCount: chunksWithEmbeddings.length,
          status: "completed",
          progress: 100,
        });
        console.log(`[DEBUG] Document ${document.id} processing completed`);
      } catch (error) {
        console.error("Error processing document:", error);
        await storage.updateDocumentProgress(document.id, 0, "error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Get document progress
  app.get("/api/documents/:id/progress", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if user owns this document
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json({ 
        progress: document.progress, 
        status: document.status 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if user owns this document
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const success = await storage.deleteDocument(id);
      
      if (success) {
        res.json({ message: "Document deleted successfully" });
      } else {
        res.status(404).json({ message: "Document not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Get user chat messages
  app.get("/api/chat/messages", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const messages = await storage.getUserChatMessages(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send chat message
  app.post("/api/chat/send", async (req: any, res) => {
    try {
      const { content } = req.body;
      const userId = getUserId(req);
      
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Save user message
      await storage.createChatMessage({
        content,
        role: "user",
        sources: null,
        userId,
      });

      // Generate query embedding
      const queryEmbedding = await generateEmbedding(content);
      
      // Find similar chunks from user's documents only
      const similarChunks = await storage.findSimilarChunks(queryEmbedding, userId, 5);
      
      // Get user's chat history
      const chatHistory = await storage.getUserChatMessages(userId);
      const formattedHistory = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Set up Server-Sent Events
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      let fullResponse = "";
      const contextTexts = similarChunks.map(chunk => chunk.content);
      
      try {
        // Stream the response
        const responseStream = await streamChatResponse(content, contextTexts, formattedHistory);
        
        for await (const chunk of responseStream) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        }

        // Send sources information
        const sources = similarChunks.map(chunk => ({
          documentId: chunk.documentId,
          content: chunk.content.substring(0, 200) + "...",
          similarity: Math.round(chunk.similarity * 100),
          metadata: chunk.metadata,
        }));

        res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);

        // Save assistant message
        await storage.createChatMessage({
          content: fullResponse,
          role: "assistant",
          sources,
          userId,
        });

      } catch (error) {
        console.error("Error generating response:", error);
        res.write(`data: ${JSON.stringify({ type: "error", message: "Failed to generate response" })}\n\n`);
      }

      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Clear user chat history
  app.delete("/api/chat/messages", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      await storage.clearChatMessages(userId);
      res.json({ message: "Chat history cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Get user statistics
  app.get("/api/stats", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const documents = await storage.getUserDocuments(userId);
      const messages = await storage.getUserChatMessages(userId);
      
      // Count user's chunks
      let chunkCount = 0;
      for (const doc of documents) {
        const chunks = await storage.getChunksByDocument(doc.id);
        chunkCount += chunks.length;
      }
      
      res.json({
        documentCount: documents.length,
        chunkCount,
        messageCount: messages.length,
        totalTokensUsed: messages.length * 100, // Rough estimate
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
