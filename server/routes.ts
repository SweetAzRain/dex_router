import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, routeRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get available tokens
  app.get("/api/tokens", async (req, res) => {
    try {
      const tokens = await storage.getTokens();
      res.json(tokens);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get token balances for an account
  app.get("/api/balances/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const tokens = await storage.getTokens();
      
      // In a real implementation, you would fetch balances from NEAR blockchain
      const balances = tokens.map(token => ({
        ...token,
        balance: "0", // Placeholder - would fetch real balance
        usdValue: "0.00"
      }));
      
      res.json(balances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get swap routes (proxy to Intear API)
  app.post("/api/routes", async (req, res) => {
    try {
      const routeRequest = routeRequestSchema.parse(req.body);
      
      // Build query parameters for Intear API
      const params = new URLSearchParams();
      params.set('token_in', routeRequest.tokenIn);
      params.set('token_out', routeRequest.tokenOut);
      
      if (routeRequest.amountIn) {
        params.set('amount_in', routeRequest.amountIn);
      }
      if (routeRequest.amountOut) {
        params.set('amount_out', routeRequest.amountOut);
      }
      
      params.set('max_wait_ms', routeRequest.maxWaitMs.toString());
      params.set('slippage_type', routeRequest.slippageConfig.type);
      
      if (routeRequest.slippageConfig.type === 'Fixed' && routeRequest.slippageConfig.slippage) {
        params.set('slippage', routeRequest.slippageConfig.slippage.toString());
      }
      
      if (routeRequest.slippageConfig.type === 'Auto') {
        if (routeRequest.slippageConfig.maxSlippage) {
          params.set('max_slippage', routeRequest.slippageConfig.maxSlippage.toString());
        }
        if (routeRequest.slippageConfig.minSlippage) {
          params.set('min_slippage', routeRequest.slippageConfig.minSlippage.toString());
        }
      }
      
      if (routeRequest.dexes && routeRequest.dexes.length > 0) {
        params.set('dexes', routeRequest.dexes.join(','));
      }
      
      if (routeRequest.traderAccountId) {
        params.set('trader_account_id', routeRequest.traderAccountId);
      }
      
      if (routeRequest.signingPublicKey) {
        params.set('signing_public_key', routeRequest.signingPublicKey);
      }

      // Make request to Intear API
      const intearResponse = await fetch(`https://router.intear.tech/route?${params.toString()}`);
      
      if (!intearResponse.ok) {
        const errorText = await intearResponse.text();
        throw new Error(`Intear API error: ${intearResponse.status} - ${errorText}`);
      }
      
      const routes = await intearResponse.json();
      
      // Store route in our database for caching
      try {
        await storage.createSwapRoute({
          tokenIn: routeRequest.tokenIn,
          tokenOut: routeRequest.tokenOut,
          amountIn: routeRequest.amountIn || null,
          amountOut: routeRequest.amountOut || null,
          route: Array.isArray(routes) ? routes : [routes],
        });
      } catch (storageError) {
        console.warn('Failed to store route:', storageError);
      }
      
      res.json(Array.isArray(routes) ? routes : [routes]);
    } catch (error: any) {
      console.error('Route request failed:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get transactions for an account
  app.get("/api/transactions", async (req, res) => {
    try {
      const { accountId } = req.query;
      
      if (!accountId || typeof accountId !== 'string') {
        return res.status(400).json({ message: 'Account ID is required' });
      }
      
      const transactions = await storage.getTransactionsByAccount(accountId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new transaction record
  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update transaction status
  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, hash } = req.body;
      
      const transaction = await storage.updateTransaction(id, { status, hash });
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // NEAR Intents API proxy
  app.post("/api/intents", async (req, res) => {
    try {
      const { intent, accountId, publicKey } = req.body;
      
      if (!intent || !accountId) {
        return res.status(400).json({ message: 'Intent and account ID are required' });
      }

      // Submit intent to Defuse solver relay
      const response = await fetch('https://defuse.org/api/solver/relay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent,
          account_id: accountId,
          public_key: publicKey || undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NEAR Intents API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error('NEAR Intents request failed:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
