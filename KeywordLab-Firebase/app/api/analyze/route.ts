import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/firebase/access';
import { db } from '@/lib/firebase/admin';
import { analyzeKeyword } from '@/lib/naver';
export const runtime='nodejs';
export const maxDuration=60;
const KST_DATE = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function POST(req:NextRequest) {
  const access=await getAccess(req);
  if(!access)return NextResponse.json({error:'승인된 로그인 계정만 사용할 수 있습니다.'},{status:401});
  let keyword='';
  try {const body=await req.json();keyword=String(body.keyword||'').trim().replace(/\s+/g,' ');}
  catch {return NextResponse.json({error:'요청 형식 오류'},{status:400});}
  if(!keyword||keyword.length>50)return NextResponse.json({error:'1~50자의 키워드를 입력하세요.'},{status:400});
  let used: number | null=null;
  if(!access.isAdmin){
    const ref=db().collection('users').doc(access.uid).collection('daily_usage').doc(KST_DATE());
    try {
      used=await db().runTransaction(async tx=>{
        const snap=await tx.get(ref);
        const count=Number(snap.data()?.used||0);
        if(count>=15)return -1;
        tx.set(ref,{used:count+1,updatedAt:new Date().toISOString()},{merge:true});
        return count+1;
      });
    } catch {return NextResponse.json({error:'사용량 확인에 실패했습니다.'},{status:503});}
    if(used===-1)return NextResponse.json({error:'오늘의 검색 15회를 모두 사용했습니다. 한국시간 자정에 초기화됩니다.',limitReached:true},{status:429});
  }
  try {
    const result=await analyzeKeyword(keyword);
    try {
      await db().collection('users').doc(access.uid).collection('history').add({keyword,result,created_at:new Date().toISOString()});
    } catch { result.warnings.push('검색은 완료됐지만 검색 기록 저장에 실패했습니다.'); }
    return NextResponse.json({result,quota:{used}},{headers:{'Cache-Control':'private, no-store'}});
  } catch(err) {
    // Failed external API attempts count toward the daily quota, to avoid abuse.
    return NextResponse.json({error:err instanceof Error?err.message:'네이버 API 조회 실패',quota:{used}},{status:502});
  }
}
