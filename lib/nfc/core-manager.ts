// lib/nfc/core-manager.ts - Final version with fixed writeNFCTag
import NfcManager, { NfcTech, TagEvent, Ndef } from 'react-native-nfc-manager';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NFCTagData, NDEFRecord } from './types';

export class CoreNFCManager {
  private isInitialized = false;
  private isReading = false;

  async initialize(): Promise<boolean> {
    try {
      // First check if NfcManager exists
      if (!NfcManager) {
        console.error('❌ NfcManager is not available');
        return false;
      }
  
      // Check if NFC is supported
      let isSupported;
      try {
        isSupported = await NfcManager.isSupported();
      } catch (supportError) {
        console.error('❌ Error checking NFC support:', supportError);
        return false;
      }
  
      if (!isSupported) {
        console.warn('⚠️ NFC not supported on this device');
        return false;
      }
  
      // Try to start NFC with better error handling
      try {
        await NfcManager.start();
        console.log('✅ NFC started successfully');
      } catch (startError) {
        console.error('❌ NFC start failed:', startError);
        
        // Check if it's already started
        try {
          const isEnabled = await NfcManager.isEnabled();
          if (isEnabled) {
            console.log('✅ NFC was already started');
          } else {
            console.error('❌ NFC is disabled in device settings');
            return false;
          }
        } catch (enabledError) {
          console.error('❌ Cannot check NFC enabled status:', enabledError);
          return false;
        }
      }
  
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
      if (!NfcManager) {
        console.error('❌ NfcManager is not available');
        return false;
      }
  
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }
  
      // Check if supported
      let isSupported;
      try {
        isSupported = await NfcManager.isSupported();
      } catch (supportError) {
        console.error('❌ Error checking NFC support:', supportError);
        return false;
      }
      
      if (Platform.OS === 'android') {
        try {
          const isEnabled = await NfcManager.isEnabled();
          console.log('✅ NFC enabled status:', isEnabled);
          return isSupported && isEnabled;
        } catch (enabledError) {
          console.warn('⚠️ Could not check if NFC is enabled:', enabledError);
          return isSupported;
        }
      }
      
      return isSupported;
    } catch (error) {
      console.error('❌ Error checking NFC availability:', error);
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
        await NfcManager.requestTechnology([NfcTech.Ndef]);
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

    try {
      const ndefMessage = await NfcManager.ndefHandler.getNdefMessage();
      if (ndefMessage && ndefMessage.ndefMessage && Array.isArray(ndefMessage.ndefMessage)) {
        ndefRecords = ndefMessage.ndefMessage.map((record: any, index: number) => ({
          id: `record_${index}`,
          type: 'T', // Just assume text for demo
          payload: this.simpleParsePayload(record.payload),
          tnf: 1,
        }));
      }
    } catch (error) {
      console.warn('Error reading NDEF data:', error);
    }

    return {
      id: tagId,
      techTypes,
      type: 'DEMO_TAG',
      maxSize: 1000, // Just use a default
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
    } catch (error) {
      return 'Demo payload data';
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isReading) {
        await NfcManager.cancelTechnologyRequest();
      }
      // Remove the stop() call since it doesn't exist
      this.isInitialized = false;
      console.log('🧹 NFC Manager cleaned up');
    } catch (error) {
      console.warn('Error during NFC cleanup:', error);
    }
  }

  async writeNFCTag(textData: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NFC Manager not initialized. Call initialize() first.');
    }
  
    if (this.isReading) {
      throw new Error('NFC operation already in progress');
    }
  
    this.isReading = true;
  
    try {
      if (Platform.OS === 'ios') {
        await NfcManager.requestTechnology([NfcTech.Ndef], {
          alertMessage: 'Hold your iPhone near the NFC tag to write',
          invalidateAfterFirstRead: true,
        });
      } else {
        await NfcManager.requestTechnology([NfcTech.Ndef]);
      }

      // Create raw NDEF message bytes
      const ndefMessageBytes: number[] = [];
      
      textData.forEach((text, index) => {
        const langCode = 'en';
        const langCodeBytes = new TextEncoder().encode(langCode);
        const textBytes = new TextEncoder().encode(text);
        
        // Create text record payload: [status byte][lang code][text]
        const payload = new Uint8Array(1 + langCodeBytes.length + textBytes.length);
        payload[0] = langCodeBytes.length; // Status byte with language code length
        payload.set(langCodeBytes, 1);
        payload.set(textBytes, 1 + langCodeBytes.length);

        // Create NDEF record header
        let flags = 0x01; // TNF = 0x01 (Well Known Type)
        
        // Set MB (Message Begin) flag for first record
        if (index === 0) {
          flags |= 0x80; // MB flag
        }
        
        // Set ME (Message End) flag for last record
        if (index === textData.length - 1) {
          flags |= 0x40; // ME flag
        }
        
        // Set SR (Short Record) flag if payload is less than 256 bytes
        if (payload.length < 256) {
          flags |= 0x10; // SR flag
        }

        // Build the record
        ndefMessageBytes.push(flags);           // Record header
        ndefMessageBytes.push(0x01);           // Type length (1 byte for 'T')
        ndefMessageBytes.push(payload.length); // Payload length
        ndefMessageBytes.push(0x54);           // Type = 'T' (Text)
        ndefMessageBytes.push(...Array.from(payload)); // Payload
      });

      // Write using the proper NDEF handler method
      await NfcManager.ndefHandler.writeNdefMessage(ndefMessageBytes);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('✅ NFC write successful');
  
    } finally {
      this.isReading = false;
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('Error canceling NFC request:', error);
      }
    }
  }
}

// // lib/nfc/core-manager.ts - SIMPLIFIED FOR DEMO ONLY
// import NfcManager, { NfcTech, TagEvent, Ndef } from 'react-native-nfc-manager';
// import { Platform } from 'react-native';
// import * as Haptics from 'expo-haptics';
// import { NFCTagData, NDEFRecord } from './types';

// export class CoreNFCManager {
//   private isInitialized = false;
//   private isReading = false;

//   async initialize(): Promise<boolean> {
//     try {
//       // First check if NfcManager exists
//       if (!NfcManager) {
//         console.error('❌ NfcManager is not available');
//         return false;
//       }
  
//       // Check if NFC is supported
//       let isSupported;
//       try {
//         isSupported = await NfcManager.isSupported();
//       } catch (supportError) {
//         console.error('❌ Error checking NFC support:', supportError);
//         return false;
//       }
  
//       if (!isSupported) {
//         console.warn('⚠️ NFC not supported on this device');
//         return false;
//       }
  
//       // Try to start NFC with better error handling
//       try {
//         await NfcManager.start();
//         console.log('✅ NFC started successfully');
//       } catch (startError) {
//         console.error('❌ NFC start failed:', startError);
        
//         // Check if it's already started
//         try {
//           const isEnabled = await NfcManager.isEnabled();
//           if (isEnabled) {
//             console.log('✅ NFC was already started');
//           } else {
//             console.error('❌ NFC is disabled in device settings');
//             return false;
//           }
//         } catch (enabledError) {
//           console.error('❌ Cannot check NFC enabled status:', enabledError);
//           return false;
//         }
//       }
  
//       this.isInitialized = true;
//       console.log(`✅ NFC Manager initialized for ${Platform.OS}`);
//       return true;
      
//     } catch (error) {
//       console.error('❌ NFC initialization failed:', error);
//       return false;
//     }
//   }

//   async isNFCAvailable(): Promise<boolean> {
//     try {
//       if (!NfcManager) {
//         console.error('❌ NfcManager is not available');
//         return false;
//       }
  
//       if (!this.isInitialized) {
//         const initialized = await this.initialize();
//         if (!initialized) return false;
//       }
  
//       // Check if supported
//       let isSupported;
//       try {
//         isSupported = await NfcManager.isSupported();
//       } catch (supportError) {
//         console.error('❌ Error checking NFC support:', supportError);
//         return false;
//       }
      
//       if (Platform.OS === 'android') {
//         try {
//           const isEnabled = await NfcManager.isEnabled();
//           console.log('✅ NFC enabled status:', isEnabled);
//           return isSupported && isEnabled;
//         } catch (enabledError) {
//           console.warn('⚠️ Could not check if NFC is enabled:', enabledError);
//           return isSupported;
//         }
//       }
      
//       return isSupported;
//     } catch (error) {
//       console.error('❌ Error checking NFC availability:', error);
//       return false;
//     }
//   }

//   async readNFCTag(): Promise<NFCTagData> {
//     if (!this.isInitialized) {
//       throw new Error('NFC Manager not initialized. Call initialize() first.');
//     }

//     if (this.isReading) {
//       throw new Error('NFC read already in progress');
//     }

//     this.isReading = true;

//     try {
//       if (Platform.OS === 'ios') {
//         await NfcManager.requestTechnology([NfcTech.Ndef], {
//           alertMessage: 'Hold your iPhone near the NFC tag',
//           invalidateAfterFirstRead: true,
//         });
//       } else {
//         await NfcManager.requestTechnology([NfcTech.Ndef]);
//       }

//       const tag = await NfcManager.getTag();
      
//       if (!tag) {
//         throw new Error('No NFC tag detected');
//       }

//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

//       const tagData = await this.parseTagData(tag);
//       return tagData;

//     } finally {
//       this.isReading = false;
//       try {
//         await NfcManager.cancelTechnologyRequest();
//       } catch (error) {
//         console.warn('Error canceling NFC request:', error);
//       }
//     }
//   }

//   private async parseTagData(tag: TagEvent): Promise<NFCTagData> {
//     const tagId = this.getTagId(tag.id);
//     const techTypes = tag.techTypes || ['NDEF'];
    
//     let ndefRecords: NDEFRecord[] = [];

//     try {
//       const ndefMessage = await NfcManager.ndefHandler.getNdefMessage();
//       if (ndefMessage && ndefMessage.ndefMessage && Array.isArray(ndefMessage.ndefMessage)) {
//         ndefRecords = ndefMessage.ndefMessage.map((record: any, index: number) => ({
//           id: `record_${index}`,
//           type: 'T', // Just assume text for demo
//           payload: this.simpleParsePayload(record.payload),
//           tnf: 1,
//         }));
//       }
//     } catch (error) {
//       console.warn('Error reading NDEF data:', error);
//     }

//     return {
//       id: tagId,
//       techTypes,
//       type: 'DEMO_TAG',
//       maxSize: 1000, // Just use a default
//       isWritable: true,
//       canMakeReadOnly: false,
//       ndefRecords,
//       rawData: tag,
//       timestamp: new Date().toISOString(),
//     };
//   }

//   private getTagId(id: any): string {
//     if (!id) return 'DEMO_TAG_' + Date.now();
    
//     if (typeof id === 'string') {
//       return id.toUpperCase();
//     }
    
//     if (Array.isArray(id)) {
//       return id
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('')
//         .toUpperCase();
//     }
    
//     return 'DEMO_TAG_' + Date.now();
//   }

//   private simpleParsePayload(payload: any): string {
//     if (!payload) return '';
    
//     try {
//       // Just try to convert to string in the simplest way
//       if (typeof payload === 'string') {
//         return payload;
//       }
      
//       if (Array.isArray(payload)) {
//         // Skip first few bytes and convert rest to string
//         const textBytes = payload.slice(3); // Skip language info
//         return String.fromCharCode(...textBytes);
//       }
      
//       return String(payload);
//     } catch (error) {
//       return 'Demo payload data';
//     }
//   }

//   async cleanup(): Promise<void> {
//     try {
//       if (this.isReading) {
//         await NfcManager.cancelTechnologyRequest();
//       }
//       // Remove the stop() call since it doesn't exist
//       this.isInitialized = false;
//       console.log('🧹 NFC Manager cleaned up');
//     } catch (error) {
//       console.warn('Error during NFC cleanup:', error);
//     }
//   }

//   async writeNFCTag(textData: string[]): Promise<void> {
//     if (!this.isInitialized) {
//       throw new Error('NFC Manager not initialized. Call initialize() first.');
//     }
  
//     if (this.isReading) {
//       throw new Error('NFC operation already in progress');
//     }
  
//     this.isReading = true;
  
//     try {
//       if (Platform.OS === 'ios') {
//         await NfcManager.requestTechnology([NfcTech.Ndef], {
//           alertMessage: 'Hold your iPhone near the NFC tag to write',
//           invalidateAfterFirstRead: true,
//         });
//       } else {
//         await NfcManager.requestTechnology([NfcTech.Ndef]);
//       }
  
//       // Create raw NDEF message bytes
//       const ndefMessageBytes: number[] = [];
      
//       textData.forEach((text, index) => {
//         const langCode = 'en';
//         const langCodeBytes = new TextEncoder().encode(langCode);
//         const textBytes = new TextEncoder().encode(text);
        
//         // Create text record payload: [status byte][lang code][text]
//         const payload = new Uint8Array(1 + langCodeBytes.length + textBytes.length);
//         payload[0] = langCodeBytes.length; // Status byte with language code length
//         payload.set(langCodeBytes, 1);
//         payload.set(textBytes, 1 + langCodeBytes.length);
  
//         // Create NDEF record header
//         let flags = 0x01; // TNF = 0x01 (Well Known Type)
        
//         // Set MB (Message Begin) flag for first record
//         if (index === 0) {
//           flags |= 0x80; // MB flag
//         }
        
//         // Set ME (Message End) flag for last record
//         if (index === textData.length - 1) {
//           flags |= 0x40; // ME flag
//         }
        
//         // Set SR (Short Record) flag if payload is less than 256 bytes
//         if (payload.length < 256) {
//           flags |= 0x10; // SR flag
//         }
  
//         // Build the record
//         ndefMessageBytes.push(flags);           // Record header
//         ndefMessageBytes.push(0x01);           // Type length (1 byte for 'T')
//         ndefMessageBytes.push(payload.length); // Payload length
//         ndefMessageBytes.push(0x54);           // Type = 'T' (Text)
//         ndefMessageBytes.push(...Array.from(payload)); // Payload
//       });
  
//       // Write using the proper NDEF handler method
//       await NfcManager.ndefHandler.writeNdefMessage(ndefMessageBytes);
      
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//       console.log('✅ NFC write successful');
  
//     } finally {
//       this.isReading = false;
//       try {
//         await NfcManager.cancelTechnologyRequest();
//       } catch (error) {
//         console.warn('Error canceling NFC request:', error);
//       }
//     }
//   }
// }