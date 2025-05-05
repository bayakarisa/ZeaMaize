
"use client";

import type { FC } from "react";
import React, { useState, useCallback, useEffect } from "react";
import { Leaf } from 'lucide-react';
import { ImageUploader } from "@/components/image-uploader";
import { DiagnosisResults, type DiagnosisResult } from "@/components/diagnosis-results";
import { HistoryPanel, type HistoryEntry } from "@/components/history-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { summarizeDiseaseInfo } from '@/ai/flows/summarize-disease-info';
import { generateTreatmentRecommendations } from '@/ai/flows/generate-treatment-recommendations';

// Mock function (keep as is)
const mockPredictDisease = async (file: File): Promise<{ diseaseName: string; confidenceScore: number; rawDescription: string }> => {
  console.log("Simulating disease prediction for:", file.name);
  await new Promise(resolve => setTimeout(resolve, 1500));
  const randomOutcome = Math.random();
  if (randomOutcome < 0.6) {
    return {
      diseaseName: "Maize Common Rust",
      confidenceScore: Math.random() * 0.3 + 0.7,
      rawDescription: "Common rust appears as small, cinnamon-brown, powdery pustules scattered on both leaf surfaces. It thrives in cool, moist conditions. Severe infections can reduce photosynthesis and yield.",
    };
  } else if (randomOutcome < 0.85) {
    return {
      diseaseName: "Gray Leaf Spot",
      confidenceScore: Math.random() * 0.3 + 0.5,
      rawDescription: "Gray leaf spot causes long, narrow, rectangular lesions that are tan or gray and run parallel to leaf veins. It's favored by warm, humid weather and can lead to significant leaf blighting.",
    };
   } else if (randomOutcome < 0.95) {
     return {
        diseaseName: "Uncertain Diagnosis",
        confidenceScore: Math.random() * 0.4 + 0.1,
        rawDescription: "The analysis did not yield a high-confidence diagnosis. Symptoms might be due to various factors including nutrient deficiency, environmental stress, or early-stage disease. Consider re-uploading a clearer image or consulting an expert.",
     }
  } else {
    throw new Error("Simulated prediction error. Please try again.");
  }
};

const MAX_HISTORY_ITEMS = 15; // Limit the number of history items

const Home: FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const { toast } = useToast();

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("diagnosisHistory");
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage:", e);
      // Optionally show a toast notification
       toast({
          title: "Could not load history",
          description: "There was an issue retrieving previous analyses.",
          variant: "destructive",
       });
    }
  }, [toast]); // Added toast to dependency array

  const handleImageUpload = useCallback((file: File, dataUrl: string) => {
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setDiagnosisResult(null); // Clear previous results
    setError(null); // Clear previous errors
  }, []);

   const handleClearImage = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDiagnosisResult(null);
    setError(null);
  }, []);


  const saveHistory = useCallback((newEntry: HistoryEntry) => {
    setHistory(prevHistory => {
      const updatedHistory = [newEntry, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem("diagnosisHistory", JSON.stringify(updatedHistory));
      } catch (e) {
        console.error("Failed to save history to localStorage:", e);
         toast({
           title: "Could not save history",
           description: "There was an issue saving this analysis.",
           variant: "destructive",
         });
      }
      return updatedHistory;
    });
  }, [toast]); // Added toast to dependency array

  const handleAnalyzeClick = useCallback(async () => {
    if (!selectedFile || !previewUrl) { // Also check for previewUrl
      toast({
        title: "No Image Selected",
        description: "Please upload or capture an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setDiagnosisResult(null);

    let currentResult: DiagnosisResult | null = null;

    try {
      const prediction = await mockPredictDisease(selectedFile);

      if (prediction.diseaseName === "Uncertain Diagnosis") {
          currentResult = {
              diseaseName: prediction.diseaseName,
              confidenceScore: prediction.confidenceScore,
              description: prediction.rawDescription,
              organicRecommendations: "N/A - Diagnosis uncertain.",
              chemicalRecommendations: "N/A - Diagnosis uncertain.",
          };
      } else {
          const [summaryResult, treatmentResult] = await Promise.all([
            summarizeDiseaseInfo({
              diseaseName: prediction.diseaseName,
              diseaseDescription: prediction.rawDescription,
            }),
            generateTreatmentRecommendations({
              diseaseName: prediction.diseaseName,
              confidenceScore: prediction.confidenceScore,
            })
          ]);

          currentResult = {
            diseaseName: prediction.diseaseName,
            confidenceScore: prediction.confidenceScore,
            description: summaryResult.summary,
            organicRecommendations: treatmentResult.organicRecommendations,
            chemicalRecommendations: treatmentResult.chemicalRecommendations,
          };
      }

      setDiagnosisResult(currentResult);

      // Save to history
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(), // Simple unique ID
        timestamp: new Date().toISOString(),
        thumbnailUrl: previewUrl, // Save the preview URL used for analysis
        result: currentResult,
      };
      saveHistory(historyEntry);

    } catch (err) {
       console.error("Analysis failed:", err);
       const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
       setError(errorMessage);
       toast({
         title: "Analysis Failed",
         description: errorMessage,
         variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, previewUrl, toast, saveHistory]);

  const handleSelectHistory = useCallback((entry: HistoryEntry) => {
    // Set the selected history item's result as the current diagnosis
    setDiagnosisResult(entry.result);
    // Optionally, set the previewUrl to the history item's thumbnail
    setPreviewUrl(entry.thumbnailUrl);
    // Clear the selected file as we are viewing history
    setSelectedFile(null);
    setError(null);
    // Scroll to the top or to the results section if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearHistory = useCallback(() => {
      setHistory([]);
      try {
        localStorage.removeItem("diagnosisHistory");
         toast({
           title: "History Cleared",
           description: "All previous analyses have been removed.",
         });
      } catch (e) {
        console.error("Failed to clear history from localStorage:", e);
         toast({
           title: "Could not clear history",
           description: "There was an issue clearing the history.",
           variant: "destructive",
         });
      }
    }, [toast]);


  return (
    <div className="min-h-screen bg-secondary/40 flex flex-col items-center p-4 md:p-8">
       <header className="mb-6 text-center">
         <div className="flex items-center justify-center gap-2 mb-2">
           <Leaf className="h-8 w-8 text-primary" />
           <h1 className="text-3xl md:text-4xl font-bold text-primary">LeafWise</h1>
         </div>
         <p className="text-muted-foreground text-base md:text-lg">
           Upload or capture a maize leaf image to detect diseases.
         </p>
       </header>

       <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 items-start">

          {/* Left Column: Uploader and Results */}
          <div className="w-full lg:w-1/2 flex flex-col gap-8">
               <Card className="w-full shadow-md">
                 <CardHeader>
                   <CardTitle>Analyze Maize Leaf</CardTitle>
                   <CardDescription>Upload an image file or use your camera.</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <ImageUploader
                        onImageUpload={handleImageUpload}
                        onClearImage={handleClearImage}
                        disabled={isLoading}
                        currentPreviewUrl={previewUrl} // Pass current preview URL
                   />
                 </CardContent>
                 <CardFooter className="flex justify-center">
                   <Button
                     onClick={handleAnalyzeClick}
                     disabled={!selectedFile || isLoading}
                     size="lg"
                     className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                   >
                     {isLoading ? "Analyzing..." : "Analyze Image"}
                   </Button>
                 </CardFooter>
               </Card>

               {(isLoading || error || diagnosisResult) && (
                <div className="w-full">
                   <DiagnosisResults result={diagnosisResult} isLoading={isLoading} error={error} />
                </div>
               )}
          </div>

           {/* Right Column: History */}
           <div className="w-full lg:w-1/2">
             <HistoryPanel
                history={history}
                onSelectHistory={handleSelectHistory}
                onClearHistory={handleClearHistory}
                isLoading={isLoading} // Disable clearing while analyzing
              />
           </div>
       </div>

      {/* Toaster remains at the root */}
    </div>
  );
};

export default Home;
