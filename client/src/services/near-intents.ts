// client/src/services/near-intents.ts
const SOLVER_RELAY_API = 'https://solver-relay-v2.chaindefuser.com/rpc';

// --- Существующие типы и интерфейсы ---
export interface IntentsQuoteRequest {
  defuse_asset_identifier_in: string;
  defuse_asset_identifier_out: string;
  // amount_in: string; // Или amount_out
  // slippage: number;
  // ... другие поля запроса
  [key: string]: any; // Для гибкости
}

export interface IntentsQuoteResponse {
  quote_hash: string;
  // message: string; // Это message_to_sign
  // amount_out: string;
  // ... другие поля ответа
  [key: string]: any; // Для гибкости
}

// --- НОВЫЙ тип для publish_intent ---
export interface IntentPublication {
  quote_hashes: string[];
  signed_data: {
    standard: string; // Например, "nep413"
    payload: any; // Данные, возвращенные из signMessage
    signature: string;
    public_key: string;
  };
}

export interface PublishIntentResult {
  status: string; // "OK" или другое
  intent_hash: string;
}
// --- КОНЕЦ НОВОГО типа ---

export class NearIntentsService {
  private requestId = 1;

  // --- Существующий метод getQuotes ---
  async getQuotes(request: IntentsQuoteRequest): Promise<IntentsQuoteResponse[]> {
    const body = {
      id: this.requestId++,
      jsonrpc: '2.0',
      method: 'quote',
      params: [request],
    };

    try {
      const response = await fetch(SOLVER_RELAY_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Failed to get quotes');
      }

      return data.result || [];
    } catch (error) {
      console.error('Failed to get NEAR Intents quotes:', error);
      throw error;
    }
  }
  // --- КОНЕЦ Существующего метода getQuotes ---

  // --- Существующий метод getIntentStatus ---
  async getIntentStatus(intentHash: string): Promise<any> {
    const body = {
      id: this.requestId++,
      jsonrpc: '2.0',
      method: 'get_status',
      params: [{ intent_hash: intentHash }],
    };

    try {
      const response = await fetch(SOLVER_RELAY_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Failed to get intent status:', error);
      throw error;
    }
  }
  // --- КОНЕЦ Существующего метода getIntentStatus ---

  // --- НОВЫЙ метод publishIntent ---
  /**
   * Публикует подписанный интент в Solver Relay.
   * @param publication Данные для публикации.
   * @returns Результат публикации.
   */
  async publishIntent(publication: IntentPublication): Promise<PublishIntentResult> {
    const body = {
      id: this.requestId++,
      jsonrpc: '2.0',
      method: 'publish_intent',
      params: [publication],
    };

    try {
      const response = await fetch(SOLVER_RELAY_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || `Failed to publish intent: ${JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (error) {
      console.error('Failed to publish NEAR Intent:', error);
      throw new Error(`Failed to send swap intent to solver. Please try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  // --- КОНЕЦ НОВОГО метода publishIntent ---

  convertToDefuseAsset(tokenId: string): string {
    if (tokenId === 'near') {
      return 'native:near';
    }
    return `nep141:${tokenId}`;
  }
}

export const nearIntents = new NearIntentsService();
