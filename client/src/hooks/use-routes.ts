// use-routes.ts
import { useQuery } from '@tanstack/react-query';
import { intearAPI } from '../services/intear-api';
import { nearIntents } from '../services/near-intents';
import { RouteRequest, RouteInfo } from '@shared/schema';

export function useRoutes(request: RouteRequest | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['routes', request],
    queryFn: async (): Promise<RouteInfo[]> => {
      if (!request) return [];
      
      try {
        // Get routes from Intear API
        const intearRoutes = await intearAPI.getRoutes(request);
        
        // If NEAR Intents is available, also get quotes from there
        if (request.tokenIn && request.tokenOut && (request.amountIn || request.amountOut)) {
          try {
            const intentsQuotes = await nearIntents.getQuotes({
              defuse_asset_identifier_in: nearIntents.convertToDefuseAsset(request.tokenIn),
              defuse_asset_identifier_out: nearIntents.convertToDefuseAsset(request.tokenOut),
              exact_amount_in: request.amountIn,
              exact_amount_out: request.amountOut,
              min_deadline_ms: 60000,
            });
            
            // Convert NEAR Intents quotes to RouteInfo format
            const intentsRoutes: RouteInfo[] = intentsQuotes.map(quote => ({
              deadline: quote.expiration_time,
              has_slippage: false,
              estimated_amount: {
                amount_out: quote.amount_out,
              },
              worst_case_amount: {
                amount_out: quote.amount_out, // No slippage for intents
              },
              dex_id: 'NearIntents',
              execution_instructions: [{
                IntentsQuote: {
                  message_to_sign: JSON.stringify(quote),
                  quote_hash: quote.quote_hash,
                }
              }],
              needs_unwrap: false,
            }));
            
            return [...intearRoutes, ...intentsRoutes];
          } catch (intentsError) {
            console.warn('Failed to get NEAR Intents quotes:', intentsError);
          }
        }
        
        return intearRoutes;
      } catch (error) {
        console.error('Failed to fetch routes:', error);
        throw error;
      }
    },
    enabled: enabled && !!request,
    staleTime: 10000, // Consider data stale after 10 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  });
}

export function useBestRoute(routes: RouteInfo[] | undefined) {
  if (!routes || routes.length === 0) return null;
  return intearAPI.getBestRoute(routes);
}
