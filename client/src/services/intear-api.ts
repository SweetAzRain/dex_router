// client/src/services/intear-api.ts (или соответствующий путь)
import { RouteRequest, RouteInfo } from '@shared/schema'; // Убедитесь, что путь корректен

// ИСПРАВЛЕНО: Используем прямой URL API Intear, убраны лишние пробелы
const INTEAR_API_BASE = 'https://router.intear.tech';

export class IntearAPIService {
  async getRoutes(request: RouteRequest): Promise<RouteInfo[]> {
    try {
      console.log('Requesting routes directly from Intear API:', request);
      
      // ИСПРАВЛЕНО: Прямой вызов API Intear, без внутреннего прокси
      const response = await fetch(`${INTEAR_API_BASE}/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Если API Intear требует API-ключ, добавьте его в заголовки:
          // 'X-API-KEY': 'YOUR_INTEAR_API_KEY_HERE', 
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Intear API error response:', errorText);
        throw new Error(`Intear API error: ${response.status} - ${errorText}`);
      }
      
      const routes = await response.json();
      console.log('Received routes from Intear API:', routes);
      // Убедиться, что возвращается массив
      return Array.isArray(routes) ? routes : [routes];
    } catch (error) {
      console.error('Failed to fetch routes from Intear API:', error);
      // Более информативная ошибка
      throw new Error(`Failed to fetch swap routes from Intear API. Please try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getBestRoute(routes: RouteInfo[]): RouteInfo | null {
    if (!routes || routes.length === 0) return null; // Добавлена проверка на null/undefined
    
    // Sort by estimated output amount (higher is better)
    const sortedRoutes = [...routes].sort((a, b) => { // Создаем копию массива перед сортировкой
      const amountA = parseFloat(a.estimated_amount.amount_out);
      const amountB = parseFloat(b.estimated_amount.amount_out);
      // Обработка NaN
      if (isNaN(amountA) && isNaN(amountB)) return 0;
      if (isNaN(amountA)) return 1; // b лучше
      if (isNaN(amountB)) return -1; // a лучше
      return amountB - amountA;
    });
    
    return sortedRoutes[0];
  }

  formatAmount(amount: string, decimals: number = 24): string {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(decimals, 6), // Не больше 6 знаков или decimals, смотря что меньше
    });
  }

  parseAmount(amount: string, decimals: number = 24): string {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      return "0";
    }
    
    // Для корректной работы с большими числами и избежания потери точности при работе с дробями
    // используем BigInt
    try {
        // Проверка на слишком большое число
        if (num > Number.MAX_SAFE_INTEGER / (10 ** decimals)) {
             console.warn("Amount is very large, potential precision loss with BigInt conversion.");
             // Можно выбросить ошибку или обработать иначе
        }
        
        const multiplier = BigInt(10 ** decimals);
        // Math.floor(num) может быть неточным для больших чисел с плавающей точкой
        // Лучше работать с целой частью напрямую
        const integerPart = BigInt(Math.floor(num));
        const fractionalPart = num - Math.floor(num);
        // Умножаем дробную часть на 10^decimals и округляем
        const fractionalMultiplier = 10 ** decimals;
        const fractionalBigInt = BigInt(Math.round(fractionalPart * fractionalMultiplier));
        
        const result = integerPart * multiplier + fractionalBigInt;
        return result.toString();
    } catch (e) {
        console.error("Error parsing amount with BigInt:", e, "Amount:", amount, "Decimals:", decimals);
        // Fallback к стандартному способу, но с предупреждением
        const result = Math.round(num * (10 ** decimals));
        return result.toString();
    }
  }
}

export const intearAPI = new IntearAPIService();
