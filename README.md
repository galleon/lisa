# Document-Aware Chat

This is a full-stack web application that allows users to upload documents and chat with an AI that uses the documents as a knowledge base.

## Features

- **Document Upload:** Supports uploading of `.txt`, `.pdf`, and `.docx` files.
- **Asynchronous Processing:** Documents are processed in the background to extract text and generate embeddings without blocking the UI.
- **Real-time Progress:** Track the progress of document processing in real-time.
- **Context-Aware Chat:** Chat with an AI that uses your uploaded documents as a knowledge base.
- **Streaming Responses:** Get real-time responses from the AI as they are being generated.
- **Source Attribution:** See which parts of your documents were used to generate the response.
- **User Statistics:** View basic statistics about your usage.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/replit/ai-starter-template.git
   cd ai-starter-template
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env` file in the root of the project.
   - You will need to add an `OPENAI_API_KEY`. You can get one from [OpenAI](https://platform.openai.com/account/api-keys).
   ```
   OPENAI_API_KEY="your-openai-api-key"
   ```

### Running the Application

- **Development:**
  ```sh
  npm run dev
  ```
  This will start the development server with hot-reloading.

- **Production:**
  ```sh
  npm run build
  npm start
  ```
