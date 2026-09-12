import type { WebSocketLikeConstructor } from '@supabase/supabase-js';
import WebSocket from 'ws';

/** Node 20 no tiene WebSocket nativo; supabase-js lo exige al crear el cliente. */
export const nodeRealtimeTransport = WebSocket as unknown as WebSocketLikeConstructor;
