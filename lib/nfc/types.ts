// lib/nfc/types.ts - Proper TypeScript interfaces
export interface ParsedPayload {
  type: 'text' | 'uri' | 'raw' | 'error';
  text?: string;
  language?: string;
  uri?: string;
  data?: string;
  error?: string;
}

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