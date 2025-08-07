import { type Token, type Transaction, type SwapRoute, type InsertToken, type InsertTransaction, type InsertSwapRoute } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Token methods
  getToken(id: string): Promise<Token | undefined>;
  getTokens(): Promise<Token[]>;
  createToken(token: InsertToken): Promise<Token>;
  
  // Transaction methods
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByAccount(accountId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction>;
  
  // Swap route methods
  getSwapRoute(id: string): Promise<SwapRoute | undefined>;
  createSwapRoute(route: InsertSwapRoute): Promise<SwapRoute>;
  getSwapRoutes(tokenIn: string, tokenOut: string): Promise<SwapRoute[]>;
}

export class MemStorage implements IStorage {
  private tokens: Map<string, Token>;
  private transactions: Map<string, Transaction>;
  private swapRoutes: Map<string, SwapRoute>;

  constructor() {
    this.tokens = new Map();
    this.transactions = new Map();
    this.swapRoutes = new Map();
    
    // Initialize with default tokens
    this.initializeDefaultTokens();
  }

  private initializeDefaultTokens() {
    const defaultTokens: Token[] = [
      {
        id: "near",
        symbol: "NEAR",
        name: "NEAR Protocol",
        decimals: "24",
        contractId: null,
        isNative: true,
        iconUrl: null,
      },
      {
        id: "usdt.tether-token.near",
        symbol: "USDT",
        name: "Tether USD",
        decimals: "6",
        contractId: "usdt.tether-token.near",
        isNative: false,
        iconUrl: null,
      },
      {
        id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
        symbol: "USDC",
        name: "USD Coin",
        decimals: "6",
        contractId: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
        isNative: false,
        iconUrl: null,
      },
    ];

    defaultTokens.forEach(token => {
      this.tokens.set(token.id, token);
    });
  }

  // Token methods
  async getToken(id: string): Promise<Token | undefined> {
    return this.tokens.get(id);
  }

  async getTokens(): Promise<Token[]> {
    return Array.from(this.tokens.values());
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    const token: Token = {
      id: randomUUID(),
      ...insertToken,
      decimals: insertToken.decimals || "24",
      contractId: insertToken.contractId || null,
      isNative: insertToken.isNative || false,
      iconUrl: insertToken.iconUrl || null,
    };
    this.tokens.set(token.id, token);
    return token;
  }

  // Transaction methods
  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.accountId === accountId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      id: randomUUID(),
      ...insertTransaction,
      status: insertTransaction.status || "pending",
      createdAt: new Date(),
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const existing = this.transactions.get(id);
    if (!existing) {
      throw new Error(`Transaction with id ${id} not found`);
    }
    
    const updated = { ...existing, ...updates };
    this.transactions.set(id, updated);
    return updated;
  }

  // Swap route methods
  async getSwapRoute(id: string): Promise<SwapRoute | undefined> {
    return this.swapRoutes.get(id);
  }

  async createSwapRoute(insertRoute: InsertSwapRoute): Promise<SwapRoute> {
    const route: SwapRoute = {
      id: randomUUID(),
      ...insertRoute,
      amountIn: insertRoute.amountIn || null,
      amountOut: insertRoute.amountOut || null,
      createdAt: new Date(),
    };
    this.swapRoutes.set(route.id, route);
    return route;
  }

  async getSwapRoutes(tokenIn: string, tokenOut: string): Promise<SwapRoute[]> {
    return Array.from(this.swapRoutes.values())
      .filter(route => route.tokenIn === tokenIn && route.tokenOut === tokenOut)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 10); // Return only recent routes
  }
}

export const storage = new MemStorage();
