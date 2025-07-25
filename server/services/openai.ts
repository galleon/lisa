import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function generateChatResponse(
  query: string,
  context: string[],
  chatHistory: Array<{ role: string; content: string }>
): Promise<string> {
  try {
    const contextString = context.join("\n\n");
    
    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided document context. 
Use the context to provide accurate, detailed answers. If the context doesn't contain enough information to answer the question, say so clearly.
Always cite which parts of the context you're using in your response.

Context:
${contextString}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: query }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      max_tokens: 1000,
      temperature: 0.1,
    });

    return response.choices[0].message.content || "I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw new Error("Failed to generate response");
  }
}

export async function streamChatResponse(
  query: string,
  context: string[],
  chatHistory: Array<{ role: string; content: string }>
): Promise<AsyncIterable<string>> {
  try {
    const contextString = context.join("\n\n");
    
    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided document context. 
Use the context to provide accurate, detailed answers. If the context doesn't contain enough information to answer the question, say so clearly.
Always cite which parts of the context you're using in your response.

Context:
${contextString}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-10),
      { role: "user", content: query }
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      max_tokens: 1000,
      temperature: 0.1,
      stream: true,
    });

    return (async function* () {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    })();
  } catch (error) {
    console.error("Error streaming chat response:", error);
    throw new Error("Failed to stream response");
  }
}
