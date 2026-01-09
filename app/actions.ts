'use server';

export async function analyzeTranscript(transcript: string) {
  return {
    summary: 'Transcript analisado com sucesso!',
    actionItems: ['Ação 1 da reunião', 'Ação 2']
  };
}
