"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  onFileUpload: (fileUrl: string, publicId?: string) => void;
  currentImage?: string;
  label?: string;
  fileType?: "image" | "video" | "both";
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  currentImage,
  label,
  fileType = "image",
  onUploadStart,
  onUploadEnd,
}) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate video duration for video files
    if (file.type.startsWith('video/') && (fileType === "video" || fileType === "both")) {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const checkDuration = new Promise<boolean>((resolve) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          const duration = video.duration;
          resolve(duration <= 60); // 60 seconds max
        };
        video.onerror = () => {
          resolve(false);
        };
      });

      video.src = URL.createObjectURL(file);

      const isValidDuration = await checkDuration;
      if (!isValidDuration) {
        setError("Video duration must be 60 seconds or less.");
        return;
      }
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    setError(null);
    onUploadStart?.();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Upload failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, try to get text
          try {
            const errorText = await res.text();
            errorMessage = errorText || `HTTP ${res.status}: ${res.statusText}`;
          } catch {
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid response format from server");
      }

      if (data.success && data.secure_url) {
        console.log('📤 FileUpload: Calling onFileUpload callback:', {
          url: data.secure_url,
          publicId: data.public_id,
          fileType
        });
        onFileUpload(data.secure_url, data.public_id);
      } else {
        throw new Error(data.error || "Invalid response from server");
      }
    } catch (err) {
      const fileTypeText = fileType === 'video' ? 'video' : 'image';
      setError(`Failed to upload ${fileTypeText}. Please try again.`);
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  }, [onFileUpload, fileType, onUploadStart, onUploadEnd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileType === "video"
      ? { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] }
      : fileType === "both"
        ? {
          'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
          'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
        }
        : { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
    disabled: uploading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const clearPreview = () => {
    setPreview(null);
    setError(null);
  };

  const getFileTypeIcon = () => {
    return <ImageIcon className="h-12 w-12 text-gray-400" />;
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {preview ? (
        <div className="relative w-full h-48 mb-3 group">
          <Image
            src={preview}
            alt="Preview"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover rounded-lg border border-gray-200"
          />

          {/* Clear button */}
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200
            ${isDragActive || dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-3"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {isDragActive || dragActive ? (
                <Upload className="h-12 w-12 text-blue-500 mb-3" />
              ) : (
                getFileTypeIcon()
              )}

              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {isDragActive || dragActive
                    ? `Drop the ${fileType === "video" ? "video" : fileType === "both" ? "file" : "image"} here`
                    : `Drag & drop ${fileType === "video" ? "video" : fileType === "both" ? "image or video" : "image"} here`
                  }
                </p>
                <p className="text-xs text-gray-500">
                  or click to select {fileType === "video" ? "a video" : fileType === "both" ? "a file" : "an image"}
                </p>

                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {fileType === "video"
                      ? "MP4, MOV, AVI, MKV, WEBM"
                      : fileType === "both"
                        ? "Images, Videos (≤60s)"
                        : "PNG, JPG, GIF, WEBP"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
