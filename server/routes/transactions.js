const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

router.get('/', async (req, res) => {
  try {
    const { accountNumber, startDate, endDate, category, transactionType } = req.query;
    const query = {};

    if (accountNumber) query.accountNumber = accountNumber;
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }
    if (category) query.category = category;
    if (transactionType) query.transactionType = transactionType;

    const transactions = await Transaction.find(query)
      .sort({ transactionDate: -1 })
      .limit(1000);
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: '거래내역을 가져오는 중 오류가 발생했습니다.' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchQuery = {};
    
    if (startDate || endDate) {
      matchQuery.transactionDate = {};
      if (startDate) matchQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) matchQuery.transactionDate.$lte = new Date(endDate);
    }

    const summary = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            category: '$category',
            type: '$transactionType',
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: '요약 정보를 가져오는 중 오류가 발생했습니다.' });
  }
});

router.put('/:id/category', async (req, res) => {
  try {
    const { category } = req.body;
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { category },
      { new: true }
    );
    if (!transaction) {
      return res.status(404).json({ error: '거래내역을 찾을 수 없습니다.' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: '카테고리 업데이트 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
