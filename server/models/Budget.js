const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    index: true,
  },
  month: {
    type: Number,
    required: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['급여', '후원금', '운영비', '시설비', '기타'],
  },
  budgetedAmount: {
    type: Number,
    required: true,
  },
  spentAmount: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

BudgetSchema.index({ year: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
