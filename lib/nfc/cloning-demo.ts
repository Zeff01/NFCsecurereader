
import { CoreNFCManager } from './core-manager';
import { NFCTagData } from './types';

export interface ClonedCardData {
  originalUID: string;
  extractedData: any;
  clonedAt: string;
  accessLevel?: string;
  userInfo?: any;
}

export interface CloneResult {
  success: boolean;
  message: string;
  clonedData?: ClonedCardData;
  error?: string;
}

export class CloningDemoManager {
  private core = new CoreNFCManager();
  private storedCardData: Map<string, ClonedCardData> = new Map();

  /**
   * Step 1: Read and extract data from legitimate card (simulating attacker behavior)
   */
  async extractCardData(): Promise<ClonedCardData> {
    try {
      // Read the original card
      const tagData = await this.core.readNFCTag();
      
      // Extract critical information (simulate what attacker would target)
      const extractedData = {
        uid: tagData.id,
        techTypes: tagData.techTypes,
        ndefRecords: tagData.ndefRecords,
        // Simulate extracting access credentials
        accessLevel: this.parseAccessLevel(tagData),
        userInfo: this.parseUserInfo(tagData)
      };

      const clonedCardData: ClonedCardData = {
        originalUID: tagData.id,
        extractedData: extractedData,
        clonedAt: new Date().toISOString(),
        accessLevel: extractedData.accessLevel,
        userInfo: extractedData.userInfo
      };

      // Store extracted data (simulate attacker's database)
      this.storedCardData.set(tagData.id, clonedCardData);
      
      console.log('🚨 DEMO: Card data extracted successfully');
      console.log('Extracted UID:', tagData.id);
      console.log('Access Level:', extractedData.accessLevel);
      
      return clonedCardData;
    } catch (error) {
      console.error('Failed to extract card data:', error);
      throw error;
    }
  }

  /**
   * Step 2: Create clone data payload
   */
  async prepareClonePayload(originalUID: string): Promise<any> {
    const storedData = this.storedCardData.get(originalUID);
    if (!storedData) {
      throw new Error('Original card data not found. Extract card data first.');
    }

    // Create clone payload that mimics original
    const clonePayload = {
      // Spoof the original UID
      spoofedUID: storedData.originalUID,
      accessLevel: storedData.accessLevel,
      userInfo: storedData.userInfo,
      // Add clone identifier (for demo purposes)
      cloneId: `clone_${Date.now()}`,
      originalTimestamp: storedData.clonedAt,
      cloneCreated: new Date().toISOString()
    };

    console.log('🚨 DEMO: Clone payload prepared');
    console.log('Will spoof UID:', clonePayload.spoofedUID);
    
    return clonePayload;
  }

  /**
   * Step 3: Write clone data to blank tag (simulating the actual cloning)
   */
  async writeCloneToBlankTag(clonePayload: any): Promise<CloneResult> {
    try {
      // In a real scenario, this would write to a blank NFC tag
      // For demo purposes, we'll simulate this by creating NDEF records
      
      const ndefRecords = [
        {
          tnf: 1, // Well-known type
          type: new Uint8Array([0x54]), // 'T' for text
          payload: new TextEncoder().encode(`UID:${clonePayload.spoofedUID}`)
        },
        {
          tnf: 1,
          type: new Uint8Array([0x54]),
          payload: new TextEncoder().encode(`ACCESS:${clonePayload.accessLevel}`)
        },
        {
          tnf: 1,
          type: new Uint8Array([0x54]),
          payload: new TextEncoder().encode(`USER:${JSON.stringify(clonePayload.userInfo)}`)
        },
        {
          tnf: 1,
          type: new Uint8Array([0x54]),
          payload: new TextEncoder().encode(`CLONE_ID:${clonePayload.cloneId}`)
        }
      ];

      // Simulate writing to blank tag
      console.log('🚨 DEMO: Writing clone data to blank tag...');
      
      // In your actual implementation, you'd use:
      // await this.core.writeNFCTag(ndefRecords);
      
      // For demo, we simulate success
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate write time
      
      console.log('🚨 DEMO: Clone successfully written to blank tag');
      
      return {
        success: true,
        message: 'Card successfully cloned! The blank tag now contains the original card\'s access credentials.',
        clonedData: {
          originalUID: clonePayload.spoofedUID,
          extractedData: clonePayload,
          clonedAt: clonePayload.cloneCreated
        }
      };
      
    } catch (error : any) {
      console.error('Failed to write clone:', error);
      return {
        success: false,
        message: 'Failed to clone card',
        error: error.message
      };
    }
  }

  /**
   * Step 4: Test the cloned card
   */
  async testClonedCard(): Promise<{isClone: boolean, canAccess: boolean, details: any}> {
    try {
      // Read the cloned tag
      const tagData = await this.core.readNFCTag();
      
      // Parse the data to check if it's a clone
      const parsedData = this.parseClonedData(tagData);
      
      // Check if this appears to be a legitimate card
      const isClone = this.detectClone(parsedData);
      const canAccess = this.simulateAccessCheck(parsedData);
      
      console.log('🚨 DEMO: Testing cloned card');
      console.log('Is Clone:', isClone);
      console.log('Can Access System:', canAccess);
      
      return {
        isClone,
        canAccess,
        details: {
          uid: tagData.id,
          accessLevel: parsedData.accessLevel,
          cloneId: parsedData.cloneId,
          detectionMethod: isClone ? 'Clone identifier found' : 'Appears legitimate'
        }
      };
      
    } catch (error) {
      console.error('Failed to test cloned card:', error);
      throw error;
    }
  }

  /**
   * Get stored card data for analysis
   */
  getStoredCardData(): ClonedCardData[] {
    return Array.from(this.storedCardData.values());
  }

  /**
   * Clear demo data
   */
  clearDemoData(): void {
    this.storedCardData.clear();
    console.log('Demo data cleared');
  }

  // Helper methods - changed from private to private (but they're being used internally)
  private parseAccessLevel(tagData: NFCTagData): string {
    // Simulate extracting access level from NDEF records
    // In real scenario, this would parse actual access control data
    const records = tagData.ndefRecords;
    if (records.length > 0) {
      return 'ADMIN'; // Simulate high-privilege access
    }
    return 'USER';
  }

  private parseUserInfo(tagData: NFCTagData): any {
    // Simulate extracting user information
    return {
      cardHolder: 'John Doe',
      department: 'Engineering',
      employeeId: '12345',
      validUntil: '2025-12-31'
    };
  }

  private parseClonedData(tagData: NFCTagData): any {
    const data: any = {};
    
    tagData.ndefRecords.forEach(record => {
      if (!record.payload) return;
      
      const payload = record.payload; // Now it's just a string
      
      if (payload.startsWith('UID:')) {
        data['uid'] = payload.substring(4);
      } else if (payload.startsWith('ACCESS:')) {
        data['accessLevel'] = payload.substring(7);
      } else if (payload.startsWith('CLONE_ID:')) {
        data['cloneId'] = payload.substring(9);
      }
    });
    
    return data;
  }

  private detectClone(parsedData: any): boolean {
    // In demo, we can detect clones by checking for clone identifier
    return !!parsedData.cloneId;
  }

  private simulateAccessCheck(parsedData: any): boolean {
    // Simulate that the system would grant access based on the cloned credentials
    return parsedData.accessLevel === 'ADMIN' || parsedData.accessLevel === 'USER';
  }
}
