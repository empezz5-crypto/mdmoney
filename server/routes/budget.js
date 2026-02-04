const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    const query = {};
    
    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);

    const budgets = await Budget.find(query).sort({ year: -1, month: -1, category: 1 });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: '예산 목록을 가져오는 중 오류가 발생했습니다.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const budget = new Budget(req.body);
    await budget.save();
    res.status(201).json(budget);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: '이미 등록된 예산입니다.' });
    }
    res.status(500).json({ error: '예산 등록 중 오류가 발생했습니다.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!budget) {
      return res.status(404).json({ error: '예산을 찾을 수 없습니다.' });
    }
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: '예산 업데이트 중 오류가 발생했습니다.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: '예산을 찾을 수 없습니다.' });
    }
    res.json({ message: '예산이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '예산 삭제 중 오류가 발생했습니다.' });
  }
});

router.get('/analysis', async (req, res) => {
  try {
    const { year, month } = req.query;
    const yearNum = parseInt(year) || new Date().getFullYear();
    const monthNum = parseInt(month) || new Date().getMonth() + 1;

    const budgets = await Budget.find({ year: yearNum, month: monthNum });
    
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      transactionDate: { $gte: startDate, $lte: endDate },
    });

    const analysis = budgets.map(budget => {
      const categoryTransactions = transactions.filter(
        tx => tx.category === budget.category && tx.transactionType === '출금'
      );
      const spentAmount = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      return {
        ...budget.toObject(),
        spentAmount,
        remainingAmount: budget.budgetedAmount - spentAmount,
        usageRate: (spentAmount / budget.budgetedAmount) * 100,
        transactionCount: categoryTransactions.length,
      };
    });

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: '예산 분석 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
