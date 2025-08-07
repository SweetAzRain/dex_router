export interface NearWallet {
  isConnected: boolean;
  accountId: string | null;
  balance: string;
  publicKey: string | null;
}

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  contractId?: string;
  isNative: boolean;
  balance: string;
  usdValue: string;
  iconUrl?: string;
}

export interface RouteInstruction {
  NearTransaction?: {
    receiver_id: string;
    actions: Array<{
      FunctionCall?: {
        method_name: string;
        args: string;
        gas: string;
        deposit: string;
      };
    }>;
    continue_if_failed: boolean;
  };
  IntentsQuote?: {
    message_to_sign: string;
    quote_hash: string;
  };
}

export interface RouteInfo {
  deadline: string | null;
  has_slippage: boolean;
  estimated_amount: {
    amount_out: string;
  };
  worst_case_amount: {
    amount_out: string;
  };
  dex_id: string;
  execution_instructions: RouteInstruction[];
  needs_unwrap: boolean;
}

export interface SwapTransaction {
  id: string;
  hash: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  dexId: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}
