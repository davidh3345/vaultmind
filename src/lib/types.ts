export interface DocMeta {
  id: string;
  filename: string;
  mime: string;
  pages?: number;
}

export interface ManifestEntry {
  chunkId: string;
  docId: string;
  ref: string; // 0G Storage root hash (or local-dev ref) of the encrypted chunk
  nonce: string; // reserved (our blob carries its own nonce); kept for forward-compat
  terms: string[]; // lexical index tokens — encrypted at rest inside the manifest
  page?: number;
}

export interface DecryptedManifest {
  v: 1;
  magic: "VAULTMIND";
  entries: ManifestEntry[];
}

export type KeyScheme = "client-local-v1" | "wallet-sig-v1";

export interface KeyEnvelope {
  scheme: KeyScheme;
  keyCheck: string; // AES-GCM(K) of a fixed sentinel
  // wallet-sig-v1 only:
  salt?: string;
  wrapped?: string;
  canonicalMsg?: string;
}

export interface Vault {
  id: string;
  name: string;
  createdAt: number;
  ownerAddress?: string;
  keyEnvelope: KeyEnvelope;
  manifestRef?: string; // 0G Storage ref of the encrypted manifest blob
  docs: DocMeta[];
}

export interface Citation {
  docId: string;
  chunkId: string;
  filename: string;
  snippet: string;
  page?: number;
}

export type AttestationLevel = "infra" | "per-response";
export interface Attestation {
  mode: "router" | "TeeML" | "TeeTLS" | "local-dev";
  level: AttestationLevel;
  verified: boolean;
  model?: string;
  providerAddress?: string;
  signer?: string;
  chatId?: string;
  links?: { signer?: string; providerAttestation?: string };
  receiptHash: string;
}

export interface Answer {
  id: string;
  question: string;
  text: string;
  citations: Citation[];
  attestation: Attestation;
  at: number;
}
