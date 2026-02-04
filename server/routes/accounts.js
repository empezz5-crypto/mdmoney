const express = require('express');
const router = express.Router();
const Account = require('../models/Account');

router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: '계좌 목록을 가져오는 중 오류가 발생했습니다.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다.' });
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: '계좌를 가져오는 중 오류가 발생했습니다.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const account = new Account(req.body);
    await account.save();
    res.status(201).json(account);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: '이미 등록된 계좌번호입니다.' });
    }
    res.status(500).json({ error: '계좌 등록 중 오류가 발생했습니다.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!account) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다.' });
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: '계좌 업데이트 중 오류가 발생했습니다.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!account) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다.' });
    }
    res.json({ message: '계좌가 비활성화되었습니다.', account });
  } catch (error) {
    res.status(500).json({ error: '계좌 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
