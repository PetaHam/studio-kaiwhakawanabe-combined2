'use server';
/**
 * @fileOverview Provides a generative AI tool for learning about kapa haka judging criteria.
 *
 * - kapaHakaJudgingAcademy - A function that generates detailed explanations, criteria, and tips for judging kapa haka performance items.
 * - KapaHakaJudgingAcademyInput - The input type for the kapaHakaJudgingAcademy function.
 * - KapaHakaJudgingAcademyOutput - The return type for the kapaHakaJudgingAcademy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const KapaHakaJudgingAcademyInputSchema = z.object({
  performanceItem: z
    .string()
    .describe('The specific kapa haka performance item to get judging criteria for (e.g., "Whakaeke", "Haka", "Mōteatea", "Poi", "Waiata-ā-ringa", "Kakahu").'),
});
export type KapaHakaJudgingAcademyInput = z.infer<typeof KapaHakaJudgingAcademyInputSchema>;

const KapaHakaJudgingAcademyOutputSchema = z.object({
  itemName: z.string().describe('The name of the kapa haka performance item.'),
  explanation: z.string().describe('A detailed explanation of the performance item and its significance.'),
  judgingCriteria: z
    .array(z.string())
    .describe('A list of specific criteria to look for when judging this performance item.'),
  expertTips: z
    .array(z.string())
    .describe('Expert tips and nuances for accurate scoring of this performance item.'),
});
export type KapaHakaJudgingAcademyOutput = z.infer<typeof KapaHakaJudgingAcademyOutputSchema>;

export async function kapaHakaJudgingAcademy(
  input: KapaHakaJudgingAcademyInput
): Promise<KapaHakaJudgingAcademyOutput> {
  return kapaHakaJudgingAcademyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'kapaHakaJudgingAcademyPrompt',
  input: {schema: KapaHakaJudgingAcademyInputSchema},
  output: {schema: KapaHakaJudgingAcademyOutputSchema},
  prompt: `You are an expert in Kapa Haka, specifically specializing in judging criteria and performance analysis.
Your task is to provide a comprehensive guide for judging a specific Kapa Haka performance item.

Generate a detailed explanation of the performance item, a list of specific judging criteria, and expert tips for accurate scoring.

Kapa Haka Performance Item: {{{performanceItem}}}
`,
});

const kapaHakaJudgingAcademyFlow = ai.defineFlow(
  {
    name: 'kapaHakaJudgingAcademyFlow',
    inputSchema: KapaHakaJudgingAcademyInputSchema,
    outputSchema: KapaHakaJudgingAcademyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
