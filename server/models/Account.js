const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    unique: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  bankCode: {
    type: String,
    default: '004', // KB은행 코드
  },
  bankName: {
    type: String,
    default: 'KB국민은행',
  },
  balance: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'KRW',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastSyncDate: {
    type: Date,
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

module.exports = mongoose.model('Account', AccountSchema);
