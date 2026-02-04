const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    index: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  transactionDate: {
    type: Date,
    required: true,
    index: true,
  },
  transactionType: {
    type: String,
    enum: ['입금', '출금', '이체'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  counterparty: {
    type: String,
  },
  category: {
    type: String,
    enum: ['급여', '후원금', '운영비', '시설비', '기타', '미분류'],
    default: '미분류',
  },
  isBudgetRelated: {
    type: Boolean,
    default: false,
  },
  budgetCategory: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
