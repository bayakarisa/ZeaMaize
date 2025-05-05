
"use client";

import type { FC } from "react";
import React, { useState, useCallback } from "react";
import { Leaf } from 'lucide-react';
import { ImageUploader } from "@/components/image-uploader";
import { DiagnosisResults, type DiagnosisResult } from "@/components/diagnosis-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
// IMPORTANT: Assume these GenAI functions exist and work as described
// You DO NOT need to implement them, just call them.
import { summarizeDiseaseInfo } from '@/ai/flows/summarize-disease-info';
import { generateTreatmentRecommendations } from '@/ai/flows/generate-treatment-recommendations';

// Mock function to simulate AI model prediction
// In a real app, this would involve sending the image to a backend,
// running the model, and returning the results.
const mockPredictDisease = async (file: File): Promise<{ diseaseName: string; confidenceScore: number; rawDescription: string }> => {
  console.log("Simulating disease prediction for:", file.name);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simulate different possible outcomes
  const randomOutcome = Math.random();
  if (randomOutcome < 0.6) { // 60% chance of detecting a common disease
    return {
      diseaseName: "Maize Common Rust",
      confidenceScore: Math.random() * 0.3 + 0.7, // High confidence (0.7 - 1.0)
      rawDescription: "Common rust appears as small, cinnamon-brown, powdery pustules scattered on both leaf surfaces. It thrives in cool, moist conditions. Severe infections can reduce photosynthesis and yield.",
    };
  } else if (randomOutcome < 0.85) { // 25% chance of detecting another disease
    return {
      diseaseName: "Gray Leaf Spot",
      confidenceScore: Math.random() * 0.3 + 0.5, // Medium confidence (0.5 - 0.8)
      rawDescription: "Gray leaf spot causes long, narrow, rectangular lesions that are tan or gray and run parallel to leaf veins. It's favored by warm, humid weather and can lead to significant leaf blighting.",
    };
   } else if (randomOutcome < 0.95) { // 10% chance of low confidence/unclear
     return {
        diseaseName: "Uncertain Diagnosis",
        confidenceScore: Math.random() * 0.4 + 0.1, // Low confidence (0.1 - 0.5)
        rawDescription: "The analysis did not yield a high-confidence diagnosis. Symptoms might be due to various factors including nutrient deficiency, environmental stress, or early-stage disease. Consider re-uploading a clearer image or consulting an expert.",
     }
  } else { // 5% chance of simulation error
    throw new Error("Simulated prediction error. Please try again.");
  }
};


const Home: FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUpload = useCallback((file: File, dataUrl: string) => {
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setDiagnosisResult(null); // Clear previous results
    setError(null); // Clear previous errors
  }, []);

  const handleAnalyzeClick = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "No Image Selected",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setDiagnosisResult(null);

    try {
      // 1. Get initial prediction from the mock model
      const prediction = await mockPredictDisease(selectedFile);

       // Handle uncertain diagnosis - show message but don't call GenAI flows
      if (prediction.diseaseName === "Uncertain Diagnosis") {
          setDiagnosisResult({
              diseaseName: prediction.diseaseName,
              confidenceScore: prediction.confidenceScore,
              description: prediction.rawDescription, // Use the raw description directly
              organicRecommendations: "N/A - Diagnosis uncertain.",
              chemicalRecommendations: "N/A - Diagnosis uncertain.",
          });
          setIsLoading(false);
          return; // Stop processing here for uncertain cases
      }


      // 2. Summarize disease info using GenAI
      const summaryResult = await summarizeDiseaseInfo({
        diseaseName: prediction.diseaseName,
        diseaseDescription: prediction.rawDescription,
      });

      // 3. Generate treatment recommendations using GenAI
      const treatmentResult = await generateTreatmentRecommendations({
        diseaseName: prediction.diseaseName,
        confidenceScore: prediction.confidenceScore,
      });

      // 4. Combine results
      setDiagnosisResult({
        diseaseName: prediction.diseaseName,
        confidenceScore: prediction.confidenceScore,
        description: summaryResult.summary,
        organicRecommendations: treatmentResult.organicRecommendations,
        chemicalRecommendations: treatmentResult.chemicalRecommendations,
      });

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
  }, [selectedFile, toast]);

  return (
    <div className="min-h-screen bg-secondary/40 flex flex-col items-center justify-center p-4 md:p-8">
       <header className="mb-8 text-center">
         <div className="flex items-center justify-center gap-2 mb-2">
           <Leaf className="h-8 w-8 text-primary" />
           <h1 className="text-3xl md:text-4xl font-bold text-primary">LeafWise</h1>
         </div>
         <p className="text-muted-foreground text-base md:text-lg">
           Upload an image of a maize leaf to detect diseases.
         </p>
       </header>

       <Card className="w-full max-w-lg mb-8 shadow-md">
         <CardHeader>
           <CardTitle>Upload Maize Leaf Image</CardTitle>
           <CardDescription>Select or drag and drop an image file.</CardDescription>
         </CardHeader>
         <CardContent>
           <ImageUploader onImageUpload={handleImageUpload} disabled={isLoading} />
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
        <div className="w-full max-w-2xl">
           <DiagnosisResults result={diagnosisResult} isLoading={isLoading} error={error} />
        </div>
       )}

      <Toaster />
    </div>
  );
};

export default Home;
