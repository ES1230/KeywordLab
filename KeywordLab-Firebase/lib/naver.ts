import { createHmac } from 'node:crypto';
import type { Related, SearchResult, TrendPoint } from '@/lib/keyword';

const AD_ROOT = 'https://api.searchad.naver.com';
const HUB = 'https://naverapihub.apigw.ntruss.com';
const adParams = ['NAVER_AD_CUSTOMER_ID','NAVER_AD_API_KEY','NAVER_AD_SECRET_KEY','NAVER_API_HUB_CLIENT_ID','NAVER_API_HUB_CLIENT_SECRET'] as const;
function requireConfig() {
  for (const key of adParams) if (!process.env[key]) throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
}
function norm(s: string) { return s.replace(/\s+/g,'').toLowerCase(); }
function volume(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && !v.includes('<')) {
    const n = Number(v.replace(/,/g, '')); return Number.isFinite(n) ? n : null;
  }
  return null;
}
async function jsonRequest(url: string, init: RequestInit, label: string) {
  const res = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(16000) });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status} (API 등록/인증/사용량 확인)`);
  return res.json();
}
function hubHeaders() { return {
  'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_API_HUB_CLIENT_ID!,
  'X-NCP-APIGW-API-KEY': process.env.NAVER_API_HUB_CLIENT_SECRET!
}; }
async function getAdRows(keyword: string): Promise<Record<string, unknown>[]> {
  const path = '/keywordstool';
  const timestamp = `${Date.now()}`;
  const signature = createHmac('sha256', process.env.NAVER_AD_SECRET_KEY!)
    .update(`${timestamp}.GET.${path}`).digest('base64');
  const qs = new URLSearchParams({ hintKeywords: norm(keyword), showDetail:'1' });
  const data = await jsonRequest(`${AD_ROOT}${path}?${qs}`, {headers:{
    'X-Timestamp': timestamp, 'X-API-KEY': process.env.NAVER_AD_API_KEY!,
    'X-Customer': process.env.NAVER_AD_CUSTOMER_ID!, 'X-Signature': signature
  }},'검색광고');
  if (!Array.isArray(data.keywordList)) throw new Error('검색광고 응답에 연관 키워드가 없습니다.');
  return data.keywordList;
}
interface BlogItem { title?:string; link?:string; description?:string; postdate?:string }
interface BlogData { total:number; items:BlogItem[] }
async function getBlogs(keyword: string, display=5, start=1, sort='sim'): Promise<BlogData> {
  const q = new URLSearchParams({query:keyword, display:String(display), start:String(start), sort, format:'json'});
  const data = await jsonRequest(`${HUB}/search/v1/blog?${q}`, {headers:hubHeaders()},'블로그 검색');
  if (typeof data.total !== 'number' || !Array.isArray(data.items)) throw new Error('블로그 검색 결과 형식이 올바르지 않습니다.');
  return data;
}
function kstDate(d: Date) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d); }
function utcDate(value: string) { return new Date(`${value}T00:00:00+09:00`); }
function dateOffset(day: string, offset: number) {
  return kstDate(new Date(utcDate(day).getTime() + offset*86400000));
}
async function recentBlogs(keyword: string) {
  const today = kstDate(new Date());
  const since = dateOffset(today,-29).replaceAll('-','');
  const end = today.replaceAll('-','');
  let count=0, scanned=0, capped=false, finished=false;
  const seen = new Set<string>();
  for (let start=1; start<=901; start+=100) {
    const { items, total } = await getBlogs(keyword,100,start,'date');
    let foundOld=false;
    for (const item of items) {
      scanned++;
      if (item.link && seen.has(item.link)) continue;
      if (item.link) seen.add(item.link);
      const pd = item.postdate || '';
      if (/^\d{8}$/.test(pd)) {
        if (pd>=since && pd<=end) count++;
        if (pd<since) foundOld=true;
      }
    }
    if (foundOld || items.length<100 || start+items.length>total) { finished=true; break; }
  }
  capped=!finished && scanned>=1000;
  return {count,scanned,capped};
}
async function getTrend(keyword:string, unit:'month'|'date', startDate:string, endDate:string) {
  const data = await jsonRequest(`${HUB}/search-trend/v1/search`, {
    method:'POST', headers:{...hubHeaders(), 'Content-Type':'application/json'},
    body:JSON.stringify({startDate,endDate,timeUnit:unit,keywordGroups:[{groupName:keyword,keywords:[keyword]}]})
  },'검색어 트렌드');
  return (data.results?.[0]?.data || []) as {period:string;ratio:number}[];
}
async function trends(keyword: string) {
  const today=kstDate(new Date());
  const startMonth=dateOffset(today,-365);
  const [month,daily]=await Promise.all([
    getTrend(keyword,'month',startMonth,today),
    getTrend(keyword,'date',dateOffset(today,-55),today)
  ]);
  const monthly:TrendPoint[]=month.map(row=>({label:row.period.slice(0,7),value:Math.round(row.ratio*10)/10}));
  const totals=Array(7).fill(0) as number[], counts=Array(7).fill(0) as number[];
  for(const row of daily){
    const day=new Date(`${row.period}T12:00:00+09:00`).getUTCDay();
    const index=(day+6)%7; totals[index]+=row.ratio; counts[index]++;
  }
  const weekday=['월','화','수','목','금','토','일'].map((label,i)=>({label,value:counts[i]?Math.round((totals[i]/counts[i])*10)/10:0}));
  return {monthly,weekday};
}
function relevance(text: string, input: string): number {
  const a=norm(text), b=norm(input);
  if(a===b) return 100;
  if(a.includes(b)) return 90;
  const tokens=input.trim().split(/\s+/).filter(x=>x.length>1);
  const hits=tokens.filter(t=>a.includes(norm(t))).length;
  return hits===tokens.length && hits>0?75:hits?40+(hits/tokens.length)*20:0;
}
export async function analyzeKeyword(keyword:string):Promise<SearchResult> {
  requireConfig();
  const warnings: string[]=[];
  const [ads,blog,recent,trend]=await Promise.allSettled([
    getAdRows(keyword),getBlogs(keyword),recentBlogs(keyword),trends(keyword)
  ]);
  if(ads.status==='rejected' && blog.status==='rejected') throw new Error('검색광고와 블로그 검색에 모두 실패했습니다. API 설정을 확인하세요.');
  if(ads.status==='rejected') warnings.push(`검색광고: ${String(ads.reason?.message||'조회 실패')}`);
  if(blog.status==='rejected') warnings.push(`블로그: ${String(blog.reason?.message||'조회 실패')}`);
  const rows=ads.status==='fulfilled'?ads.value:[];
  const related:Related[]=rows.map(row=>{
    const pc=volume(row.monthlyPcQcCnt), mobile=volume(row.monthlyMobileQcCnt);
    return {keyword:String(row.relKeyword||''),pc,mobile,total:pc!==null&&mobile!==null?pc+mobile:null,
      adCompetition:String(row.compIdx||'-'),relevance:relevance(String(row.relKeyword||''),keyword)};
  }).filter(row=>row.keyword && row.relevance>0).sort((a,b)=>b.relevance-a.relevance || (b.total||0)-(a.total||0)).slice(0,40);
  const exact=rows.find(row=>norm(String(row.relKeyword||''))===norm(keyword));
  const pc=exact?volume(exact.monthlyPcQcCnt):null;
  const mobile=exact?volume(exact.monthlyMobileQcCnt):null;
  const total=pc!==null&&mobile!==null?pc+mobile:null;
  const recentData=recent.status==='fulfilled'?recent.value:null;
  if(recent.status==='rejected') warnings.push('최근 30일 발행량을 조회하지 못했습니다.');
  if(trend.status==='rejected') warnings.push('검색어 트렌드 API 미등록 또는 호출 오류입니다.');
  const blogData=blog.status==='fulfilled'?blog.value:null;
  return {
    keyword,summary:{pc,mobile,total,blogTotal:blogData?.total??null,recentCount:recentData?.count??null,
      recentCapped:recentData?.capped??false,recentScanned:recentData?.scanned??0,
      adCompetition:exact?String(exact.compIdx||'-'):'-',
      recentRatio:total!==null&&total>0&&recentData?Math.round(recentData.count/total*1000)/10:null},
    related,posts:(blogData?.items||[]).slice(0,5).map(item=>({title:String(item.title||'').replace(/<[^>]*>/g,''),link:item.link||'',description:String(item.description||'').replace(/<[^>]*>/g,''),postdate:item.postdate||''})),
    trend:trend.status==='fulfilled'?trend.value:{monthly:[],weekday:[],error:'검색어 트렌드 조회 실패'},
    searchedAt:new Date().toISOString(),warnings
  };
}
