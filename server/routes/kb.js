const express = require('express');
const router = express.Router();
const kbApi = require('../services/kbApi');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

router.post('/sync/:accountNumber', async (req, res) => {
  try {
    const { accountNumber } = req.params;
    
    const account = await Account.findOne({ accountNumber });
    if (!account) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다.' });
    }

    const syncData = await kbApi.syncAccountData(accountNumber);

    account.balance = syncData.balance.balance || account.balance;
    account.lastSyncDate = new Date();
    await account.save();

    if (syncData.transactions && syncData.transactions.transaction_list) {
      for (const tx of syncData.transactions.transaction_list) {
        await Transaction.findOneAndUpdate(
          { transactionId: tx.transaction_id },
          {
            accountNumber: accountNumber,
            transactionId: tx.transaction_id,
            transactionDate: new Date(tx.transaction_date),
            transactionType: tx.transaction_type === '1' ? '입금' : '출금',
            amount: tx.amount,
            balanceAfter: tx.balance_after,
            description: tx.description || '',
            counterparty: tx.counterparty || '',
          },
          { upsert: true, new: true }
        );
      }
    }

    res.json({
      success: true,
      message: '동기화가 완료되었습니다.',
      account: account,
      transactionCount: syncData.transactions?.transaction_list?.length || 0,
    });
  } catch (error) {
    console.error('동기화 오류:', error);
    res.status(500).json({ error: '동기화 중 오류가 발생했습니다.', details: error.message });
  }
});

router.get('/accounts', async (req, res) => {
  try {
    const accessToken = await kbApi.getAccessToken();
    const accounts = await kbApi.getAccountList(accessToken);
    res.json(accounts);
  } catch (error) {
    console.error('계좌 목록 조회 오류:', error);
    res.status(500).json({ error: '계좌 목록을 가져오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
