import { put, del } from '@vercel/blob';

interface UploadFileOptions {
  requestId: string;
  file: File;
  userId: string;
}

interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const blobService = {
  async uploadFile({ requestId, file, userId }: UploadFileOptions): Promise<UploadResult> {
    try {
      console.log('=== BLOB UPLOAD START ===');
      console.log('Environment check:', {
        tokenExists: !!process.env.BLOB_READ_WRITE_TOKEN,
        tokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length,
        tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20)
      });

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      }

      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const blobPath = `${requestId}_${timestamp}_${sanitizedFileName}`;

      console.log('Upload parameters:', {
        blobPath,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        requestId,
        userId
      });

      console.log('Calling Vercel blob put...');
      const blob = await put(blobPath, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      console.log('Vercel blob put completed:', blob);

      if (!blob || !blob.url) {
        throw new Error('Failed to get blob URL from upload response');
      }

      return {
        url: blob.url,
        fileName: sanitizedFileName,
        fileSize: file.size,
        mimeType: file.type,
      };
    } catch (error) {
      console.error('Failed to upload file to blob storage:', error);
      console.error('Error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      });
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteFile(blobUrl: string): Promise<void> {
    try {
      await del(blobUrl, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (error) {
      console.error('Failed to delete file from blob storage:', error);
      throw new Error('File deletion failed');
    }
  },

  extractBlobPath(url: string): string {
    const urlParts = url.split('/');
    return urlParts.slice(-3).join('/');
  }
};