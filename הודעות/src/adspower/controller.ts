import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

interface AdsPowerBrowserInfo {
  ws: { puppeteer: string };
  webdriver: string;
}

interface AdsPowerResponse {
  code: number;
  msg: string;
  data: AdsPowerBrowserInfo;
}

export class AdsPowerController {
  private apiUrl: string;
  private apiKey: string;
  private client: AxiosInstance;

  constructor() {
    this.apiUrl = config.adspower.apiUrl;
    this.apiKey = config.adspower.apiKey;
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: this.apiKey ? { 'api-key': this.apiKey } : {},
    });
  }

  async checkStatus(): Promise<boolean> {
    try {
      const response = await this.client.get('/status');
      return response.data.code === 0;
    } catch (error) {
      logger.error('AdsPower API not available', error);
      return false;
    }
  }

  async openProfile(userId: string): Promise<AdsPowerBrowserInfo | null> {
    try {
      const response = await this.client.get<AdsPowerResponse>(
        '/api/v1/browser/start',
        { params: { user_id: userId } }
      );

      if (response.data.code === 0) {
        logger.info(`Profile ${userId} opened successfully`);
        return response.data.data;
      }

      if (response.data.msg && response.data.msg.includes('already')) {
        return await this.getActiveProfile(userId);
      }

      logger.error(`Failed to open profile ${userId}: ${response.data.msg}`);
      return null;
    } catch (error) {
      logger.error(`Error opening profile ${userId}`, error);
      return null;
    }
  }

  async getActiveProfile(userId: string): Promise<AdsPowerBrowserInfo | null> {
    try {
      const response = await this.client.get<AdsPowerResponse>(
        '/api/v1/browser/active',
        { params: { user_id: userId } }
      );
      if (response.data.code === 0) return response.data.data;
      return null;
    } catch (error) {
      return null;
    }
  }

  async isProfileOpen(userId: string): Promise<boolean> {
    const active = await this.getActiveProfile(userId);
    return active !== null;
  }

  async closeProfile(userId: string): Promise<boolean> {
    try {
      const response = await this.client.get(
        '/api/v1/browser/stop',
        { params: { user_id: userId } }
      );
      if (response.data.code === 0) {
        logger.info(`Profile ${userId} closed`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error closing profile ${userId}`, error);
      return false;
    }
  }
}
