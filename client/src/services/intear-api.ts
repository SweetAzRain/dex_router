// intear-api.ts
import { RouteRequest, RouteInfo } from '@shared/schema';

const INTEAR_API_BASE = 'https://router.intear.tech';

export class IntearAPIService {
  async getRoutes(request: RouteRequest): Promise<RouteInfo[]> {
    try {
      console.log('Requesting routes:', request);
      
      // Используем наш сервер как прокси к Intear API
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const routes = await response.json();
      console.log('Received routes:', routes);
      return Array.isArray(routes) ? routes : [routes];
    } catch (error) {
      console.error('Failed to fetch routes from server:', error);
      throw new Error('Failed to fetch swap routes. Please try again.');
    }
  }

  getBestRoute(routes: RouteInfo[]): RouteInfo | null {
    if (routes.length === 0) return null;
    
    // Sort by estimated output amount (higher is better)
    const sortedRoutes = routes.sort((a, b) => {
      const amountA = parseFloat(a.estimated_amount.amount_out);
      const amountB = parseFloat(b.estimated_amount.amount_out);
      return amountB - amountA;
    });
    
    return sortedRoutes[0];
  }

  formatAmount(amount: string, decimals: number = 24): string {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  }

  parseAmount(amount: string, decimals: number = 24): string {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      return "0";
    }
    
    // Используем BigInt для избежания проблем с большими числами
    const multiplier = BigInt(10 ** decimals);
    const integerPart = BigInt(Math.floor(num));
    const fractionalPart = num - Math.floor(num);
    const fractionalBigInt = BigInt(Math.floor(fractionalPart * (10 ** decimals)));
    
    const result = integerPart * multiplier + fractionalBigInt;
    return result.toString();
  }
}

export const intearAPI = new IntearAPIService();
