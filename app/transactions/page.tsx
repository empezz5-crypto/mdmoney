'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Transaction {
  _id: string;
  accountNumber: string;
  transactionDate: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description: string;
  category: string;
  counterparty?: string;
}

interface Account {
  _id: string;
  accountNumber: string;
  accountName: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    accountNumber: '',
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    transactionType: '',
  });

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.accountNumber) params.append('accountNumber', filters.accountNumber);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.category) params.append('category', filters.category);
      if (filters.transactionType) params.append('transactionType', filters.transactionType);

      const response = await fetch(`${API_URL}/api/transactions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        setError('거래내역을 불러오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('거래내역을 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleApplyFilters = () => {
    fetchTransactions();
  };

  const handleCategoryChange = async (transactionId: string, category: string) => {
    try {
      const response = await fetch(`${API_URL}/api/transactions/${transactionId}/category`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category }),
      });

      if (response.ok) {
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const getAccountName = (accountNumber: string) => {
    const account = accounts.find((acc) => acc.accountNumber === accountNumber);
    return account ? account.accountName : accountNumber;
  };

  if (loading && transactions.length === 0) {
    return (
      <div>
        <div className="navbar">
          <div className="container">
            <h1>예산 및 자금흐름 관리 시스템</h1>
            <nav>
              <Link href="/">대시보드</Link>
              <Link href="/accounts">계좌 관리</Link>
              <Link href="/transactions">거래내역</Link>
              <Link href="/budget">예산 관리</Link>
            </nav>
          </div>
        </div>
        <div className="container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="navbar">
        <div className="container">
          <h1>예산 및 자금흐름 관리 시스템</h1>
          <nav>
            <Link href="/">대시보드</Link>
            <Link href="/accounts">계좌 관리</Link>
            <Link href="/transactions">거래내역</Link>
            <Link href="/budget">예산 관리</Link>
          </nav>
        </div>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}

        <div className="card">
          <h2>거래내역</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>계좌</label>
              <select
                className="input"
                value={filters.accountNumber}
                onChange={(e) => handleFilterChange('accountNumber', e.target.value)}
              >
                <option value="">전체</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account.accountNumber}>
                    {account.accountName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>시작일</label>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>종료일</label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>카테고리</label>
              <select
                className="input"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">전체</option>
                <option value="급여">급여</option>
                <option value="후원금">후원금</option>
                <option value="운영비">운영비</option>
                <option value="시설비">시설비</option>
                <option value="기타">기타</option>
                <option value="미분류">미분류</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>거래유형</label>
              <select
                className="input"
                value={filters.transactionType}
                onChange={(e) => handleFilterChange('transactionType', e.target.value)}
              >
                <option value="">전체</option>
                <option value="입금">입금</option>
                <option value="출금">출금</option>
                <option value="이체">이체</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleApplyFilters} style={{ width: '100%' }}>
                검색
              </button>
            </div>
          </div>

          {transactions.length === 0 ? (
            <p>거래내역이 없습니다.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>계좌</th>
                  <th>유형</th>
                  <th>금액</th>
                  <th>잔액</th>
                  <th>설명</th>
                  <th>카테고리</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>{format(new Date(transaction.transactionDate), 'yyyy-MM-dd HH:mm')}</td>
                    <td>{getAccountName(transaction.accountNumber)}</td>
                    <td>{transaction.transactionType}</td>
                    <td style={{ color: transaction.transactionType === '입금' ? '#28a745' : '#dc3545' }}>
                      {transaction.transactionType === '입금' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td>{formatCurrency(transaction.balanceAfter)}</td>
                    <td>{transaction.description || '-'}</td>
                    <td>
                      <select
                        value={transaction.category}
                        onChange={(e) => handleCategoryChange(transaction._id, e.target.value)}
                        style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      >
                        <option value="미분류">미분류</option>
                        <option value="급여">급여</option>
                        <option value="후원금">후원금</option>
                        <option value="운영비">운영비</option>
                        <option value="시설비">시설비</option>
                        <option value="기타">기타</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
