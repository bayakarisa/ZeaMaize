
import type { FC } from "react";
import { AlertCircle, CheckCircle, HelpCircle, Leaf, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Define the structure for the diagnosis results
export interface DiagnosisResult {
  diseaseName: string;
  confidenceScore: number; // Between 0 and 1
  description: string;
  organicRecommendations: string;
  chemicalRecommendations: string;
}

interface DiagnosisResultsProps {
  result: DiagnosisResult | null;
  isLoading?: boolean;
  error?: string | null;
}

const getConfidenceColor = (score: number) => {
  if (score >= 0.8) return "text-green-600 dark:text-green-400"; // High confidence - Green
  if (score >= 0.5) return "text-yellow-600 dark:text-yellow-400"; // Medium confidence - Yellow
  return "text-red-600 dark:text-red-400"; // Low confidence - Red
};

const getConfidenceIcon = (score: number) => {
  if (score >= 0.8) return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
  if (score >= 0.5) return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
  return <HelpCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
};

export const DiagnosisResults: FC<DiagnosisResultsProps> = ({ result, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto animate-pulse">
        <CardHeader>
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-6 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <Separator />
          <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-20 bg-muted rounded w-full"></div>
           <Separator />
           <div className="space-y-4">
             <div className="h-10 bg-muted rounded w-full"></div>
             <div className="h-10 bg-muted rounded w-full"></div>
           </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
       <Alert variant="destructive" className="w-full max-w-2xl mx-auto">
         <AlertCircle className="h-4 w-4" />
         <AlertTitle>Error</AlertTitle>
         <AlertDescription>
           {error || "An unexpected error occurred during diagnosis."}
         </AlertDescription>
       </Alert>
    );
   }

  if (!result) {
    return null; // Or a message indicating no results yet
  }

  const confidencePercentage = Math.round(result.confidenceScore * 100);
  const confidenceColor = getConfidenceColor(result.confidenceScore);
  const confidenceIcon = getConfidenceIcon(result.confidenceScore);


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border border-border rounded-lg overflow-hidden">
      <CardHeader className="bg-secondary/50 p-4">
         <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-primary">{result.diseaseName}</CardTitle>
           <Badge variant={result.confidenceScore >= 0.8 ? 'default' : result.confidenceScore >= 0.5 ? 'secondary' : 'destructive'} className="flex items-center gap-1.5">
              {confidenceIcon}
              {confidencePercentage}% Confidence
            </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground pt-1">
          Diagnosis based on the uploaded image.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-4">
         <div>
           <h3 className="text-base font-medium mb-2 text-foreground">Confidence Score</h3>
           <div className="flex items-center gap-2">
             <Progress value={confidencePercentage} className="w-full h-2" aria-label={`Confidence: ${confidencePercentage}%`} />
             <span className={cn("text-sm font-semibold", confidenceColor)}>{confidencePercentage}%</span>
           </div>
         </div>

        <Separator />

        <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
        </div>

        <Separator />

        <div>
         <h3 className="text-lg font-semibold mb-3 text-foreground">Treatment Recommendations</h3>
         <Accordion type="single" collapsible className="w-full" defaultValue="organic">
             <AccordionItem value="organic">
               <AccordionTrigger className="text-base font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                     <Leaf className="h-5 w-5 text-green-600" />
                     Organic Options
                  </div>
                </AccordionTrigger>
               <AccordionContent className="text-sm text-muted-foreground pl-8 pr-4 py-2 border-l-2 border-green-600 ml-2">
                 {result.organicRecommendations || "No specific organic recommendations available."}
               </AccordionContent>
             </AccordionItem>
             <AccordionItem value="chemical">
               <AccordionTrigger className="text-base font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Chemical Options
                   </div>
                </AccordionTrigger>
               <AccordionContent className="text-sm text-muted-foreground pl-8 pr-4 py-2 border-l-2 border-orange-500 ml-2">
                 {result.chemicalRecommendations || "No specific chemical recommendations available."}
               </AccordionContent>
             </AccordionItem>
           </Accordion>
        </div>

      </CardContent>
    </Card>
  );
};
