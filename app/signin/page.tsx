'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
  return (
    <div className="page">
      <div className="shell signin">
        <div className="brand">
          <p className="eyebrow">Private Studio</p>
          <h1>내 계정으로만 접속하는 숏츠 대시보드</h1>
          <p>Google 로그인 후 접속할 수 있어요.</p>
        </div>
        <button className="btn primary" onClick={() => signIn('google')}>
          Google로 로그인
        </button>
      </div>
    </div>
  );
}
