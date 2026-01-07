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
import { AIService, QuestionSchema } from '../generated/ai_service_pb';

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
const client = transport ? createClient(AIService, transport) : null;

export interface StreamCallbacks {
  onChunk: (answer: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Send a question to the AI service and receive streaming responses.
 *
 * @param questionText - The question to ask the AI
 * @param callbacks - Callbacks for handling the streaming response
 * @returns A cancel function to abort the stream
 */
export function streamQA(
  questionText: string,
  callbacks: StreamCallbacks
): () => void {
  if (!client) {
    callbacks.onError(new Error('AI service is not configured'));
    return () => {};
  }

  // Create an AbortController for cancellation
  const abortController = new AbortController();

  // Create the request message
  const request = create(QuestionSchema, { question: questionText });

  // Start the streaming call
  (async () => {
    try {
      for await (const response of client.qA(request, {
        signal: abortController.signal,
      })) {
        callbacks.onChunk(response.answer);
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
