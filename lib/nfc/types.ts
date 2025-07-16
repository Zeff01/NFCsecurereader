// lib/nfc/types.ts - Proper TypeScript interfaces

export type ParsedPayload = string;

export interface NDEFRecord {
  id: string | null;
  type: string | null;
  payload: ParsedPayload | null;
  tnf: number;
}

export interface NFCTagData {
  id: string;
  techTypes: string[];
  type?: string;
  maxSize?: number;
  isWritable?: boolean;
  canMakeReadOnly?: boolean;
  ndefRecords: NDEFRecord[];  // ✅ Properly typed now!
  rawData: any; // Keep this as any since it's platform-specific
  timestamp: string;
}

export interface NFCAccessLog {
  tagId: string;
  timestamp: string;
  techTypes: string[];
  hasNdefData: boolean;
  readDuration: number;
  securityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  threatDetected: boolean;
}

export interface ThreatReport {
  id: string;
  timestamp: string;
  threatType: 'CLONING_ATTEMPT' | 'UNAUTHORIZED_READ' | 'SUSPICIOUS_PATTERN' | 'MALFORMED_DATA';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  tagId?: string;
  blocked: boolean;
}

// Updated interface - removed simulated fields
export interface ClonedCardData {
  originalUID: string;
  extractedData: {
    uid: string;
    type?: string;
    techTypes: string[];
    records: NDEFRecord[];
    timestamp: string;
    realContent: string;
    maxSize?: number;
    isWritable?: boolean;
  };
  clonedAt: string;
  // Removed accessLevel and userInfo - they were simulated
}

export interface CloneResult {
  success: boolean;
  message: string;
  clonedData?: ClonedCardData;
  error?: string;
}