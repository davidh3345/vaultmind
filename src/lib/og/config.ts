/** Server-side env detection. The client learns this via /api/status. */
export const OG = {
  network: process.env.NEXT_PUBLIC_OG_NETWORK || "galileo-testnet",
  storageRpc: process.env.OG_STORAGE_RPC || "https://evmrpc-testnet.0g.ai",
  storageIndexer: process.env.OG_STORAGE_INDEXER || "https://indexer-storage-testnet-turbo.0g.ai",
  operatorKey: process.env.OPERATOR_PRIVATE_KEY || "",
  routerKey: process.env.ZG_ROUTER_API_KEY || "",
  routerBase: process.env.ZG_ROUTER_BASE_URL || "https://router-api-testnet.integratenetwork.work/v1",
  routerModel: process.env.ZG_ROUTER_MODEL || "zai-org/GLM-5-FP8",
};

export const isStorageReal = () => Boolean(OG.operatorKey);
export const isRouterReal = () => Boolean(OG.routerKey);
