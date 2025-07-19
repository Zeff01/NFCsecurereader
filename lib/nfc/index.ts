
// lib/nfc/index.ts
import NfcManager, { NfcTech, TagEvent } from 'react-native-nfc-manager';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { SecurityManager } from './security-manager';
import { NFCTagData, NDEFRecord } from './types';
export { simpleSecureNFCManager } from './simple-secure-manager';
export { NFCTagData, ThreatReport, NDEFRecord } from './types';

class NFCManager {
  private isInitialized = false;
  private isReading = false;
  private security = new SecurityManager();

  async initialise(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;
      
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) return false;

      await NfcManager.start();
      this.isInitialized = true;
      console.log('NFC Manager initialised');
      return true;
    } catch (error) {
      console.error('NFC initialisation failed:', error);
      return false;
    }
  }

  async isNFCAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialise();
        if (!initialized) return false;
      }

      const isSupported = await NfcManager.isSupported();
      
      if (Platform.OS === 'android') {
        const isEnabled = await NfcManager.isEnabled();
        return isSupported && isEnabled;
      }
      
      return isSupported;
    } catch (error) {
      console.warn('error checking NFC availability:', error);
      return false;
    }
  }

  async readNFCTag(): Promise<NFCTagData> {
    if (!this.isInitialized) {
      throw new Error('NFC Manager not initialised');
    }

    if (this.isReading) {
      throw new Error('NFC read already in progress');
    }

    this.isReading = true;

    try {
      if (Platform.OS === 'ios') {
        await NfcManager.requestTechnology([NfcTech.Ndef], {
          alertMessage: 'hold iPhone near the NFC tag',
          invalidateAfterFirstRead: true,
        });
      } else {
        await NfcManager.requestTechnology([NfcTech.Ndef]);
      }

      const tag = await NfcManager.getTag();
      
      if (!tag) {
        throw new Error('no tag detected');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const tagData = await this.parseTagData(tag);

      // Perform security analysis
      const threatReport = await this.security.performThreatDetection(tagData);
      
      // Log threats but don't block (let demos handle it)
      if (threatReport?.blocked) {
        console.warn('threat blocked:', threatReport.description);
      } else if (threatReport) {
        console.warn('threat detected:', threatReport.description);
      }

      return tagData;

    } finally {
      this.isReading = false;
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('error canceling NFC request:', error);
      }
    }
  }


  async writeNFCTag(textData: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NFC Manager not initialised');
    }

    if (this.isReading) {
      throw new Error('NFC operation in progress');
    }

    this.isReading = true;

    try {
      if (Platform.OS === 'ios') {
        await NfcManager.requestTechnology([NfcTech.Ndef], {
          alertMessage: 'hold your iPhone near the NFC tag to write',
          invalidateAfterFirstRead: true,
        });
      } else {
        await NfcManager.requestTechnology([NfcTech.Ndef]);
      }

      // create NDEF message bytes
      const ndefMessageBytes: number[] = [];
      
      textData.forEach((text, index) => {
        const langCode = 'en';
        const langCodeBytes = new TextEncoder().encode(langCode);
        const textBytes = new TextEncoder().encode(text);
      
        const payload = new Uint8Array(1 + langCodeBytes.length + textBytes.length);
        payload[0] = langCodeBytes.length;
        payload.set(langCodeBytes, 1);
        payload.set(textBytes, 1 + langCodeBytes.length);

        let flags = 0x01;
        if (index === 0) flags |= 0x80; 
        if (index === textData.length - 1) flags |= 0x40; 
        if (payload.length < 256) flags |= 0x10; 

        ndefMessageBytes.push(flags);
        ndefMessageBytes.push(0x01); 
        ndefMessageBytes.push(payload.length); 
        ndefMessageBytes.push(0x54);
        ndefMessageBytes.push(...Array.from(payload));
      });


      await NfcManager.ndefHandler.writeNdefMessage(ndefMessageBytes);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('NFC write successful');

    } finally {
      this.isReading = false;
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('error');
      }
    }
  }

  private async parseTagData(tag: TagEvent): Promise<NFCTagData> {
    const tagId = this.getTagId(tag.id);
    const techTypes = tag.techTypes || ['NDEF'];
    
    let ndefRecords: NDEFRecord[] = [];

    try {
      const ndefMessage = await NfcManager.ndefHandler.getNdefMessage();
      if (ndefMessage?.ndefMessage && Array.isArray(ndefMessage.ndefMessage)) {
        ndefRecords = ndefMessage.ndefMessage.map((record: any, index: number) => ({
          id: `record_${index}`,
          type: 'T', 
          payload: this.parsePayload(record.payload),
          tnf: 1,
        }));
      }
    } catch (error) {
      console.warn('error reading NDEF:', error);
    }

    return {
      id: tagId,
      techTypes,
      type: 'DEMO_TAG',
      maxSize: 1000,
      isWritable: true,
      canMakeReadOnly: false,
      ndefRecords,
      rawData: tag,
      timestamp: new Date().toISOString(),
    };
  }

  private getTagId(id: any): string {
    if (!id) return 'DEMO_TAG_' + Date.now();
    
    if (typeof id === 'string') {
      return id.toUpperCase();
    }
    
    if (Array.isArray(id)) {
      return id
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    }
    return 'DEMO_TAG_' + Date.now();
  }

  private parsePayload(payload: any): string {
    if (!payload) return '';
    
    try {
      if (typeof payload === 'string') return payload;
      
      if (Array.isArray(payload)) {
        const textBytes = payload.slice(3);
        return String.fromCharCode(...textBytes);
      }
      
      return String(payload);
    } catch (error) {
      return 'error';
    }
  }

  async enableThreatDetection(enabled: boolean): Promise<void> {
    this.security.enableThreatDetection(enabled);
  }

  getThreatAttempts(tagId: string): number {
    return 0;
  }

  resetThreatDetection(): void {
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isReading) {
        await NfcManager.cancelTechnologyRequest();
      }
      this.isInitialized = false;
      console.log('cleaned');
    } catch (error) {
      console.warn('error during cleanup:', error);
    }
  }
}

export const nfcManager = new NFCManager();