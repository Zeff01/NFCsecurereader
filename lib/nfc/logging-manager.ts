// lib/nfc/logging-manager.ts

// // lib/nfc/secure-nfc-manager.ts - Integration with existing NFC manager

// import { NFCSecurityManager, SecurityConfig } from './security-features';
// import { nfcManager } from './index';

// export class SecureNFCManager {
//   private securityManager: NFCSecurityManager;

//   constructor() {
//     // Initialize with default security config
//     const defaultConfig: SecurityConfig = {
//       privateKey: 'demo_private_key_12345_secure',
//       publicKey: 'demo_public_key_12345_secure',
//       signatureExpiration: 5 * 60 * 1000, // 5 minutes
//       maxAccessesPerMinute: 3,
//       maxLocationsPerHour: 2
//     };

//     this.securityManager = new NFCSecurityManager(defaultConfig);
//   }

//   /**
//    * Write a secure, signed NFC tag
//    */
//   async writeSecureTag(data: string, location?: string): Promise<void> {
//     try {
//       console.log('🔒 Creating secure NFC tag...');
      
//       // Create signed payload
//       const signedPayload = await this.securityManager.createSignedPayload(data, location);
      
//       console.log('📝 Signed payload created:', signedPayload.substring(0, 100) + '...');
      
//       // Write to NFC tag using existing manager
//       await nfcManager.writeNFCTag([signedPayload]);
      
//       console.log('✅ Secure tag written successfully');
//     } catch (error) {
//       console.error('❌ Failed to write secure tag:', error);
//       throw error;
//     }
//   }

//   /**
//    * Read and verify a secure NFC tag
//    */
//   async readSecureTag(location?: string): Promise<{
//     tagData: any;
//     securityResult: {
//       isValid: boolean;
//       isExpired: boolean;
//       shouldBlock: boolean;
//       events: any[];
//     };
//     accessGranted: boolean;
//   }> {
//     try {
//       console.log('🔍 Reading secure NFC tag...');
      
//       // Read the tag using existing manager
//       const tagData = await nfcManager.readNFCTag();
      
//       console.log('📖 Tag data read:', tagData);
      
//       // Verify security for each record
//       let overallValid = false;
//       let overallShouldBlock = false;
//       let allEvents: any[] = [];
      
//       for (const record of tagData.ndefRecords) {
//         if (record.payload && record.payload.includes('SIG:')) {
//           console.log('🔐 Verifying signature...');
          
//           const securityResult = await this.securityManager.verifySignedTag(
//             record.payload,
//             tagData.id,
//             location
//           );
          
//           console.log('🛡️ Security verification result:', securityResult);
          
//           if (securityResult.isValid && !securityResult.isExpired) {
//             overallValid = true;
//           }
          
//           if (securityResult.shouldBlock) {
//             overallShouldBlock = true;
//           }
          
//           allEvents.push(...securityResult.securityEvents);
//         }
//       }
      
//       const accessGranted = overallValid && !overallShouldBlock;
      
//       console.log(`🎯 Access decision: ${accessGranted ? 'GRANTED' : 'DENIED'}`);
      
//       return {
//         tagData,
//         securityResult: {
//           isValid: overallValid,
//           isExpired: false,
//           shouldBlock: overallShouldBlock,
//           events: allEvents
//         },
//         accessGranted
//       };
      
//     } catch (error) {
//       console.error('❌ Failed to read secure tag:', error);
//       throw error;
//     }
//   }

//   /**
//    * Demonstrate security features
//    */
//   async demonstrateSecurity(): Promise<{
//     vulnerableClone: boolean;
//     secureClone: boolean;
//     behavioralDetection: boolean;
//   }> {
//     try {
//       console.log('🧪 Starting security demonstration...');
      
//       // Test 1: Try to clone a vulnerable tag
//       console.log('📝 Test 1: Vulnerable tag cloning');
//       await nfcManager.writeNFCTag(['ACCESS:ADMIN|USER:VulnerableUser']);
//       const vulnerableTag = await nfcManager.readNFCTag();
//       const vulnerableClone = vulnerableTag.ndefRecords.length > 0;
//       console.log(`🔓 Vulnerable clone success: ${vulnerableClone}`);
      
//       // Test 2: Try to clone a secure tag
//       console.log('📝 Test 2: Secure tag cloning');
//       await this.writeSecureTag('ACCESS:ADMIN|USER:SecureUser', 'Building A');
//       const secureRead = await this.readSecureTag('Building A');
//       const secureClone = secureRead.accessGranted;
//       console.log(`🔒 Secure access granted: ${secureClone}`);
      
//       // Test 3: Behavioral detection
//       console.log('📝 Test 3: Behavioral anomaly detection');
//       // Simulate rapid access attempts
//       for (let i = 0; i < 5; i++) {
//         await this.securityManager.recordAccess('TEST_TAG_123', 'Test Location');
//       }
      
//       const pattern = this.securityManager.getAccessPattern('TEST_TAG_123');
//       const behavioralDetection = pattern ? pattern.times.length >= 5 : false;
//       console.log(`🧠 Behavioral detection working: ${behavioralDetection}`);
      
//       return {
//         vulnerableClone,
//         secureClone,
//         behavioralDetection
//       };
      
//     } catch (error) {
//       console.error('❌ Security demonstration failed:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get security analytics
//    */
//   getSecurityAnalytics(): {
//     recentEvents: any[];
//     patterns: { [tagId: string]: any };
//     config: SecurityConfig;
//   } {
//     const events = this.securityManager.getRecentSecurityEvents(20);
//     const config = this.securityManager.getConfig();
    
//     // Get all patterns (simplified for demo)
//     const patterns: { [tagId: string]: any } = {};
//     // Note: In real implementation, you'd iterate through stored patterns
    
//     return {
//       recentEvents: events,
//       patterns,
//       config
//     };
//   }

//   /**
//    * Clear security data
//    */
//   async clearSecurityData(): Promise<void> {
//     await this.securityManager.clearSecurityData();
//   }

//   /**
//    * Update security configuration
//    */
//   updateSecurityConfig(newConfig: Partial<SecurityConfig>): void {
//     this.securityManager.updateConfig(newConfig);
//   }
// }

// // Export singleton instance
// export const secureNFCManager = new SecureNFCManager();










import * as SecureStore from 'expo-secure-store';
import { ThreatReport, NFCAccessLog } from './types';

export class LoggingManager {
  private readonly ACCESS_LOGS_KEY = 'nfc_access_logs';
  private readonly THREAT_REPORTS_KEY = 'threat_reports';
  private readonly MAX_LOGS = 100;
  private readonly MAX_THREATS = 50;

  async logNFCAccess(log: NFCAccessLog): Promise<void> {
    try {
      const existingLogs = await this.getAccessLogs();
      existingLogs.unshift(log);
      
      // Keep only the latest logs
      if (existingLogs.length > this.MAX_LOGS) {
        existingLogs.splice(this.MAX_LOGS);
      }

      await SecureStore.setItemAsync(this.ACCESS_LOGS_KEY, JSON.stringify(existingLogs));
    } catch (error) {
      console.warn('Failed to log NFC access:', error);
    }
  }

  async logThreatReport(report: ThreatReport): Promise<void> {
    try {
      const existingReports = await this.getThreatReports();
      existingReports.unshift(report);
      
      // Keep only the latest threats
      if (existingReports.length > this.MAX_THREATS) {
        existingReports.splice(this.MAX_THREATS);
      }

      await SecureStore.setItemAsync(this.THREAT_REPORTS_KEY, JSON.stringify(existingReports));
    } catch (error) {
      console.warn('Failed to log threat report:', error);
    }
  }

  async getAccessLogs(): Promise<NFCAccessLog[]> {
    try {
      const logsJson = await SecureStore.getItemAsync(this.ACCESS_LOGS_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      console.warn('Failed to get access logs:', error);
      return [];
    }
  }

  async getThreatReports(): Promise<ThreatReport[]> {
    try {
      const reportsJson = await SecureStore.getItemAsync(this.THREAT_REPORTS_KEY);
      return reportsJson ? JSON.parse(reportsJson) : [];
    } catch (error) {
      console.warn('Failed to get threat reports:', error);
      return [];
    }
  }

  async clearAccessLogs(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.ACCESS_LOGS_KEY);
    } catch (error) {
      console.warn('Failed to clear access logs:', error);
    }
  }

  async clearThreatReports(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.THREAT_REPORTS_KEY);
    } catch (error) {
      console.warn('Failed to clear threat reports:', error);
    }
  }
}