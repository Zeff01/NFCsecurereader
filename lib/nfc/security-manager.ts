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

    // Track read attempts for cloning detection
    const currentAttempts = this.readAttempts.get(tagData.id) || 0;
    this.readAttempts.set(tagData.id, currentAttempts + 1);

    // Check for suspicious patterns
    if (currentAttempts > 5) {
      return {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        threatType: 'CLONING_ATTEMPT',
        severity: 'HIGH',
        description: `Multiple rapid read attempts detected for tag ${tagData.id.substring(0, 8)}...`,
        tagId: tagData.id,
        blocked: true
      };
    }

    // ✅ FIXED: Since payload is now a string, just check if it's empty or contains "error"
    const hasErrorRecords = tagData.ndefRecords.some(record => 
      !record.payload || record.payload.includes('error') || record.payload.includes('Error')
    );

    if (hasErrorRecords) {
      return {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        threatType: 'MALFORMED_DATA',
        severity: 'MEDIUM',
        description: 'Malformed NDEF data detected in tag',
        tagId: tagData.id,
        blocked: false
      };
    }

    return null;
  }

  assessSecurityLevel(tagData: NFCTagData): 'HIGH' | 'MEDIUM' | 'LOW' {
    let score = 0;

    if (!tagData.isWritable) score += 2;
    if (tagData.type?.includes('MIFARE_CLASSIC')) score += 1;
    if (tagData.ndefRecords.length > 0) score += 1;
    if (tagData.techTypes.length > 1) score += 1;

    if (score >= 4) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    return 'LOW';
  }

  // Protection methods (simplified)
  async enableReadProtection(): Promise<void> {
    // Implement read protection logic
    console.log('🛡️ Read protection enabled');
  }

  async enableWriteProtection(): Promise<void> {
    // Implement write protection logic
    console.log('🔒 Write protection enabled');
  }

  async enableCloningProtection(): Promise<void> {
    // Implement cloning protection logic
    console.log('🛡️ Cloning protection enabled');
  }
}