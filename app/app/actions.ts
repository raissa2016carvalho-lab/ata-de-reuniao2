'use server';

export async function analyzeTranscript(transcript: string) {
  return {
    summary: `Análise: ${transcript.slice(0, 100)}...`,
    topics: ['reunião', 'ações']
  };
}
