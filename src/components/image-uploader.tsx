
"use client";

import type { ChangeEvent, DragEvent } from "react";
import React, { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { UploadCloud, X, Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  onImageUpload: (file: File, dataUrl: string) => void;
  onClearImage: () => void; // Callback to clear the image
  disabled?: boolean;
  currentPreviewUrl: string | null; // Receive current preview URL
}

export function ImageUploader({ onImageUpload, onClearImage, disabled, currentPreviewUrl }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "capture">("upload");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false); // Track if camera is active
  const { toast } = useToast();
  const streamRef = useRef<MediaStream | null>(null); // To hold the stream for stopping

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCapturing(false); // Ensure capturing state is reset
      if (videoRef.current) {
          videoRef.current.srcObject = null; // Clear the video source
      }
    }
  }, []);

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (file && file.type.startsWith("image/")) {
        stopCameraStream(); // Stop camera if a file is uploaded
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          onImageUpload(file, dataUrl);
        };
        reader.readAsDataURL(file);
      } else if (file) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (PNG, JPG, GIF).",
          variant: "destructive",
        });
         onClearImage(); // Clear if invalid file
      } else {
         onClearImage(); // Clear if no file selected
      }
    },
    [onImageUpload, onClearImage, stopCameraStream, toast]
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFileChange(event.target.files?.[0] ?? null);
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled && activeTab === 'upload') {
      setDragOver(true);
    }
  }, [disabled, activeTab]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled || activeTab !== 'upload') return;
      setDragOver(false);
      const file = event.dataTransfer.files?.[0] ?? null;
      handleFileChange(file);
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) input.value = '';
    },
    [disabled, handleFileChange, activeTab]
  );

   const clearPreviewAndStopCamera = useCallback(() => {
    stopCameraStream();
    onClearImage();
    const input = document.getElementById('file-upload') as HTMLInputElement;
    if (input) input.value = '';
  }, [onClearImage, stopCameraStream]);


   const requestCameraPermission = useCallback(async () => {
    if (hasCameraPermission) { // If permission already granted, just ensure stream is active
       if (!isCapturing && videoRef.current) {
          try {
             const stream = await navigator.mediaDevices.getUserMedia({ video: true });
             streamRef.current = stream;
             videoRef.current.srcObject = stream;
             setIsCapturing(true);
          } catch (error) {
             console.error('Error accessing camera:', error);
             setHasCameraPermission(false);
             toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not restart camera stream.' });
          }
       }
       return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true); // Start capturing
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setIsCapturing(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  }, [hasCameraPermission, isCapturing, toast]); // Add isCapturing

  // Effect to request permission when capture tab is activated
  useEffect(() => {
    if (activeTab === 'capture') {
      requestCameraPermission();
    } else {
      stopCameraStream(); // Stop camera when switching away
    }
    // Cleanup function to stop camera when component unmounts or tab changes
     return () => {
        stopCameraStream();
    };
  }, [activeTab, requestCameraPermission, stopCameraStream]);


   const handleCapture = useCallback(() => {
      if (!videoRef.current || !canvasRef.current || !isCapturing) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
         context.drawImage(video, 0, 0, canvas.width, canvas.height);
         canvas.toBlob(blob => {
            if (blob) {
              const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
              const dataUrl = canvas.toDataURL('image/png');
              onImageUpload(file, dataUrl);
              stopCameraStream(); // Stop camera after capture
            }
         }, 'image/png');
      }
    }, [isCapturing, onImageUpload, stopCameraStream]);


  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "capture")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" disabled={disabled}>
            <UploadCloud className="mr-2 h-4 w-4" /> Upload File
          </TabsTrigger>
          <TabsTrigger value="capture" disabled={disabled}>
            <Camera className="mr-2 h-4 w-4" /> Capture Image
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <label
            htmlFor="file-upload"
            className={cn(
              "relative mt-2 flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out",
              dragOver ? "border-primary bg-accent/20" : "border-border hover:border-primary/50 hover:bg-accent/10",
              disabled ? "cursor-not-allowed bg-muted/50 border-muted" : "",
              currentPreviewUrl && activeTab === 'upload' ? "border-solid" : "" // Show solid border only if preview exists and on upload tab
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {currentPreviewUrl ? (
              <>
                <Image
                  src={currentPreviewUrl}
                  alt="Preview"
                  layout="fill"
                  objectFit="contain"
                  className="rounded-lg p-2"
                />
                <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 z-10 h-7 w-7"
                    onClick={(e) => { e.preventDefault(); clearPreviewAndStopCamera(); }}
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
        </TabsContent>

        {/* Capture Tab */}
        <TabsContent value="capture">
          <div className="relative mt-2 w-full h-64 border border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            {currentPreviewUrl ? (
                 <>
                    <Image
                      src={currentPreviewUrl}
                      alt="Captured image"
                      layout="fill"
                      objectFit="contain"
                      className="rounded-lg p-1"
                     />
                     <Button
                       variant="destructive"
                       size="icon"
                       className="absolute top-2 right-2 z-10 h-7 w-7"
                       onClick={(e) => { e.preventDefault(); clearPreviewAndStopCamera(); }}
                       disabled={disabled}
                       aria-label="Remove image"
                     >
                       <X className="h-4 w-4" />
                     </Button>
                     {/* Add retake button */}
                      <Button
                       variant="secondary"
                       size="icon"
                       className="absolute top-2 left-2 z-10 h-7 w-7"
                       onClick={(e) => { e.preventDefault(); clearPreviewAndStopCamera(); requestCameraPermission(); }} // Clear and request again
                       disabled={disabled || !hasCameraPermission} // Disable if no permission
                       aria-label="Retake picture"
                     >
                       <RefreshCw className="h-4 w-4" />
                     </Button>
                 </>
             ) : isCapturing ? (
               <>
                 <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                 <Button
                   size="lg"
                   className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10"
                   onClick={handleCapture}
                   disabled={disabled || !hasCameraPermission}
                 >
                   <Camera className="mr-2 h-5 w-5" /> Capture
                 </Button>
               </>
             ) : (
               <div className="text-center p-4">
                  {hasCameraPermission === false && (
                       <Alert variant="destructive" className="mb-4">
                         <AlertTitle>Camera Access Required</AlertTitle>
                         <AlertDescription>
                           Allow camera access to capture an image. You might need to refresh the page or check browser settings.
                         </AlertDescription>
                       </Alert>
                     )}
                  <Button onClick={requestCameraPermission} disabled={disabled || hasCameraPermission === true}>
                    <Camera className="mr-2 h-4 w-4" /> Enable Camera
                  </Button>
               </div>
            )}
             <canvas ref={canvasRef} className="hidden" /> {/* Hidden canvas for capturing frame */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
