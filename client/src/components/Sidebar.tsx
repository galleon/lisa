import { useQuery } from "@tanstack/react-query";
import DocumentUpload from "./DocumentUpload";
import DocumentList from "./DocumentList";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  return (
    <div className="flex flex-col w-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Document Intelligence</h1>
        <div className="flex items-center space-x-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Online</span>
          </div>
        </div>
      </div>

      {/* Document Upload */}
      <div className="p-6 border-b border-gray-200">
        <DocumentUpload />
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-6">
        <DocumentList />
        
        {/* Processing Status */}
        {stats && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-blue-800">Vector embeddings ready</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {stats.chunkCount} total chunks indexed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
