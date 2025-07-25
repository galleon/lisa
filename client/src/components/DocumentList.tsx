import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, File, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";
import type { Document } from "@shared/schema";

export default function DocumentList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Poll for progress updates on processing documents
  useEffect(() => {
    const processingDocs = documents.filter(doc => doc.status === "processing");
    
    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      // Refresh documents list to get updated progress
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [documents, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/documents/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Document deleted",
        description: "The document has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") {
      return <File className="h-5 w-5 text-red-500" />;
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  const getProgressLabel = (status: string, progress: number) => {
    if (status === "completed") return "Ready";
    if (status === "error") return "Error";
    if (status === "processing") {
      if (progress <= 25) return "Extracting text...";
      if (progress <= 50) return "Generating embeddings...";
      if (progress <= 75) return "Saving chunks...";
      return "Finalizing...";
    }
    return "Pending";
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const uploaded = new Date(date);
    const diffInHours = Math.floor((now.getTime() - uploaded.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-900">Documents</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {documents.length} docs
        </span>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500">No documents uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc: Document) => (
            <div
              key={doc.id}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  {getFileIcon(doc.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {doc.chunkCount || 0} chunks • {formatTimeAgo(doc.uploadedAt!)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(doc.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    className="text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Progress bar and status for processing documents */}
              {doc.status === "processing" && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-600 font-medium">
                      {getProgressLabel(doc.status, doc.progress || 0)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {doc.progress || 0}%
                    </span>
                  </div>
                  <Progress 
                    value={doc.progress || 0} 
                    className="h-1.5 bg-gray-200"
                  />
                </div>
              )}
              
              {/* Error status details */}
              {doc.status === "error" && (
                <div className="mt-2">
                  <p className="text-xs text-red-600">
                    Processing failed. Please try uploading again.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
