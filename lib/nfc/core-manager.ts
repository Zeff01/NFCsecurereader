// lib/nfc/core-manager.ts
import NfcManager, { NfcTech, TagEvent } from 'react-native-nfc-manager';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NFCTagData, NDEFRecord, ParsedPayload } from './types';

export { NFCTagData, NDEFRecord, ParsedPayload };

export class CoreNFCManager {
  private isInitialized = false;
  private isReading = false;

  async initialize(): Promise<boolean> {
    try {
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        console.warn('NFC not supported on this device');
        return false;
      }

      await NfcManager.start();
      this.isInitialized = true;
      console.log(`✅ NFC Manager initialized for ${Platform.OS}`);
      return true;
    } catch (error) {
      console.error('❌ NFC initialization failed:', error);
      return false;
    }
  }

  async isNFCAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      const isSupported = await NfcManager.isSupported();
      
      if (Platform.OS === 'android') {
        try {
          const isEnabled = await NfcManager.isEnabled();
          return isSupported && isEnabled;
        } catch (error) {
          console.warn('Could not check if NFC is enabled:', error);
          return isSupported;
        }
      }
      
      return isSupported;
    } catch (error) {
      console.warn('Error checking NFC availability:', error);
      return false;
    }
  }

  async readNFCTag(): Promise<NFCTagData> {
    if (!this.isInitialized) {
      throw new Error('NFC Manager not initialized. Call initialize() first.');
    }

    if (this.isReading) {
      throw new Error('NFC read already in progress');
    }

    this.isReading = true;

    try {
      if (Platform.OS === 'ios') {
        await NfcManager.requestTechnology([NfcTech.Ndef], {
          alertMessage: 'Hold your iPhone near the NFC tag',
          invalidateAfterFirstRead: true,
        });
      } else {
        await NfcManager.requestTechnology([
          NfcTech.Ndef,
          NfcTech.NfcA,
          NfcTech.NfcB,
          NfcTech.NfcF,
          NfcTech.NfcV
        ]);
      }

      const tag = await NfcManager.getTag();
      
      if (!tag) {
        throw new Error('No NFC tag detected');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const tagData = await this.parseTagData(tag);
      return tagData;

    } finally {
      this.isReading = false;
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('Error canceling NFC request:', error);
      }
    }
  }

  private async parseTagData(tag: TagEvent): Promise<NFCTagData> {
    const tagId = this.getTagId(tag.id);
    const techTypes = tag.techTypes || ['NDEF'];
    
    let ndefRecords: NDEFRecord[] = [];
    let type = 'Unknown';
    let maxSize = 0;
    let isWritable = false;
    let canMakeReadOnly = false;

    try {
      const ndefMessage = await NfcManager.ndefHandler.getNdefMessage();
      if (ndefMessage && ndefMessage.ndefMessage && Array.isArray(ndefMessage.ndefMessage)) {
        ndefRecords = ndefMessage.ndefMessage.map((record: any, index: number) => 
          this.parseNdefRecord(record, index)
        );
      }

      try {
        const ndefStatus = await NfcManager.ndefHandler.getNdefStatus();
        maxSize = ndefStatus?.capacity || 0;
        isWritable = ndefStatus?.status?.isWritable || false;
        canMakeReadOnly = ndefStatus?.status?.canMakeReadOnly || false;
      } catch (error) {
        console.warn('Could not get NDEF status:', error);
      }

      type = this.determineTagType(techTypes, maxSize);

    } catch (error) {
      console.warn('Error reading NDEF data:', error);
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

  private getTagId(id: any): string {
    if (!id) return 'UNKNOWN';
    
    if (typeof id === 'string') {
      return id.toUpperCase();
    }
    
    if (id instanceof Uint8Array) {
      return Array.from(id)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    }
    
    if (Array.isArray(id)) {
      return id
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    }
    
    return String(id);
  }

  private parseNdefRecord(record: any, index: number): NDEFRecord {
    try {
      const payload = this.parseNdefPayload(record);
      
      return {
        id: record.id ? this.getTagId(record.id) : `record_${index}`,
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
          error: `Failed to parse record: ${(error as Error).message}`
        },
        tnf: 0,
      };
    }
  }

  private parseNdefPayload(record: any): ParsedPayload {
    try {
      const payload = record.payload;
      if (!payload || payload.length === 0) {
        return { type: 'raw', data: '' };
      }

      if (record.tnf === 1 && record.type && this.bytesToString(record.type) === 'T') {
        return this.parseTextRecord(payload);
      }

      if (record.tnf === 1 && record.type && this.bytesToString(record.type) === 'U') {
        return this.parseUriRecord(payload);
      }

      return {
        type: 'raw',
        data: this.bytesToHex(payload)
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to parse payload: ${(error as Error).message}`
      };
    }
  }

  private parseTextRecord(payload: number[] | Uint8Array): ParsedPayload {
    const bytes = Array.from(payload);
    
    if (bytes.length < 3) {
      throw new Error('Invalid text record payload');
    }

    const statusByte = bytes[0];
    const languageLength = statusByte & 0x3f;
    
    if (bytes.length < 1 + languageLength) {
      throw new Error('Invalid text record format');
    }

    const language = this.bytesToString(bytes.slice(1, 1 + languageLength));
    const text = this.bytesToString(bytes.slice(1 + languageLength));

    return {
      type: 'text',
      text,
      language
    };
  }

  private parseUriRecord(payload: number[] | Uint8Array): ParsedPayload {
    const bytes = Array.from(payload);
    
    if (bytes.length === 0) {
      throw new Error('Empty URI record');
    }

    const prefixByte = bytes[0];
    const uriData = bytes.slice(1);
    
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

  private bytesToString(bytes: number[] | Uint8Array): string {
    const byteArray = Array.from(bytes);
    return String.fromCharCode(...byteArray);
  }

  private bytesToHex(bytes: number[] | Uint8Array): string {
    const byteArray = Array.from(bytes);
    return byteArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  private determineTagType(techTypes: string[], maxSize: number): string {
    if (Platform.OS === 'ios') {
      return 'NDEF_TAG';
    }

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

  async cleanup(): Promise<void> {
    try {
      if (this.isReading) {
        await NfcManager.cancelTechnologyRequest();
      }
      await NfcManager.stop();
      this.isInitialized = false;
      console.log('🧹 NFC Manager cleaned up');
    } catch (error) {
      console.warn('Error during NFC cleanup:', error);
    }
  }
}