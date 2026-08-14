import { AgentSuggestion, AgentStreamChunk } from '@neuro/shared';

export interface StreamCallbacks {
  onChunk?: (chunk: AgentStreamChunk) => void;
  onSuggestion?: (suggestion: AgentSuggestion) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export interface StreamQueryOptions {
  prompt: string;
  contextNoteId?: string;
  useRag?: boolean;
  model?: string;
  signal?: AbortSignal;
}

class AgentClient {
  private activeAbortController: AbortController | null = null;

  cancelCurrentStream(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  async streamSuggestion(
    options: StreamQueryOptions,
    callbacks: StreamCallbacks
  ): Promise<void> {
    this.cancelCurrentStream();

    this.activeAbortController = new AbortController();
    const signal = options.signal || this.activeAbortController.signal;

    try {
      const token = localStorage.getItem('neuro_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: options.prompt,
          use_rag: options.useRag ?? true,
          model: options.model ?? 'ollama:llama3.2',
          context_note_id: options.contextNoteId,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`AI request failed with HTTP ${response.status}`);
      }

      // Check if streaming is supported or response is JSON
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const textChunk = decoder.decode(value, { stream: true });
          accumulatedText += textChunk;

          callbacks.onChunk?.({
            id: String(Date.now()),
            deltaText: textChunk,
            isComplete: false,
          });
        }

        const suggestion: AgentSuggestion = {
          id: `sug_${Date.now()}`,
          type: 'completion',
          text: accumulatedText,
          createdAt: new Date().toISOString(),
          actions: [
            { id: 'act_apply', label: 'Apply to Note', action: 'apply', variant: 'primary' },
            { id: 'act_insert', label: 'Insert at Cursor', action: 'insert', variant: 'secondary' },
            { id: 'act_dismiss', label: 'Dismiss', action: 'dismiss', variant: 'ghost' },
          ],
        };

        callbacks.onSuggestion?.(suggestion);
        callbacks.onDone?.();
      } else {
        const data = await response.json();
        const fullText = data.response || data.text || data.reply || (typeof data === 'string' ? data : JSON.stringify(data));
        
        const suggestion: AgentSuggestion = {
          id: `sug_${Date.now()}`,
          type: 'completion',
          text: fullText,
          citations: data.sources?.map((s: any) => ({
            id: s.id || s.title,
            title: s.title || s.id,
            snippet: s.snippet,
            score: s.score,
          })),
          metadata: {
            model: data.model || options.model,
            tokensUsed: data.tokens_used,
            latencyMs: data.latency_ms,
          },
          createdAt: new Date().toISOString(),
          actions: [
            { id: 'act_apply', label: 'Apply', action: 'apply', variant: 'primary' },
            { id: 'act_insert', label: 'Insert', action: 'insert', variant: 'secondary' },
            { id: 'act_dismiss', label: 'Dismiss', action: 'dismiss', variant: 'ghost' },
          ],
        };

        callbacks.onChunk?.({
          id: suggestion.id,
          deltaText: fullText,
          isComplete: true,
          suggestion,
        });

        callbacks.onSuggestion?.(suggestion);
        callbacks.onDone?.();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Ignored, user cancelled stream
        callbacks.onDone?.();
      } else {
        callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      this.activeAbortController = null;
    }
  }
}

export const agentClient = new AgentClient();
