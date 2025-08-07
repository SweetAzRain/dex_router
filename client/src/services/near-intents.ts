// near-intents.ts
const SOLVER_RELAY_API = 'https://solver-relay-v2.chaindefuser.com/rpc';

export interface IntentsQuoteRequest {
  defuse_asset_identifier_in: string;
  defuse_asset_identifier_out: string;
  exact_amount_in?: string;
  exact_amount_out?: string;
  min_deadline_ms?: number;
}

export interface IntentsQuoteResponse {
  quote_hash: string;
  defuse_asset_identifier_in: string;
  defuse_asset_identifier_out: string;
  amount_in: string;
  amount_out: string;
  expiration_time: string;
}

export interface IntentPublication {
  quote_hashes: string[];
  signed_data: {
    standard: string;
    payload: any;
    signature: string;
    public_key: string;
  };
}

export class NearIntentsService {
  private requestId = 1;

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
      throw new Error('Failed to get guaranteed quotes. Please try again.');
    }
  }

  async publishIntent(publication: IntentPublication): Promise<{ status: string; intent_hash: string }> {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Failed to publish intent');
      }

      return data.result;
    } catch (error) {
      console.error('Failed to publish NEAR Intent:', error);
      throw new Error('Failed to execute guaranteed swap. Please try again.');
    }
  }

  async getIntentStatus(intentHash: string): Promise<any> {
    const body = {
      id: this.requestId++,
      jsonrpc: '2.0',
      method: 'get_status',
      params: [{
        intent_hash: intentHash,
      }],
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

  convertToDefuseAsset(tokenId: string): string {
    if (tokenId === 'near') {
      return 'native:near';
    }
    return `nep141:${tokenId}`;
  }
}

export const nearIntents = new NearIntentsService();
