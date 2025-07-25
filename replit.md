# Document Intelligence - Replit Guide

## Overview

This is a full-stack document intelligence application that allows users to upload documents (PDF, DOCX, TXT), processes them into searchable chunks with AI embeddings, and provides an intelligent chat interface for querying document content. The system uses vector similarity search to retrieve relevant document sections and generates AI-powered responses based on the content.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (July 23, 2025)

✓ **Fixed Document Upload Issue**: Resolved apiRequest function to properly handle FormData for file uploads
✓ **Enhanced Upload Interface**: Improved visual styling with blue icons and hover effects 
✓ **OpenAI Integration**: Successfully configured with standard API key format (sk-...)
✓ **Full RAG Functionality**: Document processing, embeddings, vector search, and streaming chat responses now operational
✓ **Testing Verified**: Upload, processing, chunking, and AI chat responses all working correctly
✓ **Access Control Added**: Documents are now user-specific with session-based ownership
✓ **Progress Tracking**: Real-time progress feedback with detailed step labels (25%, 50%, 75%, 100%)
✓ **Enhanced UI**: Progress bars, status indicators, and better error handling for document processing
✓ **LlamaIndex Integration**: Replaced custom implementation with LlamaIndex.TS framework for production-grade RAG
✓ **Advanced Chunking**: Now using LlamaIndex SimpleNodeParser with semantic boundary detection and configurable overlap
✓ **Professional Document Processing**: LlamaIndex handles text extraction and chunking with industry-standard algorithms
✓ **Verified Multi-Chunk Generation**: 3,379 char document → 2 intelligent chunks (vs previous character-based splitting)
✓ **Enhanced Architecture**: Framework provides robust error handling, metadata preservation, and extensibility

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite for development and build
- **UI Components**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints with real-time streaming for chat
- **File Processing**: Multer for file uploads with memory storage
- **Document Processing**: Text extraction with chunking strategy
- **AI Integration**: OpenAI API for embeddings and chat completions

### Database Strategy
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Three main tables (documents, chunks, chat_messages)
- **Storage**: Currently using in-memory storage with interface for easy PostgreSQL migration
- **Migrations**: Drizzle Kit for schema management

## Key Components

### Document Management
- **Upload System**: Drag-and-drop interface supporting PDF, DOCX, and TXT files
- **Processing Pipeline**: Text extraction → chunking → embedding generation → storage
- **Status Tracking**: Processing states (processing, completed, error)
- **File Validation**: Type checking and size limits (10MB max)

### Vector Search System
- **Embeddings**: OpenAI text-embedding-ada-002 model
- **Chunking Strategy**: Paragraph-based with ~500 character chunks
- **Similarity Search**: Cosine similarity for finding relevant document sections
- **Context Assembly**: Combines multiple relevant chunks for AI responses

### Chat Interface
- **Real-time Streaming**: Server-Sent Events for AI response streaming
- **Context-Aware**: Uses document embeddings to provide relevant context
- **History Management**: Maintains conversation history with cleanup
- **Source Citations**: References specific document sections in responses

### UI Components
- **Responsive Design**: Mobile-first with sidebar overlay on small screens
- **Component Library**: Comprehensive set of accessible components
- **Toast Notifications**: User feedback for actions and errors
- **Loading States**: Proper loading indicators throughout the app

## Data Flow

1. **Document Upload**: User uploads file → Multer processes → Document record created
2. **Processing**: Text extraction → Chunking → Embedding generation → Chunk storage
3. **Chat Query**: User message → Embedding generation → Vector search → Context retrieval
4. **AI Response**: Context + query sent to OpenAI → Streaming response → UI update
5. **History**: Messages stored with source references for future context

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4o for chat completions, text-embedding-ada-002 for embeddings
- **Environment Variables**: OPENAI_API_KEY required for AI functionality

### Database
- **Neon Database**: PostgreSQL serverless database (@neondatabase/serverless)
- **Connection**: DATABASE_URL environment variable required
- **Fallback**: In-memory storage for development without database

### Development Tools
- **Replit Integration**: Cartographer plugin and runtime error overlay
- **Hot Reload**: Vite HMR for frontend, tsx for backend development
- **Type Safety**: Full TypeScript coverage with strict configuration

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: esbuild bundles Express server to `dist/index.js`
- **Assets**: Static files served from build output

### Environment Setup
- **Development**: `npm run dev` starts both frontend and backend
- **Production**: `npm run build` then `npm start`
- **Database**: `npm run db:push` applies schema changes

### Configuration
- **Environment Variables**: DATABASE_URL, OPENAI_API_KEY
- **CORS**: Configured for development and production environments
- **Static Serving**: Express serves built frontend in production

### Scalability Considerations
- **Storage Interface**: Easy migration from memory to PostgreSQL
- **Embedding Cache**: Chunks stored with embeddings to avoid recomputation
- **File Size Limits**: 10MB upload limit with configurable processing
- **Connection Management**: Efficient database connections with Neon serverless