/* eslint-disable */
/**
 * Generated API bindings.
 * Run `npx convex dev` to regenerate.
 */
import type { FunctionReference } from "convex/server";

export const api = {
  runs: {
    startRun: "runs:startRun" as FunctionReference<"mutation">,
    sendCommand: "runs:sendCommand" as FunctionReference<"mutation">,
    getRun: "runs:getRun" as FunctionReference<"query">,
    getLeaderboard: "runs:getLeaderboard" as FunctionReference<"query">,
  },
} as const;

export type Api = typeof api;
