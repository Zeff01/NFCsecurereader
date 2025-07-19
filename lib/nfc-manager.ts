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
import { NFCTagData, NDEFRecord, ParsedPayload, NFCAccessLog, ThreatReport } from './nfc/types.js';


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

    try {
      // Use the correct method from ndefHandler
      const ndefMessage = await NfcManager.ndefHandler.getNdefMessage();
      if (ndefMessage && ndefMessage.ndefMessage && Array.isArray(ndefMessage.ndefMessage)) {
        ndefRecords = ndefMessage.ndefMessage.map((record, index) => this.parseNdefRecord(record, index));
      }

      // Get NDEF status (if available)
      try {
        const ndefStatus = await NfcManager.ndefHandler.getNdefStatus();
        maxSize = ndefStatus.capacity || 0;
      } catch (error: any) {
        // NDEF status might not be available on iOS
        console.warn('Could not get NDEF status:', error);
      }
    } catch (error: any) {
      console.warn('Error reading NDEF data on iOS:', error);
    }

    return {
      id: tagId,
      techTypes,
      type,
      maxSize,
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

    try {
      const ndefMessage = await NfcManager.ndefHandler.getNdefMessage();
      if (ndefMessage && ndefMessage.ndefMessage && Array.isArray(ndefMessage.ndefMessage)) {
        ndefRecords = ndefMessage.ndefMessage.map((record, index) => this.parseNdefRecord(record, index));
      }

      const ndefStatus = await NfcManager.ndefHandler.getNdefStatus();
      maxSize = ndefStatus.capacity || 0;

      type = this.determineTagType(techTypes, maxSize);
    } catch (error: any) {
      console.warn('Error reading NDEF data on Android:', error);
    }

    return {
      id: tagId,
      techTypes,
      type,
      maxSize,
      ndefRecords,
      rawData: tag,
      timestamp: new Date().toISOString(),
    };
  }

  private parseNdefRecord(record: any, index: number): NDEFRecord {
    try {
      return {
        id: record.id ? this.bytesToHex(record.id) : `record_${index}`,
        type: record.type ? this.bytesToString(record.type) : null,
        payload: this.simpleParsePayload(record.payload),
        tnf: record.tnf || 0,
      };
    } catch (error: any) {
      return {
        id: `record_${index}`,
        type: null,
        payload: `Failed to parse record: ${error.message}`,
        tnf: 0,
      };
    }
  }

  private simpleParsePayload(payload: any): string {
    if (!payload) return '';
    
    try {
      // Just try to convert to string in the simplest way
      if (typeof payload === 'string') {
        return payload;
      }
      
      if (Array.isArray(payload)) {
        // Skip first few bytes and convert rest to string
        const textBytes = payload.slice(3); // Skip language info
        return String.fromCharCode(...textBytes);
      }
      
      return String(payload);
    } catch (error: any) {
      return 'Demo payload data';
    }
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

    if (tagData.type?.includes('MIFARE_CLASSIC')) score += 1;
    if (tagData.ndefRecords.length > 0) score += 1;
    if (tagData.techTypes.length > 1) score += 1;

    if (score >= 3) return 'HIGH';
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

    return null;
  }

  private bytesToHex(bytes: number[] | string): string {
    if (typeof bytes === 'string') {
      return bytes.toUpperCase();
    }
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  private bytesToString(bytes: number[] | string): string {
    if (typeof bytes === 'string') {
      return bytes;
    }
    return String.fromCharCode(...bytes);
  }

  // Logging methods
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.warn('Failed to log threat report:', error);
    }
  }

  async getAccessLogs(): Promise<NFCAccessLog[]> {
    try {
      const logsJson = await SecureStore.getItemAsync('nfc_access_logs');
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error: any) {
      console.warn('Failed to get access logs:', error);
      return [];
    }
  }

  async getThreatReports(): Promise<ThreatReport[]> {
    try {
      const reportsJson = await SecureStore.getItemAsync('threat_reports');
      return reportsJson ? JSON.parse(reportsJson) : [];
    } catch (error: any) {
      console.warn('Failed to get threat reports:', error);
      return [];
    }
  }

  async clearAccessLogs(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('nfc_access_logs');
    } catch (error: any) {
      console.warn('Failed to clear access logs:', error);
    }
  }

  async clearThreatReports(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('threat_reports');
    } catch (error: any) {
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
      // Removed NfcManager.stop() - doesn't exist in library
      this.isInitialized = false;
    } catch (error: any) {
      console.warn('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const nfcManager = new iOSNFCManager();