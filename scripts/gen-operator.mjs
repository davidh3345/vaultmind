// Generate a throwaway TESTNET operator wallet and write it to .env.local.
// Usage: npm run gen-operator
import { Wallet } from "ethers";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const w = Wallet.createRandom();
const envPath = ".env.local";
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

if (/^OPERATOR_PRIVATE_KEY=.+/m.test(env)) {
  console.log("OPERATOR_PRIVATE_KEY already set in .env.local — not overwriting.");
} else {
  if (!env.includes("OPERATOR_PRIVATE_KEY=")) env += `\nOPERATOR_PRIVATE_KEY=${w.privateKey}\n`;
  else env = env.replace(/^OPERATOR_PRIVATE_KEY=.*$/m, `OPERATOR_PRIVATE_KEY=${w.privateKey}`);
  writeFileSync(envPath, env);
  console.log("Wrote OPERATOR_PRIVATE_KEY to .env.local (gitignored).");
}

console.log("\n  Operator address:  " + w.address);
console.log("\n  → Fund it on the Galileo testnet faucet: https://faucet.0g.ai");
console.log("    (0.1 0G/day — pull a couple of times; storage writes need a little gas.)\n");
