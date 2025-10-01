'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Eye, 
  Upload, 
  X, 
  File, 
  FileImage, 
  FileVideo, 
  FileSpreadsheet,
  FileCode,
  MoreVertical,
  Search,
  Filter,
  Grid,
  List
} from 'lucide-react';

interface DocumentAttachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType?: string;
  createdAt: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface DocumentManagementProps {
  requestId: string;
  attachments: DocumentAttachment[];
  canUpload?: boolean;
  canDelete?: boolean;
  onUpload?: (files: FileList) => Promise<void>;
  onDelete?: (attachmentId: string) => Promise<void>;
  onRefresh?: () => void;
}

export default function DocumentManagement({
  requestId,
  attachments,
  canUpload = false,
  canDelete = false,
  onUpload,
  onDelete,
  onRefresh
}: DocumentManagementProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [previewFile, setPreviewFile] = useState<DocumentAttachment | null>(null);

  const getFileIcon = (fileName: string, mimeType?: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    const mime = mimeType?.toLowerCase();

    if (mime?.startsWith('image/')) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    }
    if (mime?.startsWith('video/')) {
      return <FileVideo className="h-8 w-8 text-purple-500" />;
    }
    if (extension === 'pdf') {
      return <File className="h-8 w-8 text-red-500" />;
    }
    if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    }
    if (['docx', 'doc'].includes(extension || '')) {
      return <FileText className="h-8 w-8 text-blue-600" />;
    }
    if (['js', 'ts', 'html', 'css', 'json'].includes(extension || '')) {
      return <FileCode className="h-8 w-8 text-orange-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !onUpload) return;

    setIsUploading(true);
    try {
      const fileList = selectedFiles.reduce((dataTransfer, file) => {
        dataTransfer.items.add(file);
        return dataTransfer;
      }, new DataTransfer());

      await onUpload(fileList.files);
      setSelectedFiles([]);
      onRefresh?.();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (attachment: DocumentAttachment) => {
    try {
      const response = await fetch(`/api/uploads/download?requestId=${requestId}&fileName=${encodeURIComponent(attachment.fileName)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handlePreview = (attachment: DocumentAttachment) => {
    setPreviewFile(attachment);
  };

  const handleDelete = async (attachmentId: string) => {
    if (!onDelete) return;
    
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await onDelete(attachmentId);
        onRefresh?.();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const filteredAttachments = attachments.filter(attachment =>
    attachment.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canPreview = (fileName: string, mimeType?: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    return mimeType?.startsWith('image/') || extension === 'pdf' || mimeType?.startsWith('text/');
  };

  return (
    <div className="space-y-6">
      {/* Upload functionality commented out - Documents tab is now read-only */}
      {/* {canUpload && (
        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">Upload Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-upload" className="text-sm font-medium text-gray-700 mb-2 block">
                Select Files
              </Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="border-gray-200"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Selected Files:</Label>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.name, file.type)}
                      <div>
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSelectedFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-[#087055] hover:bg-[#065a42] text-white"
                >
                  {isUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )} */}

      <Card className="shadow-sm border border-gray-200 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Documents ({attachments.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 border-gray-200"
                />
              </div>
              <div className="flex border border-gray-200 rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`border-0 rounded-r-none ${viewMode === 'list' ? 'bg-[#087055] text-white' : 'text-gray-600'}`}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`border-0 rounded-l-none border-l ${viewMode === 'grid' ? 'bg-[#087055] text-white' : 'text-gray-600'}`}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAttachments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No documents match your search.' : 'No documents uploaded yet.'}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredAttachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4 flex-1">
                    {getFileIcon(attachment.fileName, attachment.mimeType)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{attachment.fileName}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(attachment.fileSize)}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Uploaded {formatDate(attachment.createdAt)}
                        {attachment.uploadedBy && (
                          <span> by {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {canPreview(attachment.fileName, attachment.mimeType) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(attachment)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {/* Delete functionality commented out - Documents tab is now read-only */}
                    {/* {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )} */}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAttachments.map((attachment) => (
                <div key={attachment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {getFileIcon(attachment.fileName, attachment.mimeType)}
                    <div className="w-full">
                      <p className="text-sm font-medium text-gray-900 truncate" title={attachment.fileName}>
                        {attachment.fileName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(attachment.fileSize)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(attachment.createdAt)}
                      </p>
                    </div>
                    <div className="flex space-x-1 w-full">
                      {canPreview(attachment.fileName, attachment.mimeType) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(attachment)}
                          className="flex-1 text-xs"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        className="flex-1 text-xs"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{previewFile.fileName}</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(previewFile)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 max-h-[calc(90vh-120px)] overflow-auto">
              {previewFile.mimeType?.startsWith('image/') ? (
                <img
                  src={previewFile.filePath}
                  alt={previewFile.fileName}
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewFile.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewFile.filePath}
                  className="w-full h-96 border-0"
                  title={previewFile.fileName}
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Preview not available for this file type.</p>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(previewFile)}
                    className="mt-4"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}