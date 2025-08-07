// client/src/hooks/use-token-balances.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet } from "./use-wallet";
import { providers } from 'near-api-js';

// Типы для токенов и балансов
export interface TokenInfo {
  id: string;
  symbol: string;
  decimals: number;
  name?: string;
  isNative?: boolean;
  contractId?: string;
  balance?: string;
  usdValue?: string;
  iconUrl?: string;
}

interface TokenBalances {
  [tokenId: string]: string;
}

// Инициализация RPC провайдера
const RPC_PROVIDER = new providers.JsonRpcProvider({ url: 'https://rpc.mainnet.fastnear.com' });

/**
 * Безопасно преобразует баланс из минимальных единиц в человекочитаемый формат.
 */
function formatTokenAmount(amount: string, decimals: number): string {
  if (!amount || amount === "0") {
    return "0.000000";
  }

  try {
    const amountBigInt = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    
    const integerPart = amountBigInt / divisor;
    const fractionalPart = amountBigInt % divisor;
    
    // Преобразуем дробную часть в строку и дополним нулями
    let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    
    // Ограничиваем до 6 знаков после запятой
    const maxFractionDigits = Math.min(decimals, 6);
    fractionalStr = fractionalStr.substring(0, maxFractionDigits);
    
    if (fractionalStr === '0'.repeat(maxFractionDigits)) {
      return integerPart.toString();
    } else {
      return `${integerPart.toString()}.${fractionalStr}`;
    }
  } catch (e) {
    console.error("Error formatting token amount:", e);
    return "0.000000";
  }
}

/**
 * Получает баланс токена (NEAR или NEP-141).
 */
async function fetchTokenBalance(
  accountId: string, 
  tokenId: string, 
  decimals: number
): Promise<string> {
  try {
    if (tokenId === 'near' || tokenId === 'wrap.near') {
      const account = await RPC_PROVIDER.query({
        request_type: 'view_account',
        finality: 'final',
        account_id: accountId,
      });
      
      // @ts-ignore
      const balanceYocto: string = account.amount;
      
      if (typeof balanceYocto !== 'string') {
        return '0.000000';
      }

      return formatTokenAmount(balanceYocto, 24); 
    } else {
      const rawBalanceResponse = await RPC_PROVIDER.query({
        request_type: 'call_function',
        account_id: tokenId,
        method_name: 'ft_balance_of',
        args_base64: btoa(JSON.stringify({ account_id: accountId })),
        finality: 'final',
      });

      // @ts-ignore
      const balanceResult: Uint8Array | number[] = rawBalanceResponse.result;
      
      let uint8Array: Uint8Array;
      if (balanceResult instanceof Uint8Array) {
        uint8Array = balanceResult;
      } else if (Array.isArray(balanceResult)) {
        uint8Array = new Uint8Array(balanceResult);
      } else {
        throw new Error('Invalid result type from ft_balance_of');
      }
      
      const decoder = new TextDecoder();
      const balanceJsonString = decoder.decode(uint8Array);
      
      let balance: string;
      try {
        balance = JSON.parse(balanceJsonString);
      } catch (parseError) {
        console.error(`Error parsing balance JSON for ${tokenId}:`, parseError);
        return '0.000000';
      }
      
      if (typeof balance !== 'string') {
        return '0.000000';
      }

      return formatTokenAmount(balance, decimals);
    }
  } catch (error) {
    console.error(`Error fetching balance for ${tokenId}:`, error);
    return '0.000000'; 
  }
}

/**
 * Хук для получения балансов токенов.
 * Оптимизирован для предотвращения частых RPC-запросов.
 */
export function useTokenBalances(tokens: TokenInfo[]) {
  const { wallet } = useWallet();
  const [balances, setBalances] = useState<TokenBalances>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Мемоизируем токены, чтобы избежать лишних ре-рендеров
  const memoizedTokens = useMemo(() => tokens, [
    // Создаем строковый ключ из токенов для сравнения
    tokens.map(t => `${t.id}-${t.decimals}`).join('|')
  ]);

  const fetchBalances = useCallback(async () => {
    if (!wallet.isConnected || !wallet.accountId) {
      setBalances({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const accountId = wallet.accountId;
      
      // Параллельно запрашиваем все балансы
      const balancePromises = memoizedTokens.map(token =>
        fetchTokenBalance(accountId, token.id, token.decimals)
          .then(balance => ({ tokenId: token.id, balance }))
      );

      const results = await Promise.all(balancePromises);
      
      const newBalances: TokenBalances = {};
      results.forEach(({ tokenId, balance }) => {
        newBalances[tokenId] = balance;
      });

      setBalances(newBalances);
    } catch (err) {
      console.error("Failed to fetch token balances:", err);
      setError("Failed to load token balances.");
    } finally {
      setIsLoading(false);
    }
  }, [wallet.isConnected, wallet.accountId, memoizedTokens]);

  // Эффект сабмиитит запрос только когда accountId или токены меняются
  useEffect(() => {
    fetchBalances();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(() => {
      if (wallet.isConnected && wallet.accountId) {
        fetchBalances();
      }
    }, 30000); // 30 секунд
    
    return () => clearInterval(interval);
  }, [fetchBalances]);

  const refetch = useCallback(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    isLoading,
    error,
    refetch,
  };
}
