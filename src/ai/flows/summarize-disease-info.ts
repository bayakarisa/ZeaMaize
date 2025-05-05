'use server';

/**
 * @fileOverview Summarizes detailed information about a detected disease using GenAI.
 *
 * - summarizeDiseaseInfo - A function that summarizes disease information.
 * - SummarizeDiseaseInfoInput - The input type for the summarizeDiseaseInfo function.
 * - SummarizeDiseaseInfoOutput - The return type for the summarizeDiseaseInfo function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeDiseaseInfoInputSchema = z.object({
  diseaseName: z.string().describe('The name of the detected disease.'),
  diseaseDescription: z.string().describe('Detailed information about the disease.'),
});
export type SummarizeDiseaseInfoInput = z.infer<typeof SummarizeDiseaseInfoInputSchema>;

const SummarizeDiseaseInfoOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the key facts and potential impacts of the disease.'),
});
export type SummarizeDiseaseInfoOutput = z.infer<typeof SummarizeDiseaseInfoOutputSchema>;

export async function summarizeDiseaseInfo(
  input: SummarizeDiseaseInfoInput
): Promise<SummarizeDiseaseInfoOutput> {
  return summarizeDiseaseInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDiseaseInfoPrompt',
  input: {
    schema: z.object({
      diseaseName: z.string().describe('The name of the detected disease.'),
      diseaseDescription: z.string().describe('Detailed information about the disease.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z
        .string()
        .describe(
          'A concise summary of the key facts and potential impacts of the disease.'
        ),
    }),
  },
  prompt: `You are an expert in plant diseases. Summarize the following information about the disease, focusing on the key facts and potential impacts in a concise and easy-to-understand format.\n\nDisease Name: {{{diseaseName}}}\nDisease Description: {{{diseaseDescription}}}`,
});

const summarizeDiseaseInfoFlow = ai.defineFlow<
  typeof SummarizeDiseaseInfoInputSchema,
  typeof SummarizeDiseaseInfoOutputSchema
>(
  {
    name: 'summarizeDiseaseInfoFlow',
    inputSchema: SummarizeDiseaseInfoInputSchema,
    outputSchema: SummarizeDiseaseInfoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
