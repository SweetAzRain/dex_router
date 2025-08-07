// client/src/services/intear-api.ts
import { RouteRequest, RouteInfo } from '@shared/schema';

// Используем URL из документации
const INTEAR_API_BASE = 'https://router.intear.tech';
const INTEAR_API_PATH = '/route'; // Путь из документации

export class IntearAPIService {
  /**
   * Преобразует объект RouteRequest в строку query parameters для GET-запроса.
   * @param request Объект запроса маршрутов.
   * @returns Строка query parameters, начинающаяся с '?'.
   */
  private buildQueryParams(request: RouteRequest): string {
    const params = new URLSearchParams();

    // Обязательные параметры
    if (request.tokenIn !== undefined) params.append('token_in', request.tokenIn);
    if (request.tokenOut !== undefined) params.append('token_out', request.tokenOut);

    // Один из amount_in или amount_out должен быть указан
    if (request.amountIn !== undefined) {
      params.append('amount_in', request.amountIn);
    } else if (request.amountOut !== undefined) {
      params.append('amount_out', request.amountOut);
    }

    // Опциональные параметры
    if (request.maxWaitMs !== undefined) params.append('max_wait_ms', request.maxWaitMs.toString());
    
    if (request.slippageConfig) {
      params.append('slippage_type', request.slippageConfig.type);
      if (request.slippageConfig.type === 'Fixed' && request.slippageConfig.slippage !== undefined) {
        params.append('slippage', request.slippageConfig.slippage.toString());
      } else if (request.slippageConfig.type === 'Auto') {
        if (request.slippageConfig.maxSlippage !== undefined) {
          params.append('max_slippage', request.slippageConfig.maxSlippage.toString());
        }
        if (request.slippageConfig.minSlippage !== undefined) {
          params.append('min_slippage', request.slippageConfig.minSlippage.toString());
        }
      }
    }

    // dexes, trader_account_id, signing_public_key - если они используются
    // Пример для dexes (если это массив):
    // if (request.dexes && request.dexes.length > 0) {
    //   params.append('dexes', request.dexes.join(','));
    // }
    if (request.traderAccountId !== undefined) {
      params.append('trader_account_id', request.traderAccountId);
    }
    // signingPublicKey может потребоваться позже для определенных типов маршрутов
    // if (request.signingPublicKey !== undefined) {
    //   // Обратите внимание: ed25519:... нужно кодировать правильно
    //   params.append('signing_public_key', request.signingPublicKey);
    // }

    return params.toString() ? `?${params.toString()}` : '';
  }

  async getRoutes(request: RouteRequest): Promise<RouteInfo[]> {
    try {
      console.log('DEBUG: Preparing GET request to Intear API');
      console.log('DEBUG: Request payload:', request);

      // Строим query parameters
      const queryParams = this.buildQueryParams(request);
      const url = `${INTEAR_API_BASE}${INTEAR_API_PATH}${queryParams}`;
      
      console.log('DEBUG: Full URL for GET request:', url);

      // Выполняем GET запрос
      const response = await fetch(url, {
        method: 'GET', // <-- ВАЖНО: Метод GET
        headers: {
          'Content-Type': 'application/json', // <-- Может не быть обязательным для GET, но оставим
          // Если у вас есть API ключ, добавьте его сюда:
          // 'Authorization': 'Bearer YOUR_INTEAR_API_KEY_HERE',
        },
        // body не используется в GET запросе
      });

      console.log('DEBUG: Raw response from Intear API:', response);
      console.log('DEBUG: Response status:', response.status);
      console.log('DEBUG: Response statusText:', response.statusText);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.log('DEBUG: Raw error response text:', errorText);
        } catch (e) {
          console.log('DEBUG: Could not read error response text:', e);
        }

        console.error(`Intear API error: ${response.status} - ${response.statusText}`, { status: response.status, statusText: response.statusText, errorText });
        const errorMessageDetail = errorText ? `Details: ${errorText.substring(0, 200)}` : `Status: ${response.status} ${response.statusText}`;
        throw new Error(`Intear API request failed: ${errorMessageDetail}`);
      }

      // Проверим Content-Type ответа
      const contentType = response.headers.get('content-type');
      console.log('DEBUG: Response Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text();
          console.error('Intear API non-JSON response:', response.status, response.statusText, responseText.substring(0, 200));
          throw new Error(`Intear API error: ${response.status} - ${response.statusText}. Expected JSON, got: ${responseText.substring(0, 100)}...`);
      }

      const data = await response.json();
      console.log('DEBUG: Parsed JSON response from Intear API:', data);
      
      // Обработка структуры ответа
      // Согласно документации и примерам, API возвращает объект { data: RouteInfo[] }
      if (data && Array.isArray(data.data)) {
          console.log('DEBUG: Returning data.data');
          // Фильтруем маршруты, у которых есть execution_instructions
          const validRoutes = data.data.filter((route: any) => route.execution_instructions && route.execution_instructions.length > 0);
          console.log('DEBUG: Filtered routes with execution_instructions:', validRoutes.length);
          return validRoutes;
      } else if (Array.isArray(data)) {
          console.log('DEBUG: Returning data array directly');
          // Фильтруем маршруты, у которых есть execution_instructions
          const validRoutes = data.filter((route: any) => route.execution_instructions && route.execution_instructions.length > 0);
          console.log('DEBUG: Filtered routes with execution_instructions:', validRoutes.length);
          return validRoutes;
      } else {
          console.warn('DEBUG: Unexpected response format from Intear API:', data);
          // Попробуем вернуть пустой массив, чтобы не ломать UI
          return [];
      }
    } catch (error) {
      console.error('DEBUG: Failed to fetch routes from Intear API:', error);
      const userMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch swap routes from Intear API. Please try again. Underlying error: ${userMessage}`);
    }
  }

  getBestRoute(routes: RouteInfo[]): RouteInfo | null {
    if (!routes || routes.length === 0) return null;
    
    const sortedRoutes = [...routes].sort((a, b) => {
      const amountA = parseFloat(a.estimated_amount.amount_out);
      const amountB = parseFloat(b.estimated_amount.amount_out);
      if (isNaN(amountA) && isNaN(amountB)) return 0;
      if (isNaN(amountA)) return 1;
      if (isNaN(amountB)) return -1;
      return amountB - amountA;
    });
    
    return sortedRoutes[0];
  }

  formatAmount(amount: string, decimals: number = 24): string {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(decimals, 6),
    });
  }

  parseAmount(amount: string, decimals: number = 24): string {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      return "0";
    }
    
    try {
        if (num > Number.MAX_SAFE_INTEGER / (10 ** decimals)) {
             console.warn("Amount is very large, potential precision loss with BigInt conversion.");
        }
        
        const multiplier = BigInt(10 ** decimals);
        const integerPart = BigInt(Math.floor(num));
        const fractionalPart = num - Math.floor(num);
        const fractionalMultiplier = 10 ** decimals;
        const fractionalBigInt = BigInt(Math.round(fractionalPart * fractionalMultiplier));
        
        const result = integerPart * multiplier + fractionalBigInt;
        return result.toString();
    } catch (e) {
        console.error("Error parsing amount with BigInt:", e, "Amount:", amount, "Decimals:", decimals);
        const result = Math.round(num * (10 ** decimals));
        return result.toString();
    }
  }
}

export const intearAPI = new IntearAPIService();
