'use client';

import { useEffect } from 'react';
import { initFirebaseAnalytics } from './lib/firebaseClient';

export default function AnalyticsInit() {
  useEffect(() => {
    void initFirebaseAnalytics();
  }, []);

  return null;
}
