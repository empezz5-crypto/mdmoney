'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Account {
  _id: string;
  accountNumber: string;
  accountName: string;
  balance: number;
  bankName: string;
  lastSyncDate?: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountName: '',
    bankName: 'KB국민은행',
  });
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      } else {
        setError('계좌 목록을 불러오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('계좌 목록을 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('계좌가 등록되었습니다.');
        setShowForm(false);
        setFormData({ accountNumber: '', accountName: '', bankName: 'KB국민은행' });
        fetchAccounts();
      } else {
        const data = await response.json();
        setError(data.error || '계좌 등록 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('계좌 등록 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  const handleSync = async (accountNumber: string) => {
    try {
      setSyncing(accountNumber);
      setError(null);
      const response = await fetch(`${API_URL}/api/kb/sync/${accountNumber}`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess('동기화가 완료되었습니다.');
        fetchAccounts();
      } else {
        const data = await response.json();
        setError(data.error || '동기화 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('동기화 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setSyncing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  if (loading) {
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
        {success && <div className="success-message">{success}</div>}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>계좌 관리</h2>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? '취소' : '계좌 등록'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>계좌번호</label>
                <input
                  type="text"
                  className="input"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>계좌명</label>
                <input
                  type="text"
                  className="input"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>은행명</label>
                <input
                  type="text"
                  className="input"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">등록</button>
            </form>
          )}

          {accounts.length === 0 ? (
            <p>등록된 계좌가 없습니다.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>계좌명</th>
                  <th>계좌번호</th>
                  <th>은행</th>
                  <th>잔액</th>
                  <th>마지막 동기화</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account._id}>
                    <td>{account.accountName}</td>
                    <td>{account.accountNumber}</td>
                    <td>{account.bankName}</td>
                    <td>{formatCurrency(account.balance)}</td>
                    <td>
                      {account.lastSyncDate
                        ? format(new Date(account.lastSyncDate), 'yyyy-MM-dd HH:mm')
                        : '동기화 안됨'}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleSync(account.accountNumber)}
                        disabled={syncing === account.accountNumber}
                      >
                        {syncing === account.accountNumber ? '동기화 중...' : '동기화'}
                      </button>
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
