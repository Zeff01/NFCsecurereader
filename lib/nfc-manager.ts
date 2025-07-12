// iOS-Compatible NFC Manager Implementation
// This works with both iOS and Android, with iOS-specific handling

import NfcManager, { 
  NfcTech, 
  Ndef, 
  NfcEvents,
  TagEvent,
  NdefRecord
} from 'react-native-nfc-manager';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { Platform, Alert } from 'react-native';

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

class iOSNFCManager {
  private isInitialized = false;
  private isReading = false;
  private threatDetectionEnabled = true;
  private readAttempts: Map<string, number> = new Map();

  constructor() {
    this.initializeNFC();
  }

  private async initializeNFC(): Promise<void> {
    try {
      // Check if NFC is supported
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        throw new Error('NFC is not supported on this device');
      }

      // Start NFC Manager
      await NfcManager.start();
      this.isInitialized = true;
      
      console.log(`NFC Manager initialized for ${Platform.OS}`);
    } catch (error) {
      console.error('NFC initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async isNFCAvailable(): Promise<boolean> {
    try {
      const isSupported = await NfcManager.isSupported();
      
      if (Platform.OS === 'ios') {
        // On iOS, if supported, it's usually available
        return isSupported;
      } else {
        // On Android, check if it's enabled too
        const isEnabled = await NfcManager.isEnabled();
        return isSupported && isEnabled;
      }
    } catch (error) {
      console.warn('Error checking NFC availability:', error);
      return false;
    }
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
      // iOS-specific NFC reading
      if (Platform.OS === 'ios') {
        return await this.readNFCTagiOS(startTime);
      } else {
        return await this.readNFCTagAndroid(startTime);
      }
    } finally {
      this.isReading = false;
    }
  }

  private async readNFCTagiOS(startTime: number): Promise<NFCTagData> {
    try {
      // Request NDEF technology for iOS
      await NfcManager.requestTechnology([NfcTech.Ndef], {
        alertMessage: 'Hold your iPhone near the NFC tag',
        invalidateAfterFirstRead: true,
      });

      // Get the tag
      const tag = await NfcManager.getTag();
      
      if (!tag) {
        throw new Error('No NFC tag detected');
      }

      // Provide haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Parse tag data
      const tagData = await this.parseTagDataiOS(tag);

      // Perform threat detection
      const threatReport = await this.performThreatDetection(tagData);
      
      if (threatReport && threatReport.blocked) {
        throw new Error(`Security threat detected: ${threatReport.description}`);
      }

      // Log the access
      const readDuration = Date.now() - startTime;
      await this.logNFCAccess({
        tagId: tagData.id,
        timestamp: tagData.timestamp,
        techTypes: tagData.techTypes,
        hasNdefData: tagData.ndefRecords.length > 0,
        readDuration,
        securityLevel: this.assessSecurityLevel(tagData),
        threatDetected: !!threatReport,
      });

      return tagData;
    } finally {
      // Cancel the technology request
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('Error canceling NFC request:', error);
      }
    }
  }

  private async readNFCTagAndroid(startTime: number): Promise<NFCTagData> {
    try {
      // Request multiple technologies for Android
      await NfcManager.requestTechnology([
        NfcTech.Ndef, 
        NfcTech.NfcA, 
        NfcTech.NfcB, 
        NfcTech.NfcF, 
        NfcTech.NfcV
      ]);
      
      const tag = await NfcManager.getTag();
      
      if (!tag) {
        throw new Error('No NFC tag detected');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const tagData = await this.parseTagDataAndroid(tag);

      const threatReport = await this.performThreatDetection(tagData);
      
      if (threatReport && threatReport.blocked) {
        throw new Error(`Security threat detected: ${threatReport.description}`);
      }

      const readDuration = Date.now() - startTime;
      await this.logNFCAccess({
        tagId: tagData.id,
        timestamp: tagData.timestamp,
        techTypes: tagData.techTypes,
        hasNdefData: tagData.ndefRecords.length > 0,
        readDuration,
        securityLevel: this.assessSecurityLevel(tagData),
        threatDetected: !!threatReport,
      });

      return tagData;
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('Error canceling NFC request:', error);
      }
    }
  }

  private async parseTagDataiOS(tag: TagEvent): Promise<NFCTagData> {
    // iOS primarily supports NDEF
    const tagId = this.bytesToHex(tag.id || []);
    const techTypes = ['NDEF']; // iOS mainly exposes NDEF
    
    let ndefRecords: NDEFRecord[] = [];
    let type = 'NDEF';
    let maxSize = 0;
    let isWritable = false;
    let canMakeReadOnly = false;

    try {
      // Read NDEF message
      const ndefData = await NfcManager.getNdefMessage();
      if (ndefData && ndefData.length > 0) {
        ndefRecords = ndefData.map((record, index) => this.parseNdefRecord(record, index));
      }

      // Get NDEF status (if available)
      try {
        const ndefStatus = await NfcManager.getNdefStatus();
        maxSize = ndefStatus.maxSize || 0;
        isWritable = ndefStatus.isWritable || false;
        canMakeReadOnly = ndefStatus.canMakeReadOnly || false;
      } catch (error) {
        // NDEF status might not be available on iOS
        console.warn('Could not get NDEF status:', error);
      }
    } catch (error) {
      console.warn('Error reading NDEF data on iOS:', error);
    }

    return {
      id: tagId,
      techTypes,
      type,
      maxSize,
      isWritable,
      canMakeReadOnly,
      ndefRecords,
      rawData: tag,
      timestamp: new Date().toISOString(),
    };
  }

  private async parseTagDataAndroid(tag: TagEvent): Promise<NFCTagData> {
    // Android supports more detailed tag information
    const tagId = this.bytesToHex(tag.id || []);
    const techTypes = tag.techTypes || [];
    
    let ndefRecords: NDEFRecord[] = [];
    let type = 'Unknown';
    let maxSize = 0;
    let isWritable = false;
    let canMakeReadOnly = false;

    try {
      const ndefData = await NfcManager.getNdefMessage();
      if (ndefData && ndefData.length > 0) {
        ndefRecords = ndefData.map((record, index) => this.parseNdefRecord(record, index));
      }

      const ndefStatus = await NfcManager.getNdefStatus();
      maxSize = ndefStatus.maxSize || 0;
      isWritable = ndefStatus.isWritable || false;
      canMakeReadOnly = ndefStatus.canMakeReadOnly || false;

      type = this.determineTagType(techTypes, maxSize);
    } catch (error) {
      console.warn('Error reading NDEF data on Android:', error);
    }

    return {
      id: tagId,
      techTypes,
      type,
      maxSize,
      isWritable,
      canMakeReadOnly,
      ndefRecords,
      rawData: tag,
      timestamp: new Date().toISOString(),
    };
  }

  private parseNdefRecord(record: NdefRecord, index: number): NDEFRecord {
    try {
      const payload = this.parseNdefPayload(record);
      
      return {
        id: record.id ? this.bytesToHex(record.id) : `record_${index}`,
        type: record.type ? this.bytesToString(record.type) : null,
        payload,
        tnf: record.tnf || 0,
      };
    } catch (error) {
      return {
        id: `record_${index}`,
        type: null,
        payload: {
          type: 'error',
          error: `Failed to parse record: ${error.message}`
        },
        tnf: 0,
      };
    }
  }

  private parseNdefPayload(record: NdefRecord): ParsedPayload {
    try {
      const payload = record.payload;
      if (!payload || payload.length === 0) {
        return { type: 'raw', data: '' };
      }

      // Text Record (TNF = 1, Type = 'T')
      if (record.tnf === 1 && record.type && this.bytesToString(record.type) === 'T') {
        return this.parseTextRecord(payload);
      }

      // URI Record (TNF = 1, Type = 'U')
      if (record.tnf === 1 && record.type && this.bytesToString(record.type) === 'U') {
        return this.parseUriRecord(payload);
      }

      // Default to raw data
      return {
        type: 'raw',
        data: this.bytesToHex(payload)
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to parse payload: ${error.message}`
      };
    }
  }

  private parseTextRecord(payload: number[]): ParsedPayload {
    if (payload.length < 3) {
      throw new Error('Invalid text record payload');
    }

    const statusByte = payload[0];
    const languageLength = statusByte & 0x3f;
    
    if (payload.length < 1 + languageLength) {
      throw new Error('Invalid text record format');
    }

    const language = this.bytesToString(payload.slice(1, 1 + languageLength));
    const text = this.bytesToString(payload.slice(1 + languageLength));

    return {
      type: 'text',
      text,
      language
    };
  }

  private parseUriRecord(payload: number[]): ParsedPayload {
    if (payload.length === 0) {
      throw new Error('Empty URI record');
    }

    const prefixByte = payload[0];
    const uriData = payload.slice(1);
    
    // URI prefix mappings
    const prefixes = [
      '', 'http://www.', 'https://www.', 'http://', 'https://',
      'tel:', 'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.',
      'ftps://', 'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
      'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:',
      'sip:', 'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://',
      'tcpobex://', 'irdaobex://', 'file://', 'urn:epc:id:', 'urn:epc:tag:',
      'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:', 'urn:nfc:'
    ];

    const prefix = prefixes[prefixByte] || '';
    const uriSuffix = this.bytesToString(uriData);

    return {
      type: 'uri',
      uri: prefix + uriSuffix
    };
  }

  private determineTagType(techTypes: string[], maxSize: number): string {
    if (Platform.OS === 'ios') {
      // iOS mainly exposes NDEF
      return 'NDEF_TAG';
    }

    // Android tag type detection
    if (techTypes.includes('android.nfc.tech.MifareClassic')) {
      return 'MIFARE_CLASSIC';
    }
    if (techTypes.includes('android.nfc.tech.MifareUltralight')) {
      if (maxSize >= 924) return 'NTAG216';
      if (maxSize >= 564) return 'NTAG215';
      if (maxSize >= 180) return 'NTAG213';
      return 'MIFARE_ULTRALIGHT';
    }
    if (techTypes.includes('android.nfc.tech.NfcA')) {
      return 'ISO14443_TYPE_A';
    }
    if (techTypes.includes('android.nfc.tech.NfcB')) {
      return 'ISO14443_TYPE_B';
    }
    if (techTypes.includes('android.nfc.tech.NfcF')) {
      return 'FELICA';
    }
    if (techTypes.includes('android.nfc.tech.NfcV')) {
      return 'ISO15693';
    }
    return 'UNKNOWN';
  }

  private assessSecurityLevel(tagData: NFCTagData): 'HIGH' | 'MEDIUM' | 'LOW' {
    let score = 0;

    if (!tagData.isWritable) score += 2;
    if (tagData.type?.includes('MIFARE_CLASSIC')) score += 1;
    if (tagData.ndefRecords.length > 0) score += 1;
    if (tagData.techTypes.length > 1) score += 1;

    if (score >= 4) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private async performThreatDetection(tagData: NFCTagData): Promise<ThreatReport | null> {
    if (!this.threatDetectionEnabled) {
      return null;
    }

    // Track read attempts
    const currentAttempts = this.readAttempts.get(tagData.id) || 0;
    this.readAttempts.set(tagData.id, currentAttempts + 1);

    // Check for suspicious patterns
    if (currentAttempts > 5) {
      const report: ThreatReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        threatType: 'CLONING_ATTEMPT',
        severity: 'HIGH',
        description: `Multiple rapid read attempts detected for tag ${tagData.id.substring(0, 8)}...`,
        tagId: tagData.id,
        blocked: true
      };

      await this.logThreatReport(report);
      return report;
    }

    // Check for malformed NDEF data
    const hasErrorRecords = tagData.ndefRecords.some(record => 
      record.payload?.type === 'error'
    );

    if (hasErrorRecords) {
      const report: ThreatReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        threatType: 'MALFORMED_DATA',
        severity: 'MEDIUM',
        description: 'Malformed NDEF data detected in tag',
        tagId: tagData.id,
        blocked: false
      };

      await this.logThreatReport(report);
      return report;
    }

    return null;
  }

  // Utility methods
  private bytesToHex(bytes: number[]): string {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  private bytesToString(bytes: number[]): string {
    return String.fromCharCode(...bytes);
  }

  // Logging methods (same as before)
  private async logNFCAccess(log: NFCAccessLog): Promise<void> {
    try {
      const existingLogsJson = await SecureStore.getItemAsync('nfc_access_logs');
      const existingLogs: NFCAccessLog[] = existingLogsJson 
        ? JSON.parse(existingLogsJson) 
        : [];
      
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

  async generateSecureBackup(tagData: NFCTagData): Promise<string> {
    const backup = {
      tagData,
      timestamp: new Date().toISOString(),
      signature: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(tagData) + Date.now()
      )
    };
    
    return JSON.stringify(backup);
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isReading) {
        await NfcManager.cancelTechnologyRequest();
      }
      await NfcManager.stop();
      this.isInitialized = false;
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const nfcManager = new iOSNFCManager();