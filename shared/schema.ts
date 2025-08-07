import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tokens = pgTable("tokens", {
  id: varchar("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  decimals: text("decimals").notNull().default("24"),
  contractId: text("contract_id"),
  isNative: boolean("is_native").default(false),
  iconUrl: text("icon_url"),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: text("account_id").notNull(),
  hash: text("hash").notNull(),
  fromToken: text("from_token").notNull(),
  toToken: text("to_token").notNull(),
  fromAmount: text("from_amount").notNull(),
  toAmount: text("to_amount").notNull(),
  dexId: text("dex_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const swapRoutes = pgTable("swap_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenIn: text("token_in").notNull(),
  tokenOut: text("token_out").notNull(),
  amountIn: text("amount_in"),
  amountOut: text("amount_out"),
  route: jsonb("route").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertSwapRouteSchema = createInsertSchema(swapRoutes).omit({
  id: true,
  createdAt: true,
});

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokens.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertSwapRoute = z.infer<typeof insertSwapRouteSchema>;
export type SwapRoute = typeof swapRoutes.$inferSelect;

// API Types
export const slippageConfigSchema = z.object({
  type: z.enum(["Auto", "Fixed"]),
  slippage: z.number().optional(),
  maxSlippage: z.number().optional(),
  minSlippage: z.number().optional(),
});

export const routeRequestSchema = z.object({
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.string().optional(),
  amountOut: z.string().optional(),
  maxWaitMs: z.number().default(5000),
  slippageConfig: slippageConfigSchema,
  dexes: z.array(z.string()).optional(),
  traderAccountId: z.string().optional(),
  signingPublicKey: z.string().optional(),
});

export type SlippageConfig = z.infer<typeof slippageConfigSchema>;
export type RouteRequest = z.infer<typeof routeRequestSchema>;

// Route instruction types for Intear API
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
