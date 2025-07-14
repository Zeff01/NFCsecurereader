// lib/nfc/logging-manager.ts
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