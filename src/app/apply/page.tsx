'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function ApplyPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/manage/issue'); }, [router]);
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Redirecting to Issue Bond...</div>
    </div>
  );
}
