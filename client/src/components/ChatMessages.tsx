import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Bot, User, FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage } from "@shared/schema";

export default function ChatMessages() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 1000, // Refetch every second to get new messages
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const messageTime = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex items-start space-x-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-20 w-full max-w-3xl rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Welcome Message */}
      {(!messages || messages.length === 0) && (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-lg p-4 max-w-3xl">
              <p className="text-gray-800">
                Welcome! I'm your AI assistant. I can help you find information from your uploaded documents. 
                Try asking me something about your research papers, meeting notes, or any other documents you've uploaded.
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">Just now</p>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {messages?.map((message: ChatMessage) => (
        <div
          key={message.id}
          className={`flex items-start space-x-3 ${
            message.role === "user" ? "justify-end" : ""
          }`}
        >
          {message.role === "assistant" && (
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
          )}
          
          <div className={`flex-1 ${message.role === "user" ? "flex justify-end" : ""}`}>
            <div
              className={`rounded-lg p-4 max-w-3xl ${
                message.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Sources for assistant messages */}
              {message.role === "assistant" && message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
                <div className="border-t border-gray-200 pt-3 mt-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                  <div className="space-y-2">
                    {message.sources.map((source: any, index: number) => (
                      <Card key={index} className="p-2 bg-white border">
                        <div className="flex items-center text-xs text-gray-600">
                          <FileText className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
                          <span className="flex-1 truncate">
                            {source.metadata?.source || `Document ${source.documentId}`}
                          </span>
                          {source.metadata?.chunkIndex !== undefined && (
                            <span className="text-gray-500 ml-2">
                              Chunk {source.metadata.chunkIndex + 1}
                            </span>
                          )}
                          <Badge 
                            variant="secondary" 
                            className="ml-2 bg-green-100 text-green-700 text-xs"
                          >
                            {source.similarity}%
                          </Badge>
                        </div>
                        {source.content && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {source.content}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatTimeAgo(message.createdAt!)}
            </p>
          </div>

          {message.role === "user" && (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          )}
        </div>
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
}
