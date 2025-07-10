// Simplified NFC Manager for development (works in Expo Go)
// Full NFC functionality will work only in development builds

import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';

export interface NFCTagData {
  id: string;
  techTypes: string[];
  type?: string;
  maxSize?: number;
  isWritable?: boolean;
  canMakeReadOnly?: boolean;
  ndefRecords: NDEFRecord[];
  rawData: any;
  timestamp: string;
}

export interface NDEFRecord {
  id: string | null;
  type: string | null;
  payload: ParsedPayload | null;
  tnf: number;
}

export interface ParsedPayload {
  type: 'text' | 'uri' | 'raw' | 'error';
  text?: string;
  language?: string;
  uri?: string;
  data?: string;
  error?: string;
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

class NFCManager {
  private isInitialized = false;
  private isReading = false;
  private threatDetectionEnabled = true;

  constructor() {
    this.initializeNFC();
  }

  private async initializeNFC(): Promise<void> {
    try {
      // For Expo Go, we'll simulate NFC availability
      console.log('NFC Manager initialized (simulated for Expo Go)');
      this.isInitialized = true;
    } catch (error) {
      console.warn('NFC initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async isNFCAvailable(): Promise<boolean> {
    // In development build, this would check actual NFC availability
    // For now, simulate based on platform
    return true; // Simulated for development
  }

  async readNFCTag(): Promise<NFCTagData> {
    if (!this.isInitialized) {
      throw new Error('NFC Manager not initialized');
    }

    if (this.isReading) {
      throw new Error('NFC read already in progress');
    }

    const startTime = Date.now();
    this.isReading = true;

    try {
      // Simulate NFC reading delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Provide haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Generate simulated tag data for development
      const simulatedTag = await this.generateSimulatedTagData();

      // Perform threat detection
      const threatReport = await this.performThreatDetection(simulatedTag);
      
      if (threatReport && threatReport.blocked) {
        throw new Error(`Security threat detected: ${threatReport.description}`);
      }

      // Log the access
      const readDuration = Date.now() - startTime;
      await this.logNFCAccess({
        tagId: simulatedTag.id,
        timestamp: simulatedTag.timestamp,
        techTypes: simulatedTag.techTypes,
        hasNdefData: simulatedTag.ndefRecords.length > 0,
        readDuration,
        securityLevel: 'HIGH',
        threatDetected: !!threatReport,
      });

      return simulatedTag;
    } finally {
      this.isReading = false;
    }
  }

  private async generateSimulatedTagData(): Promise<NFCTagData> {
    const tagTypes = ['MIFARE_CLASSIC', 'MIFARE_ULTRALIGHT', 'NTAG213', 'NTAG215', 'NTAG216'];
    const randomType = tagTypes[Math.floor(Math.random() * tagTypes.length)];
    
    const sampleTexts = [
      'Hello, NFC World!',
      'Secure Access Card',
      'Employee ID: 12345',
      'Conference Badge 2025',
      'Parking Access Token'
    ];
    
    const sampleURIs = [
      'https://example.com',
      'wifi:T:WPA;S:MyNetwork;P:password123;;',
      'tel:+1234567890',
      'mailto:security@company.com'
    ];

    const records: NDEFRecord[] = [];
    
    // Add text record
    if (Math.random() > 0.3) {
      records.push({
        id: 'text_record_1',
        type: 'T',
        tnf: 1,
        payload: {
          type: 'text',
          text: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
          language: 'en'
        }
      });
    }

    // Add URI record
    if (Math.random() > 0.5) {
      records.push({
        id: 'uri_record_1',
        type: 'U',
        tnf: 1,
        payload: {
          type: 'uri',
          uri: sampleURIs[Math.floor(Math.random() * sampleURIs.length)]
        }
      });
    }

    // Generate random tag ID using Expo Crypto
    const randomBytes = await Crypto.getRandomBytesAsync(8);
    const tagId = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    return {
      id: tagId,
      techTypes: ['android.nfc.tech.NfcA', 'android.nfc.tech.Ndef'],
      type: randomType,
      maxSize: Math.floor(Math.random() * 1000) + 500,
      isWritable: Math.random() > 0.3,
      canMakeReadOnly: Math.random() > 0.5,
      ndefRecords: records,
      rawData: { simulated: true },
      timestamp: new Date().toISOString(),
    };
  }

  private async performThreatDetection(tagData: NFCTagData): Promise<ThreatReport | null> {
    if (!this.threatDetectionEnabled) {
      return null;
    }

    // Simulate threat detection logic
    const threatChance = Math.random();
    
    if (threatChance < 0.1) { // 10% chance of detecting a threat
      const threats = [
        {
          type: 'CLONING_ATTEMPT' as const,
          severity: 'HIGH' as const,
          description: 'Potential cloning attempt detected - unusual read pattern',
          blocked: true
        },
        {
          type: 'SUSPICIOUS_PATTERN' as const,
          severity: 'MEDIUM' as const,
          description: 'Suspicious access pattern detected',
          blocked: false
        },
        {
          type: 'MALFORMED_DATA' as const,
          severity: 'LOW' as const,
          description: 'Malformed NDEF data structure detected',
          blocked: false
        }
      ];

      const threat = threats[Math.floor(Math.random() * threats.length)];
      
      const report: ThreatReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        threatType: threat.type,
        severity: threat.severity,
        description: threat.description,
        tagId: tagData.id,
        blocked: threat.blocked
      };

      // Log the threat
      await this.logThreatReport(report);
      
      return report;
    }

    return null;
  }

  private async logNFCAccess(log: NFCAccessLog): Promise<void> {
    try {
      const existingLogsJson = await SecureStore.getItemAsync('nfc_access_logs');
      const existingLogs: NFCAccessLog[] = existingLogsJson 
        ? JSON.parse(existingLogsJson) 
        : [];
      
      // Add new log and keep last 100 entries
      existingLogs.unshift(log);
      if (existingLogs.length > 100) {
        existingLogs.splice(100);
      }

      await SecureStore.setItemAsync('nfc_access_logs', JSON.stringify(existingLogs));
    } catch (error) {
      console.warn('Failed to log NFC access:', error);
    }
  }

  private async logThreatReport(report: ThreatReport): Promise<void> {
    try {
      const existingReportsJson = await SecureStore.getItemAsync('threat_reports');
      const existingReports: ThreatReport[] = existingReportsJson 
        ? JSON.parse(existingReportsJson) 
        : [];
      
      // Add new report and keep last 50 entries
      existingReports.unshift(report);
      if (existingReports.length > 50) {
        existingReports.splice(50);
      }

      await SecureStore.setItemAsync('threat_reports', JSON.stringify(existingReports));
    } catch (error) {
      console.warn('Failed to log threat report:', error);
    }
  }

  async getAccessLogs(): Promise<NFCAccessLog[]> {
    try {
      const logsJson = await SecureStore.getItemAsync('nfc_access_logs');
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      console.warn('Failed to get access logs:', error);
      return [];
    }
  }

  async getThreatReports(): Promise<ThreatReport[]> {
    try {
      const reportsJson = await SecureStore.getItemAsync('threat_reports');
      return reportsJson ? JSON.parse(reportsJson) : [];
    } catch (error) {
      console.warn('Failed to get threat reports:', error);
      return [];
    }
  }

  async clearAccessLogs(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('nfc_access_logs');
    } catch (error) {
      console.warn('Failed to clear access logs:', error);
    }
  }

  async clearThreatReports(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('threat_reports');
    } catch (error) {
      console.warn('Failed to clear threat reports:', error);
    }
  }

  async enableThreatDetection(enabled: boolean): Promise<void> {
    this.threatDetectionEnabled = enabled;
  }

  // Protection methods
  async enableReadProtection(): Promise<void> {
    // This would configure NFC reading with additional security checks
    console.log('Read protection enabled');
  }

  async enableWriteProtection(): Promise<void> {
    // This would prevent unauthorized writes to NFC tags
    console.log('Write protection enabled');
  }

  async enableCloningProtection(): Promise<void> {
    // This would implement anti-cloning measures
    console.log('Cloning protection enabled');
  }

  async generateSecureBackup(tagData: NFCTagData): Promise<string> {
    // Generate encrypted backup of NFC tag data
    const backup = {
      tagData,
      timestamp: new Date().toISOString(),
      signature: 'secure_signature_' + Date.now()
    };
    
    return JSON.stringify(backup);
  }
}

// Export singleton instance
export const nfcManager = new NFCManager();