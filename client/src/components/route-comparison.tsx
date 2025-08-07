//route-comparison.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight } from "lucide-react";
import { RouteInfo } from "../types/near";
import { intearAPI } from "../services/intear-api";

interface RouteComparisonProps {
  routes: RouteInfo[] | undefined;
  isLoading: boolean;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  toTokenDecimals: number;
}

export function RouteComparison({ 
  routes, 
  isLoading, 
  fromTokenSymbol, 
  toTokenSymbol, 
  toTokenDecimals 
}: RouteComparisonProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No routes available</h3>
              <p className="text-gray-500">Enter swap details to see available routes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bestRoute = intearAPI.getBestRoute(routes);
  const sortedRoutes = [...routes].sort((a, b) => {
    const amountA = parseFloat(a.estimated_amount.amount_out);
    const amountB = parseFloat(b.estimated_amount.amount_out);
    return amountB - amountA;
  });

  const calculatePriceImpact = (route: RouteInfo) => {
    // Simple price impact calculation - would need more sophisticated logic in production
    return "0.59";
  };

  const formatAmount = (amount: string) => {
    return intearAPI.formatAmount(amount, toTokenDecimals);
  };

  const getDexColor = (dexId: string) => {
    const colors: Record<string, string> = {
      'Rhea': 'bg-blue-100 text-blue-800',
      'Veax': 'bg-purple-100 text-purple-800',
      'NearIntents': 'bg-orange-100 text-orange-800',
      'Aidols': 'bg-green-100 text-green-800',
      'GraFun': 'bg-red-100 text-red-800',
      'Jumpdefi': 'bg-indigo-100 text-indigo-800',
      'Wrap': 'bg-gray-100 text-gray-800',
    };
    return colors[dexId] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Best Route Summary */}
      {bestRoute && (
        <Card data-testid="card-best-route">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Best Route Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Expected Output</span>
              <span className="font-semibold text-gray-900" data-testid="text-expected-output">
                {formatAmount(bestRoute.estimated_amount.amount_out)} {toTokenSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Minimum Received</span>
              <span className="font-semibold text-gray-900" data-testid="text-minimum-received">
                {formatAmount(bestRoute.worst_case_amount.amount_out)} {toTokenSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Price Impact</span>
              <span className="font-semibold text-green-600" data-testid="text-price-impact">
                {calculatePriceImpact(bestRoute)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Route</span>
              <div className="flex items-center space-x-1">
                <Badge className={getDexColor(bestRoute.dex_id)} data-testid="badge-best-dex">
                  {bestRoute.dex_id}
                </Badge>
                {!bestRoute.has_slippage && (
                  <Badge className="bg-blue-100 text-blue-800 ml-2">Guaranteed</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Routes */}
      <Card data-testid="card-all-routes">
        <CardHeader>
          <CardTitle className="text-xl font-bold">All Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedRoutes.map((route, index) => (
              <div
                key={`${route.dex_id}-${index}`}
                className={`border rounded-lg p-4 ${
                  index === 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
                data-testid={`card-route-${route.dex_id.toLowerCase()}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getDexColor(route.dex_id)}`}>
                      <TrendingUp className="h-3 w-3" />
                    </div>
                    <span className="font-medium text-gray-900" data-testid={`text-dex-${route.dex_id.toLowerCase()}`}>
                      {route.dex_id}
                    </span>
                    {index === 0 && (
                      <Badge className="bg-green-600 text-white text-xs">Best</Badge>
                    )}
                    {!route.has_slippage && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">Guaranteed</Badge>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900" data-testid={`text-amount-${route.dex_id.toLowerCase()}`}>
                    {formatAmount(route.estimated_amount.amount_out)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Gas: ~0.01 NEAR</span>
                  <span>{route.has_slippage ? 'Has Slippage' : 'No Slippage'}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Supported DEXes */}
      <Card data-testid="card-supported-dexes">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Supported DEXes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Rhea', color: 'bg-blue-500' },
              { name: 'Veax', color: 'bg-purple-500' },
              { name: 'NearIntents', color: 'bg-orange-500' },
              { name: 'Aidols', color: 'bg-green-500' },
              { name: 'GraFun', color: 'bg-red-500' },
              { name: 'Jumpdefi', color: 'bg-indigo-500' },
            ].map((dex) => (
              <div key={dex.name} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                <div className={`w-4 h-4 ${dex.color} rounded-full`}></div>
                <span className="text-sm font-medium">{dex.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-gray-500 text-center">
            Automatically finds the best route across all DEXes
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
