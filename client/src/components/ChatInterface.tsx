import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import { Bot, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatInterface() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/chat/messages");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      toast({
        title: "Chat cleared",
        description: "Chat history has been cleared successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Clear failed",
        description: error.message || "Failed to clear chat history",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center mr-3">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-500">Ready to answer questions from your documents</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-500">
            {stats && (
              <span>{(stats.totalTokensUsed / 1000).toFixed(1)}K tokens used</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearChatMutation.mutate()}
            disabled={clearChatMutation.isPending}
            className="text-gray-400 hover:text-gray-600"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages />
      </div>

      {/* Chat Input */}
      <ChatInput />
    </div>
  );
}
