import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Send, Lightbulb, Database, Mic, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      setIsStreaming(true);
      
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let assistantMessage = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "chunk") {
                assistantMessage += data.content;
                // You could update a streaming message in real-time here
              } else if (data.type === "sources") {
                // Handle sources
              } else if (data.type === "done") {
                setIsStreaming(false);
                queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
                queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
                return;
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    },
    onError: (error: Error) => {
      setIsStreaming(false);
      toast({
        title: "Failed to send message",
        description: error.message || "An error occurred while sending your message",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending || isStreaming) return;

    sendMessageMutation.mutate(message.trim());
    setMessage("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const isDisabled = !message.trim() || sendMessageMutation.isPending || isStreaming;

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              className="resize-none min-h-[44px] max-h-32 pr-12"
              rows={1}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isDisabled}
              className="absolute right-2 bottom-2 h-8 w-8 p-0"
            >
              {sendMessageMutation.isPending || isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Input Actions */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span className="flex items-center">
                <Lightbulb className="h-3 w-3 mr-1" />
                Press Enter to send
              </span>
              <span className="flex items-center">
                <Database className="h-3 w-3 mr-1" />
                {stats?.chunkCount || 0} chunks available
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
                title="Voice input (coming soon)"
                disabled
              >
                <Mic className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
                title="Attach file (coming soon)"
                disabled
              >
                <Paperclip className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
