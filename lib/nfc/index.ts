// lib/nfc/index.ts - Main NFC Manager
import { CoreNFCManager } from './core-manager';
import { SecurityManager } from './security-manager';
import { LoggingManager } from './logging-manager';
import { NFCTagData, ThreatReport, NFCAccessLog } from './types';
import * as Crypto from 'expo-crypto';
export { simpleSecureNFCManager } from './simple-secure-manager';
// export { nfcManager } from './core-manager';

// export * from './types';

// Export types from types.ts
export { NFCTagData, ThreatReport, NFCAccessLog, ParsedPayload, NDEFRecord } from './types';

// Export cloning demo types

class NFCManager {
  private core = new CoreNFCManager();
  private security = new SecurityManager();
  private logging = new LoggingManager();

  /**
   * Initialize NFC Manager
   */
  async initialize(): Promise<boolean> {
    return await this.core.initialize();
  }

  /**
   * Check if NFC is available on this device
   */
  async isNFCAvailable(): Promise<boolean> {
    return await this.core.isNFCAvailable();
  }

  /**
   * Read an NFC tag with security analysis
   */
  async readNFCTag(): Promise<NFCTagData> {
    const startTime = Date.now();
    
    try {
      // Read the tag
      const tagData = await this.core.readNFCTag();
      
      // Perform security analysis
      const threatReport = await this.security.performThreatDetection(tagData);
      
      // Block if threat detected and marked as blocked
      if (threatReport?.blocked) {
        await this.logging.logThreatReport(threatReport);
        throw new Error(`Security threat detected: ${threatReport.description}`);
      }

      // Log the access
      const readDuration = Date.now() - startTime;
      const accessLog: NFCAccessLog = {
        tagId: tagData.id,
        timestamp: tagData.timestamp,
        techTypes: tagData.techTypes,
        hasNdefData: tagData.ndefRecords.length > 0,
        readDuration,
        securityLevel: this.security.assessSecurityLevel(tagData),
        threatDetected: !!threatReport,
      };

      await this.logging.logNFCAccess(accessLog);

      // Log threat if detected but not blocked
      if (threatReport && !threatReport.blocked) {
        await this.logging.logThreatReport(threatReport);
      }

      return tagData;
    } catch (error) {
      // Log failed attempts too
      const readDuration = Date.now() - startTime;
      console.error('NFC read failed after', readDuration + 'ms:', error);
      throw error;
    }
  }

  /**
   * Security Features
   */
  async enableReadProtection(): Promise<void> {
    return await this.security.enableReadProtection();
  }

  async enableWriteProtection(): Promise<void> {
    return await this.security.enableWriteProtection();
  }

  async enableCloningProtection(): Promise<void> {
    return await this.security.enableCloningProtection();
  }

  async enableThreatDetection(enabled: boolean): Promise<void> {
    this.security.enableThreatDetection(enabled);
  }

  /**
   * Generate encrypted backup of tag data
   */
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

  /**
   * Logging & Analytics
   */
  async getAccessLogs(): Promise<NFCAccessLog[]> {
    return await this.logging.getAccessLogs();
  }

  async getThreatReports(): Promise<ThreatReport[]> {
    return await this.logging.getThreatReports();
  }

  async clearAccessLogs(): Promise<void> {
    return await this.logging.clearAccessLogs();
  }

  async clearThreatReports(): Promise<void> {
    return await this.logging.clearThreatReports();
  }

  /**
   * CLONING DEMONSTRATION METHODS
   * These methods demonstrate vulnerabilities - NOT for production use
   */
  
  // /**
  //  * Demo Step 1: Extract data from legitimate card
  //  */
  // async demoExtractCardData(): Promise<ClonedCardData> {
  //   console.log('🚨 STARTING CLONING DEMO - Step 1: Extract Card Data');
  //   return await this.cloningDemo.extractCardData();
  // }

  // /**
  //  * Demo Step 2: Prepare clone payload
  //  */
  // async demoPrepareClone(originalUID: string): Promise<any> {
  //   console.log('🚨 CLONING DEMO - Step 2: Prepare Clone Payload');
  //   return await this.cloningDemo.prepareClonePayload(originalUID);
  // }

  // /**
  //  * Demo Step 3: Write clone to blank tag
  //  */
  // async demoWriteClone(clonePayload: any): Promise<CloneResult> {
  //   console.log('🚨 CLONING DEMO - Step 3: Write Clone to Blank Tag');
  //   return await this.cloningDemo.writeCloneToBlankTag(clonePayload);
  // }

  // /**
  //  * Demo Step 4: Test cloned card
  //  */
  // async demoTestClone(): Promise<{isClone: boolean, canAccess: boolean, details: any}> {
  //   console.log('🚨 CLONING DEMO - Step 4: Test Cloned Card');
  //   return await this.cloningDemo.testClonedCard();
  // }

  // /**
  //  * Get demo data for analysis
  //  */
  // getDemoData(): ClonedCardData[] {
  //   return this.cloningDemo.getStoredCardData();
  // }

  // /**
  //  * Clear demo data
  //  */
  // clearDemoData(): void {
  //   this.cloningDemo.clearDemoData();
  // }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    return await this.core.cleanup();
  }

  /**
 * Write text data to NFC tag
 */
  async writeNFCTag(textData: string[]): Promise<void> {
    return await this.core.writeNFCTag(textData);
  }
}

// Export singleton instance
export const nfcManager = new NFCManager();