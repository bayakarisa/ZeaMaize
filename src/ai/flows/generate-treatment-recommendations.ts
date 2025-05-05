'use server';

/**
 * @fileOverview Generates treatment recommendations for maize diseases.
 *
 * - generateTreatmentRecommendations - A function that generates treatment recommendations.
 * - GenerateTreatmentRecommendationsInput - The input type for the generateTreatmentRecommendations function.
 * - GenerateTreatmentRecommendationsOutput - The return type for the generateTreatmentRecommendations function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateTreatmentRecommendationsInputSchema = z.object({
  diseaseName: z.string().describe('The name of the detected disease.'),
  confidenceScore: z.number().describe('The confidence score of the disease detection.'),
});
export type GenerateTreatmentRecommendationsInput = z.infer<typeof GenerateTreatmentRecommendationsInputSchema>;

const GenerateTreatmentRecommendationsOutputSchema = z.object({
  organicRecommendations: z.string().describe('Organic treatment recommendations for the disease.'),
  chemicalRecommendations: z.string().describe('Chemical treatment recommendations for the disease.'),
});
export type GenerateTreatmentRecommendationsOutput = z.infer<typeof GenerateTreatmentRecommendationsOutputSchema>;

export async function generateTreatmentRecommendations(
  input: GenerateTreatmentRecommendationsInput
): Promise<GenerateTreatmentRecommendationsOutput> {
  return generateTreatmentRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTreatmentRecommendationsPrompt',
  input: {
    schema: z.object({
      diseaseName: z.string().describe('The name of the detected disease.'),
      confidenceScore: z.number().describe('The confidence score of the disease detection.'),
    }),
  },
  output: {
    schema: z.object({
      organicRecommendations: z.string().describe('Organic treatment recommendations for the disease.'),
      chemicalRecommendations: z.string().describe('Chemical treatment recommendations for the disease.'),
    }),
  },
  prompt: `You are an expert agricultural advisor specializing in maize diseases.

  Based on the identified disease and confidence score, generate tailored treatment recommendations.
  Include both organic and chemical control options.

  Disease Name: {{{diseaseName}}}
  Confidence Score: {{{confidenceScore}}}

  Provide specific and practical recommendations for each category.
  `,
});

const generateTreatmentRecommendationsFlow = ai.defineFlow<
  typeof GenerateTreatmentRecommendationsInputSchema,
  typeof GenerateTreatmentRecommendationsOutputSchema
>(
  {
    name: 'generateTreatmentRecommendationsFlow',
    inputSchema: GenerateTreatmentRecommendationsInputSchema,
    outputSchema: GenerateTreatmentRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
