// lib/nfc/security-manager.ts
import { NFCTagData, ThreatReport } from './types';

export class SecurityManager {
  private threatDetectionEnabled = true;
  private readAttempts: Map<string, number> = new Map();

  enableThreatDetection(enabled: boolean): void {
    this.threatDetectionEnabled = enabled;
  }

  async performThreatDetection(tagData: NFCTagData): Promise<ThreatReport | null> {
    if (!this.threatDetectionEnabled) {
      return null;
    }

    const currentAttempts = this.readAttempts.get(tagData.id) || 0;
    this.readAttempts.set(tagData.id, currentAttempts + 1);

    if (currentAttempts > 5) {
      return {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        threatType: 'CLONING_ATTEMPT',
        severity: 'HIGH',
        description: `multiple rapid read attempts detected ${tagData.id.substring(0, 8)}...`,
        tagId: tagData.id,
        blocked: true
      };
    }

    const hasErrorRecords = tagData.ndefRecords.some(record => 
      !record.payload || record.payload.includes('error') || record.payload.includes('error')
    );

    return null;
  }

  getReadAttempts(tagId: string): number {
    return this.readAttempts.get(tagId) || 0;
  }

  resetReadAttempts(): void {
    this.readAttempts.clear();
  }
}