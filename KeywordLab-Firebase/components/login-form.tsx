 'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth, apiFetch } from '@/lib/firebase/client';
import { LockKeyhole, ArrowRight, ChartNoAxesCombined } from 'lucide-react';
export default function LoginForm(){
  const [email,setEmail]=useState(''), [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try {
      await signInWithEmailAndPassword(firebaseAuth,email.trim(),password);
      const check=await apiFetch('/api/history');
      if(!check.ok){await signOut(firebaseAuth);throw new Error('등록되지 않았거나 비활성화된 이메일입니다. 관리자에게 문의하세요.');}
      window.location.assign('/');
    } catch(err){
      setError(err instanceof Error && err.message.startsWith('등록되지') ? err.message : '로그인에 실패했습니다. 이메일·비밀번호와 이용 승인을 확인하세요.');
    } finally{setBusy(false);}
  }
  return <main className="auth-bg"><div className="auth-card"><div className="brand-mark"><ChartNoAxesCombined size={26}/></div><div className="eyebrow">PRIVATE KEYWORD WORKSPACE</div><h1>My Keyword Lab</h1><p>승인된 이메일로 로그인해 키워드를 분석하세요.</p><form onSubmit={submit} className="login-form"><label>이메일 주소<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label><label>비밀번호<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호 입력"/></label>{error&&<div className="error-box">{error}</div>}<button className="primary" disabled={busy}>{busy?'로그인 중...':<>로그인 <ArrowRight size={17}/></>}</button></form><p className="auth-foot"><LockKeyhole size={13}/> 관리자가 승인한 사용자만 이용할 수 있습니다.</p></div></main>;
}
