
"use client";

import type { ChangeEvent, DragEvent } from "react";
import React, { useState, useCallback } from "react";
import Image from "next/image";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImageUpload: (file: File, dataUrl: string) => void;
  disabled?: boolean;
}

export function ImageUploader({ onImageUpload, disabled }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setPreviewUrl(dataUrl);
          setSelectedFile(file);
          onImageUpload(file, dataUrl);
        };
        reader.readAsDataURL(file);
      } else {
        // Handle non-image files or no file selection if needed
        console.warn("Please select an image file.");
        setPreviewUrl(null);
        setSelectedFile(null);
      }
    },
    [onImageUpload]
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFileChange(event.target.files?.[0] ?? null);
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      setDragOver(false);
      const file = event.dataTransfer.files?.[0] ?? null;
      handleFileChange(file);
      // Clear the input value if a file is dropped
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    },
    [disabled, handleFileChange]
  );

    const clearPreview = useCallback(() => {
    setPreviewUrl(null);
    setSelectedFile(null);
    // Also clear the input field
    const input = document.getElementById('file-upload') as HTMLInputElement;
    if (input) {
        input.value = '';
    }
    // Optionally, notify the parent component that the image is cleared
    // onImageUpload(null, null); // Adjust based on your needs
  }, []);


  return (
    <div className="w-full max-w-md mx-auto">
      <label
        htmlFor="file-upload"
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out",
          dragOver ? "border-primary bg-accent/20" : "border-border hover:border-primary/50 hover:bg-accent/10",
          disabled ? "cursor-not-allowed bg-muted/50 border-muted" : "",
          previewUrl ? "border-solid" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <>
            <Image
              src={previewUrl}
              alt="Image preview"
              layout="fill"
              objectFit="contain"
              className="rounded-lg p-2"
            />
             <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10 h-7 w-7"
                onClick={(e) => { e.preventDefault(); clearPreview(); }}
                disabled={disabled}
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <UploadCloud className={cn("w-10 h-10 mb-3", dragOver ? "text-primary" : "text-muted-foreground")} />
            <p className={cn("mb-2 text-sm", dragOver ? "text-primary" : "text-muted-foreground")}>
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className={cn("text-xs", dragOver ? "text-primary" : "text-muted-foreground")}>
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        )}
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </label>
    </div>
  );
}
