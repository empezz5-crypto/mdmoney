'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Budget {
  _id: string;
  year: number;
  month: number;
  category: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usageRate: number;
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    category: '',
    budgetedAmount: 0,
    description: '',
  });

  useEffect(() => {
    fetchBudgets();
  }, [selectedYear, selectedMonth]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/budget/analysis?year=${selectedYear}&month=${selectedMonth}`);
      if (response.ok) {
        const data = await response.json();
        setBudgets(data);
      } else {
        setError('예산 정보를 불러오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('예산 정보를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/budget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('예산이 등록되었습니다.');
        setShowForm(false);
        setFormData({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          category: '',
          budgetedAmount: 0,
          description: '',
        });
        fetchBudgets();
      } else {
        const data = await response.json();
        setError(data.error || '예산 등록 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('예산 등록 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const chartData = budgets.map((budget) => ({
    category: budget.category,
    예산: budget.budgetedAmount,
    지출: budget.spentAmount,
    잔여: budget.remainingAmount,
  }));

  if (loading && budgets.length === 0) {
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h2>예산 관리</h2>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ marginRight: '8px', fontWeight: '600' }}>년도:</label>
                <input
                  type="number"
                  className="input"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ width: '100px' }}
                />
              </div>
              <div>
                <label style={{ marginRight: '8px', fontWeight: '600' }}>월:</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max="12"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{ width: '80px' }}
                />
              </div>
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? '취소' : '예산 등록'}
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>년도</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>월</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="12"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>카테고리</label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">선택하세요</option>
                    <option value="급여">급여</option>
                    <option value="후원금">후원금</option>
                    <option value="운영비">운영비</option>
                    <option value="시설비">시설비</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>예산 금액</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.budgetedAmount}
                    onChange={(e) => setFormData({ ...formData, budgetedAmount: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>설명</label>
                <input
                  type="text"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">등록</button>
            </form>
          )}

          {budgets.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '16px' }}>예산 대비 지출 현황</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="예산" fill="#667eea" />
                  <Bar dataKey="지출" fill="#f5576c" />
                  <Bar dataKey="잔여" fill="#38ef7d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {budgets.length === 0 ? (
            <p>등록된 예산이 없습니다.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>카테고리</th>
                  <th>예산</th>
                  <th>지출</th>
                  <th>잔여</th>
                  <th>사용률</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr key={budget._id}>
                    <td>{budget.category}</td>
                    <td>{formatCurrency(budget.budgetedAmount)}</td>
                    <td>{formatCurrency(budget.spentAmount)}</td>
                    <td style={{ color: budget.remainingAmount < 0 ? '#dc3545' : '#28a745' }}>
                      {formatCurrency(budget.remainingAmount)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '20px', backgroundColor: '#e9ecef', borderRadius: '10px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(budget.usageRate, 100)}%`,
                              height: '100%',
                              backgroundColor: budget.usageRate > 100 ? '#dc3545' : budget.usageRate > 80 ? '#ffc107' : '#28a745',
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                        <span style={{ minWidth: '50px', textAlign: 'right' }}>{budget.usageRate.toFixed(1)}%</span>
                      </div>
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
