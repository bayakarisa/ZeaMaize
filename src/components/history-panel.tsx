
"use client";

import type { FC } from "react";
import Image from "next/image";
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2, Clock } from "lucide-react";
import type { DiagnosisResult } from "@/components/diagnosis-results";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export interface HistoryEntry {
  id: string;
  timestamp: string; // ISO string format
  thumbnailUrl: string;
  result: DiagnosisResult;
}

interface HistoryPanelProps {
  history: HistoryEntry[];
  onSelectHistory: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
  isLoading?: boolean;
}

export const HistoryPanel: FC<HistoryPanelProps> = ({ history, onSelectHistory, onClearHistory, isLoading }) => {
  return (
    <Card className="shadow-md h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Analysis History</CardTitle>
          <CardDescription>Review previous diagnoses.</CardDescription>
        </div>
         {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" disabled={isLoading} aria-label="Clear history">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your analysis history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )}
      </CardHeader>
      <CardContent className="flex-grow p-0">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6 text-muted-foreground">
            <p>No analysis history yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] p-4"> {/* Adjust height as needed */}
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors",
                    isLoading && "opacity-50 pointer-events-none" // Dim history items while loading
                  )}
                  onClick={() => !isLoading && onSelectHistory(entry)} // Prevent selection during loading
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { !isLoading && onSelectHistory(entry)} }} // Basic accessibility
                >
                  <Image
                    src={entry.thumbnailUrl}
                    alt={`Thumbnail for ${entry.result.diseaseName}`}
                    width={64}
                    height={64}
                    className="rounded-sm object-cover aspect-square"
                     data-ai-hint="maize leaf"
                  />
                  <div className="flex-grow text-sm">
                    <p className="font-medium text-foreground">{entry.result.diseaseName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                       <Clock className="h-3 w-3" />
                       {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </p>
                     <p className={cn("text-xs mt-1",
                       entry.result.confidenceScore >= 0.8 ? "text-green-600" :
                       entry.result.confidenceScore >= 0.5 ? "text-yellow-600" :
                       "text-red-600"
                     )}>
                      {Math.round(entry.result.confidenceScore * 100)}% confidence
                     </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
       {history.length > 0 && (
        <CardFooter className="p-2 border-t mt-auto">
          <p className="text-xs text-muted-foreground text-center w-full">
            Showing {history.length} most recent analyses.
          </p>
        </CardFooter>
       )}
    </Card>
  );
};
