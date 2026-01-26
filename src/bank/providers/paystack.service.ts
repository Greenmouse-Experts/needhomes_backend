import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly axios: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const baseUrl = process.env.PAYSTACK_BASE_URL;

    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is not set');
    }

    if (!baseUrl) {
      throw new Error('PAYSTACK_BASE_URL is not set');
    }

    this.baseUrl = baseUrl;

    this.axios = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.logger.log('Paystack service initialized');
  }

  async fetchAllBanks(country = 'Nigeria') {
    try {
      const { data } = await this.axios.get('/bank', {
        params: { country },
      });

      // Paystack returns { status, message, data: [banks...] }
      if (data && Array.isArray(data.data)) {
        this.logger.log(`Fetched ${data.data.length} banks from Paystack`);
        return data.data;
      }

      if (Array.isArray(data)) {
        this.logger.log(`Fetched ${data.length} banks from Paystack (array response)`);
        return data;
      }

      this.logger.warn('Unexpected Paystack banks response shape', JSON.stringify(data));
      return [];
    } catch (error: any) {
      this.logger.error(
        'Failed fetching banks from Paystack',
        error?.response?.data || error?.message,
      );
      throw error;
    }
  }

  
 async resolveAccount(
  accountNumber: string,
  bankCode: string,
) {
  try {
    const { data } = await this.axios.get('/bank/resolve', {
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
    });

    return data;
  } catch (error: any) {
    this.logger.error(
      'Failed to resolve bank account',
      error?.response?.data || error?.message,
    );
    throw error;
  }
}

}
