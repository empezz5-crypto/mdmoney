const axios = require('axios');

class KBApiService {
  constructor() {
    this.baseURL = process.env.KB_API_BASE_URL || 'https://openapi.kbstar.com';
    this.apiKey = process.env.KB_API_KEY;
    this.clientId = process.env.KB_CLIENT_ID;
    this.clientSecret = process.env.KB_CLIENT_SECRET;
  }

  async getAccessToken() {
    try {
      const response = await axios.post(
        `${this.baseURL}/oauth/2.0/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data.access_token;
    } catch (error) {
      console.error('KB API 토큰 발급 실패:', error);
      throw error;
    }
  }

  async getAccountList(accessToken) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/account/list`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('계좌 목록 조회 실패:', error);
      throw error;
    }
  }

  async getAccountBalance(accessToken, accountNumber) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/account/balance`,
        {
          params: {
            account_no: accountNumber,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('계좌 잔액 조회 실패:', error);
      throw error;
    }
  }

  async getTransactionHistory(accessToken, accountNumber, startDate, endDate) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/account/transaction`,
        {
          params: {
            account_no: accountNumber,
            start_date: startDate,
            end_date: endDate,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('거래내역 조회 실패:', error);
      throw error;
    }
  }

  async syncAccountData(accountNumber) {
    try {
      const accessToken = await this.getAccessToken();
      const balanceData = await this.getAccountBalance(accessToken, accountNumber);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const transactionData = await this.getTransactionHistory(accessToken, accountNumber, startDate, endDate);

      return {
        balance: balanceData,
        transactions: transactionData,
      };
    } catch (error) {
      console.error('계좌 데이터 동기화 실패:', error);
      throw error;
    }
  }
}

module.exports = new KBApiService();
