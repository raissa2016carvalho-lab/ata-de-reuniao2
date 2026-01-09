'use server';

export async function analyzeTranscript(transcript: string) {
  console.log('Transcript recebido:', transcript);
  return {
    summary: `Análise automática: ${transcript.slice(0, 50)}...`,
    actionItems: ['Tarefa 1', 'Tarefa 2']
  };
}
