
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

  // This function is called BOTH when a file is uploaded AND when an image is captured
  const handleImageReady = useCallback((file: File, dataUrl: string) => {
    stopCameraStream(); // Stop camera stream if it was running
    onImageUpload(file, dataUrl);
     // Switch back to upload tab to show the preview consistently after upload/capture
    setActiveTab("upload");
  }, [onImageUpload, stopCameraStream]);


  const handleFileChange = useCallback(
    (file: File | null) => {
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Use handleImageReady for consistent handling
          handleImageReady(file, dataUrl);
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
    [handleImageReady, onClearImage, toast] // Use handleImageReady
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
     // Ensure camera state is reset if clearing from capture tab preview
    if (activeTab === 'capture') {
       setHasCameraPermission(null); // Allow re-requesting permission
    }
  }, [onClearImage, stopCameraStream, activeTab]);


   const requestCameraPermission = useCallback(async () => {
    // Reset permission state to force re-check/re-request
    setHasCameraPermission(null);
    setIsCapturing(false); // Ensure capturing is false initially

    // Ensure videoRef.current exists before proceeding
     if (!videoRef.current) {
        console.error("Video element ref not available");
        toast({ variant: 'destructive', title: 'Internal Error', description: 'Cannot access video element.' });
        return;
     }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setHasCameraPermission(true);
      if (videoRef.current) { // Check ref again just before using
        videoRef.current.srcObject = stream;
         // Ensure autoplay works, especially on mobile
         await videoRef.current.play().catch(err => {
            console.warn("Video play failed:", err);
             // Maybe show a UI element asking user to tap to play if autoplay fails
         });
        setIsCapturing(true); // Start capturing
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setIsCapturing(false);
      // Provide more specific error feedback if possible
      let description = 'Please enable camera permissions in your browser settings.';
      if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
             description = 'Camera access was denied. Please allow access in your browser settings.';
          } else if (error.name === 'NotFoundError') {
             description = 'No camera found. Please ensure a camera is connected and enabled.';
          } else {
             description = `An unexpected error occurred: ${error.message}`;
          }
       }
      toast({
        variant: 'destructive',
        title: 'Camera Access Failed',
        description: description,
      });
    }
  }, [toast]); // Dependencies: toast


   // Effect to request permission when capture tab is activated
  useEffect(() => {
    // Only request permission if the tab is 'capture' AND permission is not already granted/denied
    if (activeTab === 'capture' && hasCameraPermission === null) {
       // Ensure video element is ready before requesting
        const checkVideoElement = () => {
            if (videoRef.current) {
                requestCameraPermission();
            } else {
                setTimeout(checkVideoElement, 100); // Retry after a short delay
            }
        };
        checkVideoElement();
    } else if (activeTab !== 'capture') {
       stopCameraStream(); // Stop camera when switching away from capture tab
    }

    // Cleanup function: Stop stream when component unmounts or tab changes *away* from capture
    return () => {
       if (activeTab === 'capture') { // Stop only if currently on capture tab when cleanup runs
         stopCameraStream();
       }
    };
     // Re-run if activeTab changes OR if permission state becomes null (e.g., after clearing)
  }, [activeTab, hasCameraPermission, requestCameraPermission, stopCameraStream]);


   const handleCapture = useCallback(() => {
      // Ensure all refs and states are valid
      if (!videoRef.current || !canvasRef.current || !isCapturing || !streamRef.current) {
        console.warn("Capture failed: Video, canvas, stream, or capturing state invalid.");
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

       // Set canvas dimensions based on the video stream's actual dimensions
      const track = streamRef.current.getVideoTracks()[0];
      const settings = track?.getSettings();
      const videoWidth = settings?.width || video.videoWidth;
      const videoHeight = settings?.height || video.videoHeight;

      if (!videoWidth || !videoHeight) {
         console.error("Capture failed: Could not get video dimensions.");
         toast({ variant: 'destructive', title: 'Capture Error', description: 'Could not determine video size.' });
         return;
      }


      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
         try {
             // Draw the current video frame onto the canvas
             context.drawImage(video, 0, 0, canvas.width, canvas.height);

             // Get the image data URL from the canvas
             const dataUrl = canvas.toDataURL('image/png');

             // Convert canvas content to a Blob, then to a File
             canvas.toBlob(blob => {
                 if (blob) {
                   const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
                   // Use handleImageReady for consistent processing
                   handleImageReady(file, dataUrl);
                    // Optionally stop the stream *after* successful capture and processing
                    // stopCameraStream(); // Keep stream running if user might want to retake immediately
                 } else {
                    console.error("Capture failed: Could not create blob from canvas.");
                    toast({ variant: 'destructive', title: 'Capture Error', description: 'Failed to process captured image.' });
                 }
             }, 'image/png');

          } catch (error) {
             console.error("Error during canvas drawing or data URL generation:", error);
             toast({ variant: 'destructive', title: 'Capture Error', description: 'Could not capture image from video.' });
          }
      } else {
         console.error("Capture failed: Could not get 2D context from canvas.");
         toast({ variant: 'destructive', title: 'Capture Error', description: 'Failed to initialize drawing context.' });
      }
    }, [isCapturing, handleImageReady, toast]); // Dependencies


   // Function to handle retake: Clear preview, reset state, request permission again
   const handleRetake = useCallback(() => {
       clearPreviewAndStopCamera();
       // Resetting hasCameraPermission to null triggers the useEffect to request again
       setHasCameraPermission(null);
       setActiveTab("capture"); // Ensure capture tab is active
   }, [clearPreviewAndStopCamera]);


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

        {/* Upload Tab Content */}
        <TabsContent value="upload">
          <div
            className={cn(
              "relative mt-2 flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors duration-200 ease-in-out",
               // DragnDrop / Hover styles only apply when no preview URL exists
              !currentPreviewUrl && (dragOver ? "border-primary bg-accent/20" : "border-border hover:border-primary/50 hover:bg-accent/10"),
              disabled ? "cursor-not-allowed bg-muted/50 border-muted" : (!currentPreviewUrl ? "cursor-pointer" : ""), // Pointer only if no preview
               // Solid border when there IS a preview
              currentPreviewUrl ? "border-solid border-border" : ""
            )}
             // Drag and Drop handlers only active when no preview
            onDragOver={!currentPreviewUrl ? handleDragOver : undefined}
            onDragLeave={!currentPreviewUrl ? handleDragLeave : undefined}
            onDrop={!currentPreviewUrl ? handleDrop : undefined}
          >
             <label htmlFor="file-upload" className={cn("absolute inset-0 flex flex-col items-center justify-center", !currentPreviewUrl ? "cursor-pointer" : "cursor-default")}>
                {currentPreviewUrl ? (
                  <>
                    <Image
                      src={currentPreviewUrl}
                      alt="Preview"
                      layout="fill"
                      objectFit="contain"
                      className="rounded-lg p-2"
                    />
                     {/* Clear button positioned over the image */}
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 z-10 h-7 w-7"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearPreviewAndStopCamera(); }}
                        disabled={disabled}
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                    </Button>
                     {/* Retake button - useful if captured image landed here */}
                     <Button
                       variant="secondary"
                       size="icon"
                       className="absolute top-2 left-2 z-10 h-7 w-7"
                       onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRetake(); }}
                       disabled={disabled}
                       aria-label="Retake picture"
                     >
                       <RefreshCw className="h-4 w-4" />
                     </Button>
                  </>
                ) : (
                  // Upload prompt shown only when no preview
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
             </label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleInputChange}
              disabled={disabled || !!currentPreviewUrl} // Disable if there's a preview
            />
          </div>
        </TabsContent>

        {/* Capture Tab Content */}
        <TabsContent value="capture">
           <div className="relative mt-2 w-full h-64 border border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {/* Video Element - Always render to attach ref, hide if not needed */}
               <video
                 ref={videoRef}
                 className={cn(
                   "absolute inset-0 w-full h-full object-cover",
                   isCapturing ? "block" : "hidden" // Show only when capturing
                 )}
                 autoPlay
                 muted
                 playsInline // Important for mobile
               />

             {/* Loading/Permission State */}
             {!isCapturing && hasCameraPermission === null && (
               <p className="text-muted-foreground">Initializing camera...</p>
             )}

             {/* Permission Denied State */}
             {!isCapturing && hasCameraPermission === false && (
               <div className="text-center p-4">
                 <Alert variant="destructive" className="mb-4">
                   <AlertTitle>Camera Access Required</AlertTitle>
                   <AlertDescription>
                     Allow camera access in browser settings to capture an image. You may need to refresh.
                   </AlertDescription>
                 </Alert>
                 <Button onClick={requestCameraPermission} disabled={disabled}>
                   <RefreshCw className="mr-2 h-4 w-4" /> Retry Camera Access
                 </Button>
               </div>
             )}

             {/* Initial State - Ready to Enable */}
             {!isCapturing && hasCameraPermission === null && ( // Show enable button only before first attempt
                <div className="text-center p-4">
                  <Button onClick={requestCameraPermission} disabled={disabled}>
                    <Camera className="mr-2 h-4 w-4" /> Enable Camera
                  </Button>
                </div>
              )}


              {/* Capturing State - Show Capture Button */}
              {isCapturing && (
                <Button
                  size="lg"
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10"
                  onClick={handleCapture}
                  disabled={disabled || !hasCameraPermission}
                >
                  <Camera className="mr-2 h-5 w-5" /> Capture
                </Button>
              )}

              {/* Hidden Canvas for Frame Capture */}
              <canvas ref={canvasRef} className="hidden" />
           </div>
         </TabsContent>

      </Tabs>
    </div>
  );
}
