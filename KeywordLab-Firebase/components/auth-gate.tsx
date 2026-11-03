 'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth, apiFetch } from '@/lib/firebase/client';
import Dashboard from '@/components/dashboard';
import LoginForm from '@/components/login-form';
type Profile = {email:string;isAdmin:boolean};
export default function AuthGate(){
 const [state,setState]=useState<'loading'|'login'|'ready'>('loading');
 const [profile,setProfile]=useState<Profile|null>(null);
 useEffect(()=>onAuthStateChanged(firebaseAuth,async user=>{
   if(!user){setProfile(null);setState('login');return;}
   try {const r=await apiFetch('/api/history');if(!r.ok){setState('login');return;}
     const d=await r.json();setProfile({email:d.email,isAdmin:d.isAdmin});setState('ready');
   }catch{setState('login');}
 }),[]);
 if(state==='loading')return <main className="auth-bg"><p>로그인 확인 중...</p></main>;
 if(state==='login'||!profile)return <LoginForm/>;
 return <Dashboard email={profile.email} admin={profile.isAdmin}/>;
}
