// client/src/hooks/use-token-balances.ts
import { useState, useEffect, useCallback } from "react";
import { useWallet } from "./use-wallet"; // Убедитесь, что путь корректен
import { providers } from 'near-api-js';
// Импортируем только необходимые утилиты из near-api-js, избегая зависимостей, которые могут вызвать проблемы с Buffer
// utils.format.formatNearAmount может быть проблемой, поэтому реализуем свой форматтер

// Типы для токенов и балансов
export interface TokenInfo {
  id: string; // Account ID контракта токена или 'near'/'wrap.near' для нативного токена
  symbol: string;
  decimals: number;
  // Другие поля при необходимости
  name?: string;
  isNative?: boolean;
  contractId?: string;
  balance?: string;
  usdValue?: string;
  iconUrl?: string;
}

interface TokenBalances {
  [tokenId: string]: string; // tokenId -> formatted balance (e.g., "12.345678")
}

// Инициализация RPC провайдера
const RPC_PROVIDER = new providers.JsonRpcProvider({ url: 'https://rpc.mainnet.near.org' });

/**
 * Безопасно преобразует баланс из минимальных единиц (например, yoctoNEAR или wei) в человекочитаемый формат.
 * @param amount Строка с числом в минимальных единицах (например, "1000000000000000000000000" для 1 NEAR)
 * @param decimals Количество десятичных знаков токена (24 для NEAR, 6 для USDT)
 * @returns Отформатированная строка с балансом (например, "1.000000")
 */
function formatTokenAmount(amount: string, decimals: number): string {
  if (!amount || amount === "0") {
    return "0.000000";
  }

  try {
    // Убедимся, что amount - это строка, представляющая целое число
    const amountBigInt = BigInt(amount);
    const divisor = 10 ** decimals;

    // Для избежания проблем с дробной частью при больших числах, работаем через BigInt
    const integerPart = amountBigInt / BigInt(divisor);
    const fractionalPart = amountBigInt % BigInt(divisor);

    // Преобразуем дробную часть в строку и дополним нулями слева до нужной длины
    let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    
    // Ограничиваем количество знаков после запятой (например, до 6)
    const maxFractionDigits = Math.min(decimals, 6);
    if (fractionalStr.length > maxFractionDigits) {
        // Округление: если следующая цифра >= 5, увеличиваем предыдущую
        // Для простоты просто обрежем, можно добавить округление при необходимости
        fractionalStr = fractionalStr.substring(0, maxFractionDigits);
        // Простое "округление" вниз, можно улучшить при необходимости
    }
    
    // Убираем ведущие нули из дробной части справа, если нужно, но оставляем до maxFractionDigits
    // fractionalStr = fractionalStr.replace(/0+$/, '') || '0'; // Убираем хвостовые нули
    // Но для фиксированного формата лучше оставить
    // fractionalStr = fractionalStr.substring(0, maxFractionDigits); // Уже сделано выше

    // Собираем финальную строку
    if (fractionalStr === '0'.repeat(maxFractionDigits)) {
        // Если дробная часть нулевая, возвращаем только целую часть
        return integerPart.toString();
    } else {
        // Возвращаем с фиксированным числом знаков после запятой
        return `${integerPart.toString()}.${fractionalStr}`;
    }
  } catch (e) {
    console.error("Error formatting token amount:", e, "Amount:", amount, "Decimals:", decimals);
    return "0.000000";
  }
}

/**
 * Получает баланс токена (NEAR или NEP-141) для указанного аккаунта.
 * @param accountId ID аккаунта NEAR
 * @param tokenId ID токена ('near' или 'wrap.near' для нативного токена, account ID контракта для NEP-141)
 * @param decimals Десятичные знаки токена (для форматирования)
 * @returns Отформатированный баланс как строка или '0.000000' в случае ошибки
 */
export async function fetchTokenBalance(
  accountId: string, 
  tokenId: string, 
  decimals: number
): Promise<string> { // Возвращаем всегда string для простоты
  try {
    if (tokenId === 'near' || tokenId === 'wrap.near') {
      // Получение баланса NEAR/wNEAR
      const account = await RPC_PROVIDER.query({
        request_type: 'view_account',
        finality: 'final',
        account_id: accountId,
      });
      
      // @ts-ignore - типизация near-api-js может быть неточной
      const balanceYocto: string = account.amount;
      
      // Проверка типа
      if (typeof balanceYocto !== 'string') {
        console.warn(`Unexpected balance type for ${tokenId}:`, typeof balanceYocto, balanceYocto);
        return '0.000000';
      }

      // Форматирование из yoctoNEAR (10^-24) в NEAR с 6 знаками после запятой
      return formatTokenAmount(balanceYocto, 24); 
    } else {
      // Получение баланса NEP-141 токена
      const rawBalanceResponse = await RPC_PROVIDER.query({
        request_type: 'call_function',
        account_id: tokenId,
        method_name: 'ft_balance_of',
        args_base64: btoa(JSON.stringify({ account_id: accountId })), // Кодируем аргументы в base64
        finality: 'final',
      });

      // @ts-ignore - типизация near-api-js может быть неточной
      const balanceResult: Uint8Array | number[] = rawBalanceResponse.result;
      
      // Декодируем результат из Uint8Array/number[] в строку JSON
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
      
      // Парсим JSON
      let balance: string;
      try {
        balance = JSON.parse(balanceJsonString);
      } catch (parseError) {
        console.error(`Error parsing balance JSON for ${tokenId}:`, parseError, 'Raw string:', balanceJsonString);
        return '0.000000';
      }
      
      // Проверка типа
      if (typeof balance !== 'string') {
        console.warn(`Unexpected balance type for NEP-141 token ${tokenId}:`, typeof balance, balance);
        return '0.000000';
      }

      // Форматирование баланса токена с учетом его десятичных знаков
      return formatTokenAmount(balance, decimals);
    }
  } catch (error) {
    console.error(`Error fetching balance for ${tokenId} for account ${accountId}:`, error);
    // Возвращаем '0.000000' в случае ошибки
    return '0.000000'; 
  }
}

/**
 * Хук для получения балансов списка токенов для подключенного кошелька.
 * @param tokens Массив объектов TokenInfo
 * @returns Объект с балансами, состоянием загрузки и функцией обновления
 */
export function useTokenBalances(tokens: TokenInfo[]) {
  const { wallet } = useWallet();
  const [balances, setBalances] = useState<TokenBalances>({});
  const [isLoading, setIsLoading] = useState<boolean>(true); // Начальное состояние true
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    // Проверка наличия необходимых данных
    if (!wallet || !wallet.isConnected || !wallet.accountId) {
      // Если кошелек не подключен, очищаем балансы и выходим
      setBalances({});
      setIsLoading(false); // Убедиться, что загрузка завершена
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const accountId = wallet.accountId;
      
      // Создаем массив промисов для всех токенов
      const balancePromises = tokens.map(token =>
        fetchTokenBalance(accountId, token.id, token.decimals).then(balance => ({
          tokenId: token.id,
          balance
        }))
      );

      // Ждем завершения всех запросов
      const results = await Promise.all(balancePromises);

      // Формируем объект балансов
      const newBalances: TokenBalances = {};
      results.forEach(({ tokenId, balance }) => {
        newBalances[tokenId] = balance;
      });

      setBalances(newBalances);
    } catch (err) {
      console.error("Failed to fetch token balances:", err);
      setError("Failed to load token balances.");
      // Не очищаем балансы в случае ошибки, оставляем старые или пустой объект
    } finally {
      setIsLoading(false);
    }
  }, [wallet, tokens]); // Зависимости: перезапуск при смене аккаунта, подключения или токенов

  // Эффект для автоматической загрузки балансов
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]); // Запуск при изменении fetchBalances

  // Возвращаем функцию для ручного обновления балансов
  const refetch = useCallback(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    isLoading,
    error,
    refetch, // Функция для принудительного обновления
  };
}
