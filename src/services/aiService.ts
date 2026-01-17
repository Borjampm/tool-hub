/**
 * AI Service - Connect-Web client for AI Tasks Service
 *
 * This service provides a wrapper around Connect-Web to communicate
 * with the AI Tasks Service running on Google Cloud Run using grpc-web protocol.
 *
 * Regenerate protobuf files with: npm run proto:generate
 */

import { createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { create } from '@bufbuild/protobuf';
import { ChatService, ChatRequestSchema } from '../generated/chat_service_pb';

// Get the gRPC server URL from environment variables
const GRPC_SERVER_URL = import.meta.env.VITE_GRPC_SERVER_URL;

if (!GRPC_SERVER_URL) {
  console.warn(
    'VITE_GRPC_SERVER_URL is not defined. AI service will not work.'
  );
}

// Create the grpc-web transport
const transport = GRPC_SERVER_URL
  ? createGrpcWebTransport({
      baseUrl: GRPC_SERVER_URL,
    })
  : null;

// Create the service client
const client = transport ? createClient(ChatService, transport) : null;

// Session management - persists conversation history on the server
let currentSessionId: string = '';

export interface StreamCallbacks {
  onChunk: (answer: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Send a message to the AI chat service and receive streaming responses.
 * The service maintains conversation history using session IDs.
 *
 * @param messageText - The message to send to the AI
 * @param callbacks - Callbacks for handling the streaming response
 * @returns A cancel function to abort the stream
 */
export function streamQA(
  messageText: string,
  callbacks: StreamCallbacks
): () => void {
  if (!client) {
    callbacks.onError(new Error('AI service is not configured'));
    return () => {};
  }

  // Create an AbortController for cancellation
  const abortController = new AbortController();

  // Create the request message with current session (empty string = new session)
  const request = create(ChatRequestSchema, {
    message: messageText,
    sessionId: currentSessionId,
  });

  // Start the streaming call
  (async () => {
    try {
      for await (const response of client.chat(request, {
        signal: abortController.signal,
      })) {
        // Capture the session ID from the first response
        if (response.sessionId && !currentSessionId) {
          currentSessionId = response.sessionId;
        }
        callbacks.onChunk(response.message);
      }
      callbacks.onComplete();
    } catch (error) {
      if (abortController.signal.aborted) {
        // Stream was cancelled, don't call error callback
        return;
      }
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  })();

  // Return a cancel function
  return () => {
    abortController.abort();
  };
}

/**
 * Check if the AI service is configured and available.
 */
export function isAIServiceAvailable(): boolean {
  return client !== null;
}

/**
 * Clear the current chat session.
 * The next message will start a new conversation.
 */
export function clearSession(): void {
  currentSessionId = '';
}

/**
 * Get the current session ID.
 * Returns empty string if no session is active.
 */
export function getSessionId(): string {
  return currentSessionId;
}
