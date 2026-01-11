// Agency v3 - Stream JSON Parser for Claude CLI Output
// Parses --output-format stream-json output from Claude CLI

export interface StreamEvent {
  type: 'content' | 'tool_use' | 'tool_result' | 'message_start' | 'message_complete' | 'error' | 'system' | 'unknown';
  content?: string;
  partial?: boolean;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  isError?: boolean;
  raw?: unknown;
  role?: 'assistant' | 'user' | 'system';
}

export class StreamParser {
  private buffer: string = '';

  /**
   * Parse a chunk of stream-json output.
   * Returns an array of parsed events.
   */
  parse(chunk: string): StreamEvent[] {
    this.buffer += chunk;
    const events: StreamEvent[] = [];

    // Split by newlines - stream-json outputs one JSON object per line
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        const event = this.parseEvent(parsed);
        events.push(event);
      } catch (e) {
        // Not valid JSON - could be partial or non-JSON output
        // Treat as raw content
        events.push({
          type: 'content',
          content: line,
          partial: true,
        });
      }
    }

    return events;
  }

  /**
   * Parse a single JSON event from the stream.
   * Claude CLI stream-json format:
   * - {"type":"system","subtype":"init",...}
   * - {"type":"assistant","message":{...}}
   * - {"type":"user","message":{...}}
   */
  private parseEvent(data: unknown): StreamEvent {
    if (!data || typeof data !== 'object') {
      return { type: 'unknown', raw: data };
    }

    const obj = data as Record<string, unknown>;

    // Claude CLI stream-json format
    if (obj.type === 'system') {
      // System events (init, session info, etc.)
      return {
        type: 'system',
        content: obj.subtype as string,
        raw: obj,
      };
    }

    if (obj.type === 'assistant') {
      // Assistant message with content
      const message = obj.message as Record<string, unknown> | undefined;
      if (message) {
        const content = message.content as unknown[];
        if (Array.isArray(content) && content.length > 0) {
          const firstBlock = content[0] as Record<string, unknown>;

          if (firstBlock.type === 'text') {
            return {
              type: 'content',
              content: firstBlock.text as string,
              role: 'assistant',
            };
          }

          if (firstBlock.type === 'tool_use') {
            return {
              type: 'tool_use',
              id: firstBlock.id as string,
              name: firstBlock.name as string,
              input: firstBlock.input as Record<string, unknown>,
              role: 'assistant',
            };
          }
        }
      }
      return { type: 'content', role: 'assistant', raw: obj };
    }

    if (obj.type === 'user') {
      // User message (often tool results)
      const message = obj.message as Record<string, unknown> | undefined;
      if (message) {
        const content = message.content as unknown[];
        if (Array.isArray(content) && content.length > 0) {
          const firstBlock = content[0] as Record<string, unknown>;

          if (firstBlock.type === 'tool_result') {
            return {
              type: 'tool_result',
              id: firstBlock.tool_use_id as string,
              content: firstBlock.content as string,
              isError: firstBlock.is_error as boolean,
              role: 'user',
            };
          }
        }
      }
      return { type: 'content', role: 'user', raw: obj };
    }

    // Anthropic API streaming format (fallback for direct API use)
    // Content block delta
    if (obj.type === 'content_block_delta') {
      const delta = obj.delta as Record<string, unknown> | undefined;
      if (delta?.type === 'text_delta') {
        return {
          type: 'content',
          content: delta.text as string,
          partial: true,
        };
      }
      if (delta?.type === 'input_json_delta') {
        return {
          type: 'tool_use',
          content: delta.partial_json as string,
          partial: true,
        };
      }
    }

    // Content block start
    if (obj.type === 'content_block_start') {
      const block = obj.content_block as Record<string, unknown> | undefined;
      if (block?.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: block.id as string,
          name: block.name as string,
          input: {},
        };
      }
    }

    // Message start
    if (obj.type === 'message_start') {
      return { type: 'message_start' };
    }

    // Message complete
    if (obj.type === 'message_stop' || obj.type === 'message_delta') {
      if (obj.type === 'message_stop') {
        return { type: 'message_complete' };
      }
      // message_delta contains stop reason
      const delta = obj.delta as Record<string, unknown> | undefined;
      if (delta?.stop_reason) {
        return { type: 'message_complete', content: delta.stop_reason as string };
      }
    }

    // Error
    if (obj.type === 'error') {
      return {
        type: 'error',
        content: (obj.error as Record<string, unknown>)?.message as string || 'Unknown error',
        raw: obj,
      };
    }

    // Tool result (from MCP or other tool use)
    if (obj.type === 'tool_result') {
      return {
        type: 'tool_result',
        id: obj.tool_use_id as string,
        content: obj.content as string,
        isError: obj.is_error as boolean,
      };
    }

    // Ping/keep-alive
    if (obj.type === 'ping') {
      return { type: 'unknown', raw: obj };
    }

    // Unknown event type
    return { type: 'unknown', raw: obj };
  }

  /**
   * Flush any remaining buffer content.
   */
  flush(): StreamEvent[] {
    if (this.buffer.trim()) {
      const content = this.buffer;
      this.buffer = '';
      return [{
        type: 'content',
        content,
        partial: true,
      }];
    }
    return [];
  }

  /**
   * Reset the parser state.
   */
  reset(): void {
    this.buffer = '';
  }
}
