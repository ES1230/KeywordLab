'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { firebaseAuth, apiFetch } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import type { SearchResult, Related } from '@/lib/keyword';
import { AreaChart,Area,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis,BarChart,Bar } from 'recharts';
import { Search,ChartNoAxesCombined,History,LogOut,Download,ShieldCheck,ArrowUpDown,Trash2,LoaderCircle,Menu,Info,Monitor,Smartphone,Sigma,BookOpen,MessagesSquare,FileText } from 'lucide-react';

type Entry = {id:string;keyword:string;created_at:string;result:SearchResult};
type Tab='analyze'|'history';
const fmt=(v:number|null|undefined)=>v===null||v===undefined?'—':v.toLocaleString('ko-KR');
const chartColor='#2563eb';
function exportCSV(filename:string,headers:string[],rows:(string|number|null|undefined)[][]){
  const cell=(s:unknown)=>'"'+String(s??'').replace(/"/g,'""')+'"';
  const text='\ufeff'+[headers,...rows].map(r=>r.map(cell).join(',')).join('\r\n');
  const href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');a.href=href;a.download=filename;a.click();URL.revokeObjectURL(href);
}
function PanelTitle({children,sub,action}:{children:React.ReactNode;sub?:string;action?:React.ReactNode}){return <div className="panel-title"><div><h2>{children}</h2>{sub&&<p>{sub}</p>}</div>{action}</div>;}
function Counter({icon,label,value}:{icon:React.ReactNode;label:string;value:number|null|undefined}){
  return <div className="counter"><span className="counter-icon" aria-hidden="true">{icon}</span><strong>{fmt(value)}</strong><span className="counter-label">{label}</span></div>;
}

export default function Dashboard({email,admin}:{email:string;admin:boolean}){
  const [tab,setTab]=useState<Tab>('analyze');
  const [keyword,setKeyword]=useState('');
  const [data,setData]=useState<SearchResult|null>(null);
  const [history,setHistory]=useState<Entry[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [used,setUsed]=useState(0);
  const [sort,setSort]=useState<'relevance'|'total'|'keyword'>('relevance');
  const [filter,setFilter]=useState('');
  const [mobileOpen,setMobileOpen]=useState(false);
  const [loadingHistory,setLoadingHistory]=useState(true);
  const loadHistory=useCallback(async()=>{
    try { const r=await apiFetch('/api/history');if(!r.ok){if(r.status===401)window.location.assign('/');return;}
      const payload=await r.json();setHistory(payload.history||[]);setUsed(payload.used||0);
    } catch {}finally{setLoadingHistory(false);}
  },[]);
  useEffect(()=>{void loadHistory();},[loadHistory]);
  async function analyze(event?:React.FormEvent, override?:string){
    event?.preventDefault();const q=(override??keyword).trim();if(!q||busy)return;
    setBusy(true);setError('');setKeyword(q);
    try {const r=await apiFetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword:q})});
      const response=await r.json();if(response.quota?.used!==undefined)setUsed(response.quota.used);
      if(!r.ok)throw Error(response.error||'조회 실패');
      setData(response.result);setTab('analyze');setFilter('');setSort('relevance');await loadHistory();
    }catch(e){setError(e instanceof Error?e.message:'검색 실패');await loadHistory();}
    finally{setBusy(false);}
  }
  function openEntry(entry:Entry){setData(entry.result);setKeyword(entry.keyword);setTab('analyze');setError('');setMobileOpen(false);window.scrollTo({top:0,behavior:'smooth'});}
  async function removeHistory(id?:string){
    if(!confirm(id?'이 검색 기록을 삭제할까요?':'검색 이력을 모두 삭제할까요?'))return;
    const url=id?'/api/history?id='+encodeURIComponent(id):'/api/history';
    const r=await apiFetch(url,{method:'DELETE'});if(r.ok){setSelected(s=>s.filter(x=>x!==id));await loadHistory();}
  }
  async function logout(){await signOut(firebaseAuth);window.location.assign('/');}
  const rows=useMemo(()=>{
    let list=[...(data?.related||[])].filter(x=>!filter||x.keyword.toLowerCase().includes(filter.toLowerCase()));
    if(sort==='total')list.sort((a,b)=>(b.total||0)-(a.total||0));
    if(sort==='keyword')list.sort((a,b)=>a.keyword.localeCompare(b.keyword,'ko'));
    return list;
  },[data,sort,filter]);
  const compare=useMemo(()=>selected.map(id=>history.find(h=>h.id===id)).filter((x):x is Entry=>Boolean(x)),[history,selected]);
  const trend=data?.trend;
  const loadingIcon=busy?<LoaderCircle size={16} className="rotating"/>:<Search size={17}/>;
  return <div className="layout">
    {mobileOpen&&<button className="sidebar-backdrop" aria-label="메뉴 닫기" onClick={()=>setMobileOpen(false)}/>}
    <aside className={'sidebar '+(mobileOpen?'opened':'')}>
      <div className="brand"><div className="brand-icon"><ChartNoAxesCombined size={21}/></div><div><strong>KeywordLab</strong></div></div>
      <button className={'nav-button '+(tab==='analyze'?'selected':'')} onClick={()=>{setTab('analyze');setMobileOpen(false);}}><Search size={18}/> 키워드 분석</button>
      <button className={'nav-button '+(tab==='history'?'selected':'')} onClick={()=>{setTab('history');setMobileOpen(false);}}><History size={18}/> 검색 기록 · 비교 <span className="side-count">{history.length}</span></button>
      <div className="side-bottom"><div className="side-user"><ShieldCheck size={17}/><div><strong>{admin?'관리자':'승인 사용자'}</strong><span title={email}>{email}</span></div></div><button className="logout" onClick={logout}><LogOut size={16}/> 로그아웃</button></div>
    </aside>
    <main className="main">
    {tab==='analyze'?<>
      <div className="page-heading"><div className="heading-title"><button className="mobile-menu" aria-label="메뉴 열기" onClick={()=>setMobileOpen(true)}><Menu size={21}/></button><h1>키워드 분석</h1></div><div className="usage-pill">{admin?'관리자 · 무제한':<>오늘 <b>{used} / 15회</b> 사용</>}</div></div>
      <section className="search-panel"><form className="search-form" onSubmit={e=>analyze(e)}><div className="search-field"><Search size={19}/><input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="분석할 키워드를 입력하세요" maxLength={50} aria-label="검색 키워드" autoComplete="off"/></div><button className="primary search-submit" disabled={busy||!keyword.trim()}>{loadingIcon} {busy?'분석 중':'분석하기'}</button></form></section>
      {error&&<div className="error-box">{error}</div>}
      {!data?<div className="welcome">키워드를 입력하고 분석하기를 눌러주세요.</div>:<>
        <div className="section-row"><h2>키워드 분석 요약 <small>{data.keyword}</small></h2><span className="timestamp">{new Date(data.searchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</span></div>
        <div className="insight-grid">
          <section className="panel insight-card"><h3>월간 검색량</h3>
            <div className="counter-grid">
              <Counter icon={<Monitor size={20}/>} label="PC" value={data.summary.pc}/>
              <Counter icon={<Smartphone size={20}/>} label="모바일" value={data.summary.mobile}/>
              <Counter icon={<Sigma size={20}/>} label="전체" value={data.summary.total}/>
            </div>
            <p className="insight-foot">네이버 검색광고 기준 · 월간 추정 검색량</p>
          </section>
          <section className="panel insight-card"><h3>최근 30일 콘텐츠 발행량</h3>
            <div className="counter-grid">
              <Counter icon={<BookOpen size={20}/>} label="블로그 (확인 건수)" value={data.summary.recentCount}/>
              <Counter icon={<MessagesSquare size={20}/>} label="카페 (미지원)" value={null}/>
              <Counter icon={<FileText size={20}/>} label="전체 (집계 불가)" value={null}/>
            </div>
            <p className="insight-foot">블로그는 최신 검색 결과 최대 1,000건 중 최근 30일 작성글을 확인한 값{data.summary.recentCapped?' · 1,000건 상한에 도달해 실제보다 적을 수 있음':''}. 카페는 API에서 작성일을 제공하지 않습니다.</p>
          </section>
        </div>
        <div className="content-results"><div><span>블로그 전체 검색 결과수</span><b>{fmt(data.summary.blogTotal)}</b></div><div><span>카페 전체 검색 결과수</span><b>{fmt(data.summary.cafeTotal)}</b></div><div><span>광고 경쟁도</span><b>{data.summary.adCompetition}</b></div></div>
        {data.warnings.length>0&&<div className="warning-box">{data.warnings.map((w,i)=><div key={i}>{w}</div>)}</div>}
        <div className="section-row"><h2>검색 트렌드</h2><span className="muted-label">네이버 데이터랩 상대 관심도 · 0~100</span></div>
        <section className="panel trend-panel"><PanelTitle sub="실제 월별 검색 건수가 아닌 상대적인 검색 관심도입니다.">최근 12개월 검색 관심도</PanelTitle><div className="chart-area">{trend?.monthly.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.monthly} margin={{top:15,right:20,left:-15,bottom:5}}><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity={0.19}/><stop offset="100%" stopColor={chartColor} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf1f6" vertical={false}/><XAxis dataKey="label" tick={{fontSize:11,fill:'#8996a7'}} tickLine={false} axisLine={false}/><YAxis domain={[0,100]} tick={{fontSize:11,fill:'#8996a7'}} tickLine={false} axisLine={false}/><Tooltip formatter={(v)=>[v,'검색 관심도']}/><Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2.5} fill="url(#trendFill)" dot={false}/></AreaChart></ResponsiveContainer>:<div className="empty-small">검색어 트렌드 API를 연결하면 그래프가 표시됩니다.</div>}</div></section>
        <div className="chart-bottom"><section className="panel"><PanelTitle sub="월별 상대 관심 지수">월별 검색 경향</PanelTitle><div className="small-chart">{trend?.monthly.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={trend.monthly}><CartesianGrid vertical={false} stroke="#edf1f6"/><XAxis dataKey="label" tick={{fontSize:10}} tickLine={false} axisLine={false}/><YAxis domain={[0,100]} tick={{fontSize:10}} tickLine={false} axisLine={false}/><Tooltip formatter={(v)=>[v,'관심도']}/><Bar dataKey="value" fill="#82b4ef" radius={[5,5,0,0]} maxBarSize={28}/></BarChart></ResponsiveContainer>:<div className="empty-small">조회 데이터 없음</div>}</div></section><section className="panel"><PanelTitle sub="최근 8주 · 요일별 일평균 상대 관심 지수">요일별 검색 경향</PanelTitle><div className="small-chart">{trend?.weekday.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={trend.weekday}><CartesianGrid vertical={false} stroke="#edf1f6"/><XAxis dataKey="label" tick={{fontSize:11}} tickLine={false} axisLine={false}/><YAxis domain={[0,100]} tick={{fontSize:10}} tickLine={false} axisLine={false}/><Tooltip formatter={(v)=>[v,'관심도']}/><Bar dataKey="value" fill="#498fe8" radius={[5,5,0,0]} maxBarSize={34}/></BarChart></ResponsiveContainer>:<div className="empty-small">조회 데이터 없음</div>}</div></section></div>
        <div className="section-row"><h2>연관 키워드 <small>{rows.length}개</small></h2><button className="ghost" onClick={()=>exportCSV('related-keywords.csv',['키워드','PC','모바일','총 검색량','광고 경쟁도'],rows.map(r=>[r.keyword,r.pc,r.mobile,r.total,r.adCompetition]))}><Download size={15}/> CSV 다운로드</button></div>
        <section className="panel"><div className="table-controls"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="연관 키워드 필터"/><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="relevance">관련도순</option><option value="total">검색량순</option><option value="keyword">가나다순</option></select></div><div className="table-scroll"><table><thead><tr><th>키워드</th><th>PC</th><th>모바일</th><th>월간 총 검색량</th><th>광고 경쟁도</th><th></th></tr></thead><tbody>{rows.length?rows.map((r:Related,i)=><tr key={`${r.keyword}-${i}`}><td className="keyword-name">{r.keyword}</td><td className="num">{fmt(r.pc)}</td><td className="num">{fmt(r.mobile)}</td><td className="num strong-num">{fmt(r.total)}</td><td>{r.adCompetition}</td><td><button className="inline-link" disabled={busy} onClick={()=>void analyze(undefined,r.keyword)}>분석</button></td></tr>):<tr><td colSpan={6} className="empty-row">API에서 반환한 관련 키워드가 없어요.</td></tr>}</tbody></table></div></section>
        <div className="section-row"><h2>블로그 검색 상위 결과</h2><span className="muted-label">관련도순 최대 5개</span></div>
        <section className="panel posts">{data.posts.length?data.posts.map((p,i)=><a key={i} href={/^https?:\/\//.test(p.link)?p.link:'#'} target="_blank" rel="noopener noreferrer" className="post"><b>{p.title}</b><span>{p.description}</span><small>{p.postdate}</small></a>):<div className="empty-small">조회된 검색 결과가 없습니다.</div>}</section>
        <div className="small-note"><Info size={14}/> 월간 검색량과 콘텐츠 발행량은 출처 및 집계 방식이 다릅니다. 블로그 최근 30일 수치는 확인 가능한 검색 결과에 한정하며, 카페의 정확한 월간 발행량은 제공되지 않습니다. 트렌드는 실제 건수가 아닌 상대 지수입니다.</div>
      </>}
    </>:<>
      <div className="page-heading"><div className="heading-title"><button className="mobile-menu" aria-label="메뉴 열기" onClick={()=>setMobileOpen(true)}><Menu size={21}/></button><h1>검색 기록 · 비교</h1></div><button className="ghost" onClick={()=>void loadHistory()}><History size={16}/> 새로고침</button></div>
      <section className="panel history-panel"><PanelTitle sub="2~8개 키워드를 선택해서 비교하세요." action={<div className="toolbar"><button className="ghost" onClick={()=>exportCSV('my-keyword-history.csv',['키워드','월 검색량','최근 30일 블로그 확인 건수','블로그 전체 검색 결과','카페 전체 검색 결과','검색일'],history.map(e=>[e.keyword,e.result?.summary?.total,e.result?.summary?.recentCount,e.result?.summary?.blogTotal,e.result?.summary?.cafeTotal,e.created_at]))}><Download size={15}/> CSV</button><button className="danger-text" onClick={()=>void removeHistory()}>이력 전체 삭제</button></div>}>내 검색 기록 <span className="count">{history.length}</span></PanelTitle><div className="table-scroll"><table><thead><tr><th>선택</th><th>키워드</th><th>월간 검색량</th><th>30일 블로그 확인</th><th>조회일</th><th></th></tr></thead><tbody>{loadingHistory?<tr><td colSpan={6} className="empty-row">불러오는 중...</td></tr>:history.length?history.map(h=><tr key={h.id}><td><input type="checkbox" aria-label={`${h.keyword} 비교 선택`} checked={selected.includes(h.id)} onChange={e=>setSelected(p=>e.target.checked?[...p,h.id].slice(-8):p.filter(x=>x!==h.id))}/></td><td><button className="keyword-button" onClick={()=>openEntry(h)}>{h.keyword}</button></td><td className="num">{fmt(h.result?.summary?.total)}</td><td className="num">{fmt(h.result?.summary?.recentCount)}</td><td className="small-date">{new Date(h.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</td><td><button className="icon-button" aria-label="이력 삭제" onClick={()=>void removeHistory(h.id)}><Trash2 size={15}/></button></td></tr>):<tr><td colSpan={6} className="empty-row">아직 검색 기록이 없어요.</td></tr>}</tbody></table></div></section>
      <div className="section-row"><h2>선택 키워드 비교 <small>{compare.length}개</small></h2><button className="ghost" disabled={compare.length<2} onClick={()=>exportCSV('keyword-comparison.csv',['키워드','PC','모바일','월 검색량','30일 블로그 확인 건수','블로그 전체 검색 결과','카페 전체 검색 결과'],compare.map(c=>[c.keyword,c.result.summary.pc,c.result.summary.mobile,c.result.summary.total,c.result.summary.recentCount,c.result.summary.blogTotal,c.result.summary.cafeTotal]))}><Download size={15}/> 비교표 CSV</button></div>
      <section className="panel"><div className="table-scroll"><table><thead><tr><th>키워드</th><th>PC</th><th>모바일</th><th>월 검색량</th><th>30일 블로그 확인</th><th>블로그 전체 검색 결과</th><th>카페 전체 검색 결과</th></tr></thead><tbody>{compare.length>=2?compare.map(c=><tr key={c.id}><td className="keyword-name">{c.keyword}</td><td className="num">{fmt(c.result.summary.pc)}</td><td className="num">{fmt(c.result.summary.mobile)}</td><td className="num strong-num">{fmt(c.result.summary.total)}</td><td className="num">{fmt(c.result.summary.recentCount)}</td><td className="num">{fmt(c.result.summary.blogTotal)}</td><td className="num">{fmt(c.result.summary.cafeTotal)}</td></tr>):<tr><td colSpan={7} className="empty-row">검색 기록에서 키워드 2~8개를 체크하세요.</td></tr>}</tbody></table></div></section>
      <p className="small-note"><ArrowUpDown size={14}/> 기록은 로그인한 계정에만 저장됩니다. 검색 이력 다시 보기와 비교는 하루 검색 횟수를 차감하지 않습니다.</p>
    </>}
    </main>
  </div>;
}
