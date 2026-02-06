'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ShortItem {
  id: string;
  topic: string;
  subtopic: string;
  hook?: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  youtubeUrl?: string;
}

interface PushSchedule {
  enabled: boolean;
  time: string;
  title: string;
  body: string;
  timezone?: string;
  lastSentOn?: string | null;
}

const statusOptions = [
  { value: 'idea', label: '아이디어' },
  { value: 'script', label: '스크립트' },
  { value: 'edit', label: '편집' },
  { value: 'scheduled', label: '예약' },
  { value: 'uploaded', label: '업로드' },
  { value: 'published', label: '발행' },
  { value: 'failed', label: '보류' },
];

function toLocalDate(value: string) {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return value;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notificationState, setNotificationState] = useState<'idle' | 'ready' | 'blocked'>('idle');
  const [schedule, setSchedule] = useState<PushSchedule>({
    enabled: false,
    time: '09:00',
    title: '숏츠 체크인',
    body: '오늘 숏츠 상태를 업데이트해 주세요.',
    timezone:
      typeof window !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC',
  });

  const [form, setForm] = useState({
    topic: '',
    subtopic: '',
    hook: '',
    notes: '',
  });
  const [keyword, setKeyword] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const metrics = useMemo(() => {
    const total = shorts.length;
    const published = shorts.filter((item) => item.status === 'published').length;
    const inProgress = shorts.filter((item) => ['script', 'edit', 'scheduled', 'uploaded'].includes(item.status)).length;
    return { total, published, inProgress };
  }, [shorts]);

  useEffect(() => {
    if (status === 'authenticated') {
      void Promise.all([fetchShorts(), fetchSchedule(), checkNotificationReady()]);
    }
  }, [status]);

  async function fetchShorts() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/shorts`);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setShorts(data);
    } catch {
      setError('숏츠 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedule() {
    try {
      const res = await fetch(`${API_URL}/push/schedule`);
      if (!res.ok) return;
      const data = await res.json();
      const fallbackTimezone =
        typeof window !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : 'UTC';
      setSchedule((prev) => ({
        ...prev,
        ...data,
        timezone: data.timezone || prev.timezone || fallbackTimezone,
      }));
    } catch {
      // ignore
    }
  }

  async function checkNotificationReady() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'granted') {
      setNotificationState('ready');
      return;
    }
    if (Notification.permission === 'denied') {
      setNotificationState('blocked');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.topic.trim() || !form.subtopic.trim()) {
      setError('주제와 하위 주제를 모두 입력해 주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/n8n/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic.trim(),
          subtopic: form.subtopic.trim(),
          hook: form.hook.trim(),
          notes: form.notes.trim(),
        }),
      });

      if (!res.ok) throw new Error('failed');

      setSuccess('n8n에 전송했어요. 새로운 숏츠가 트래커에 추가되었습니다.');
      setForm({ topic: '', subtopic: '', hook: '', notes: '' });
      await fetchShorts();
    } catch {
      setError('n8n 전송에 실패했어요. 웹훅 주소를 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAutoFill() {
    setError(null);
    setSuccess(null);
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setForm({
        topic: data.topic || '',
        subtopic: data.subtopic || '',
        hook: data.hook || '',
        notes: data.notes || '',
      });
      setSuccess('최신 트렌드 기반으로 자동 입력했어요.');
    } catch {
      setError('AI 자동 입력에 실패했어요. 키 설정을 확인해 주세요.');
    } finally {
      setAiLoading(false);
    }
  }

  async function updateShort(id: string, payload: Partial<ShortItem>) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_URL}/shorts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('failed');
      await fetchShorts();
      setSuccess('상태를 업데이트했어요.');
    } catch {
      setError('상태 업데이트에 실패했어요.');
    }
  }

  async function requestNotificationPermission() {
    setError(null);
    setSuccess(null);

    if (!('serviceWorker' in navigator)) {
      setError('이 브라우저는 푸시 알림을 지원하지 않아요.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setNotificationState('blocked');
      setError('알림 권한이 필요해요. 브라우저 설정을 확인해 주세요.');
      return;
    }

    try {
      const publicKeyRes = await fetch(`${API_URL}/push/public-key`);
      if (!publicKeyRes.ok) throw new Error('key');
      const { publicKey } = await publicKeyRes.json();

      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();

      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const res = await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (!res.ok) throw new Error('subscribe');
      setNotificationState('ready');
      setSuccess('알림 설정이 완료되었어요.');
    } catch {
      setError('알림 설정에 실패했어요.');
    }
  }

  async function saveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/push/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...schedule,
          timezone:
            schedule.timezone ||
            (typeof window !== 'undefined'
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : 'UTC'),
        }),
      });
      if (!res.ok) throw new Error('failed');
      setSuccess('알림 시간이 저장되었어요.');
      await fetchSchedule();
    } catch {
      setError('알림 시간 저장에 실패했어요.');
    }
  }

  if (status === 'loading') {
    return (
      <div className="page">
        <div className="shell">
          <div className="loading">로그인 상태를 확인하고 있어요...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page">
        <div className="shell signin">
          <div className="brand">
            <p className="eyebrow">Private Studio</p>
            <h1>나만의 숏츠 제작 워크스테이션</h1>
            <p>Google 계정으로 로그인해 나만 접근 가능한 대시보드를 열어요.</p>
          </div>
          <button className="btn primary" onClick={() => signIn('google')}>
            Google로 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="shell">
          <div>
            <p className="eyebrow">Shorts Mission Control</p>
            <h1>유튜브 숏츠 제작부터 업로드까지 한 곳에서</h1>
            <p className="subtitle">
              주제 입력 → n8n 자동화 → 진행 상태 → 모바일 알림까지 한 번에 관리하세요.
            </p>
          </div>
          <div className="hero-actions">
            <div className="profile">
              <span>{session.user?.email}</span>
              <button className="btn ghost" onClick={() => signOut()}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="shell">
        {(error || success) && (
          <div className={`notice ${error ? 'error' : 'success'}`}>
            {error ?? success}
          </div>
        )}

        <section className="metrics">
          <div className="metric-card">
            <p>전체 숏츠</p>
            <strong>{metrics.total}</strong>
          </div>
          <div className="metric-card">
            <p>진행 중</p>
            <strong>{metrics.inProgress}</strong>
          </div>
          <div className="metric-card">
            <p>발행 완료</p>
            <strong>{metrics.published}</strong>
          </div>
        </section>

        <section className="grid">
          <div className="panel">
            <h2>n8n 자동화 요청</h2>
            <p className="panel-desc">주제와 하위 주제를 입력하면 n8n 웹훅으로 전송돼요.</p>
            <form onSubmit={handleSubmit} className="form">
              <label>
                참고 키워드 (선택)
                <input
                  className="input"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 부동산, 경제, 생산성"
                />
              </label>
              <label>
                주제
                <input
                  className="input"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="예: 3초 안에 집중 끌기"
                />
              </label>
              <label>
                하위 주제
                <input
                  className="input"
                  value={form.subtopic}
                  onChange={(e) => setForm({ ...form, subtopic: e.target.value })}
                  placeholder="예: 오프닝 멘트 5가지"
                />
              </label>
              <label>
                후킹 아이디어
                <input
                  className="input"
                  value={form.hook}
                  onChange={(e) => setForm({ ...form, hook: e.target.value })}
                  placeholder="예: 절대 하지 말아야 할 한 마디"
                />
              </label>
              <label>
                추가 메모
                <textarea
                  className="input textarea"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="톤, 참고 채널, 길이 등"
                />
              </label>
              <div className="inline-actions">
                <button className="btn ghost" type="button" onClick={handleAutoFill} disabled={aiLoading}>
                  {aiLoading ? 'AI 생성 중...' : 'AI 자동 입력'}
                </button>
                <button className="btn primary" type="submit" disabled={submitting}>
                  {submitting ? '전송 중...' : 'n8n에 전송하기'}
                </button>
              </div>
            </form>
          </div>

          <div className="panel">
            <h2>모바일 알림 설정</h2>
            <p className="panel-desc">원하는 시간에 진행 상황 체크 알림을 받을 수 있어요.</p>
            <div className="push-actions">
              <button
                className={`btn ${notificationState === 'ready' ? 'ghost' : 'primary'}`}
                onClick={requestNotificationPermission}
              >
                {notificationState === 'ready' ? '알림 준비 완료' : '알림 허용하기'}
              </button>
              {notificationState === 'blocked' && (
                <span className="helper">브라우저 설정에서 알림을 허용해 주세요.</span>
              )}
            </div>
            <form onSubmit={saveSchedule} className="form inline">
              <label>
                알림 시간
                <input
                  className="input"
                  type="time"
                  value={schedule.time}
                  onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                />
              </label>
              <label>
                알림 제목
                <input
                  className="input"
                  value={schedule.title}
                  onChange={(e) => setSchedule({ ...schedule, title: e.target.value })}
                />
              </label>
              <label>
                알림 메시지
                <input
                  className="input"
                  value={schedule.body}
                  onChange={(e) => setSchedule({ ...schedule, body: e.target.value })}
                />
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
                />
                알림 활성화
              </label>
              <button className="btn primary" type="submit">
                알림 저장
              </button>
              {schedule.lastSentOn && (
                <span className="helper">마지막 발송: {schedule.lastSentOn}</span>
              )}
            </form>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>업로드 상태 모니터링</h2>
              <p className="panel-desc">숏츠의 진행 단계를 손쉽게 업데이트하세요.</p>
            </div>
          </div>
          {loading ? (
            <div className="loading">숏츠 목록을 불러오는 중...</div>
          ) : shorts.length === 0 ? (
            <div className="empty">아직 등록된 숏츠가 없어요.</div>
          ) : (
            <div className="shorts-list">
              {shorts.map((item) => (
                <div key={item.id} className="short-card">
                  <div className="short-main">
                    <div>
                      <h3>{item.topic}</h3>
                      <p className="short-sub">{item.subtopic}</p>
                    </div>
                    <span className={`pill ${item.status}`}>{statusOptions.find((opt) => opt.value === item.status)?.label}</span>
                  </div>
                  <div className="short-meta">
                    <span>요청: {toLocalDate(item.createdAt)}</span>
                    <span>업데이트: {toLocalDate(item.updatedAt)}</span>
                  </div>
                  <div className="short-controls">
                    <select
                      className="input"
                      value={item.status}
                      onChange={(e) => updateShort(item.id, { status: e.target.value })}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      placeholder="유튜브 링크 입력"
                      value={item.youtubeUrl ?? ''}
                      onChange={(e) => updateShort(item.id, { youtubeUrl: e.target.value })}
                    />
                  </div>
                  {item.hook && <p className="short-note">후킹: {item.hook}</p>}
                  {item.notes && <p className="short-note">메모: {item.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
