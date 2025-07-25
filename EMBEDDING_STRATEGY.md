# Document Embedding Strategy Explanation

## Current Implementation (CORRECT - Multiple Embeddings Per Document)

The system **correctly** generates multiple embeddings per document, not just one. Here's the detailed flow:

### Step 1: Document Upload
- User uploads a document (PDF, DOCX, or TXT)
- Document metadata is stored with `status: "processing"`

### Step 2: Text Extraction (25% progress)
```typescript
const processed = await processDocument(buffer, mimetype, originalname);
```
- Extracts raw text from the file
- For TXT: Direct UTF-8 conversion
- For PDF/DOCX: Uses appropriate parsers (currently placeholders)

### Step 3: Text Chunking
```typescript
async function chunkDocument(content: string, filename: string)
```
**Chunking Strategy:**
- Splits text by paragraphs (`\n\s*\n`)
- Combines paragraphs into ~500 character chunks
- Each chunk gets metadata (source, chunkIndex, length)
- **Result: Multiple chunks per document**

### Step 4: Multiple Embedding Generation (50% progress)
```typescript
const chunksWithEmbeddings = await generateChunkEmbeddings(processed.chunks);
```
**For each chunk:**
```typescript
for (const chunk of chunks) {
  const embedding = await generateEmbedding(chunk.content); // OpenAI API call
  chunksWithEmbeddings.push({
    ...chunk,
    embedding, // 1536-dimensional vector
  });
}
```
- **Each chunk gets its own embedding vector**
- Uses OpenAI's `text-embedding-ada-002` model
- Creates 1536-dimensional vectors per chunk
- **One document = Multiple embeddings**

### Step 5: Storage (75% progress)
```typescript
for (const chunkData of chunksWithEmbeddings) {
  await storage.createChunk({
    documentId: document.id,
    content: chunkData.content,
    embedding: chunkData.embedding, // Individual embedding per chunk
    metadata: chunkData.metadata,
  });
}
```
- Each chunk stored separately in `chunks` table
- Each chunk has its own embedding vector
- All chunks reference the parent document

## Vector Search Process

When user asks a question:

1. **Query Embedding**: User question gets embedded
2. **Similarity Search**: Compare query embedding against ALL chunk embeddings
3. **Retrieval**: Find most relevant chunks across all documents
4. **Context Assembly**: Combine relevant chunks for AI response

```typescript
export async function findSimilarChunks(queryEmbedding: number[], limit: number = 5) {
  // Compare against ALL chunk embeddings, not document embeddings
  return chunks.sort(by_cosine_similarity).slice(0, limit);
}
```

## Why This Strategy is Correct

✅ **Granular Retrieval**: Can find specific sections within large documents
✅ **Better Relevance**: Matches query to exact relevant paragraph, not entire document
✅ **Scalable**: Works with documents of any size
✅ **Precise Context**: AI gets only the most relevant text chunks

## Example

**Document**: "AI in Healthcare" (1,889 characters)
**Result**: 
- Chunk 1: "Introduction + Medical Imaging" (500 chars) → Embedding Vector 1
- Chunk 2: "Drug Discovery + Predictive Analytics" (500 chars) → Embedding Vector 2  
- Chunk 3: "NLP + Robotic Surgery" (500 chars) → Embedding Vector 3
- Chunk 4: "Future Challenges" (389 chars) → Embedding Vector 4

**Query**: "What about medical imaging?"
**Match**: Chunk 1 embedding is most similar → Returns that specific chunk

This is the **industry standard RAG approach** and is implemented correctly in the current system.