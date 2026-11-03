import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/firebase/access';
import { db } from '@/lib/firebase/admin';
const KST_DATE = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const runtime='nodejs';
export async function GET(req:NextRequest) {
  const user=await getAccess(req);if(!user)return NextResponse.json({error:'로그인 및 이용 승인이 필요합니다.'},{status:401});
  try {
    const base=db().collection('users').doc(user.uid);
    const [rows,usage]=await Promise.all([base.collection('history').orderBy('created_at','desc').limit(100).get(),base.collection('daily_usage').doc(KST_DATE()).get()]);
    const history=rows.docs.map(doc=>({id:doc.id,...doc.data()}));
    return NextResponse.json({history,used:usage.data()?.used||0,limit:user.isAdmin?null:15,isAdmin:user.isAdmin,email:user.email},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'검색 이력을 읽지 못했습니다.'},{status:500});}
}
export async function DELETE(req:NextRequest){
  const user=await getAccess(req);if(!user)return NextResponse.json({error:'로그인 및 이용 승인이 필요합니다.'},{status:401});
  const base=db().collection('users').doc(user.uid).collection('history');
  const id=new URL(req.url).searchParams.get('id');
  try {
    if(id){if(!/^[a-zA-Z0-9_-]{1,150}$/.test(id))return NextResponse.json({error:'잘못된 ID'},{status:400});await base.doc(id).delete();}
    else {const rows=await base.limit(100).get();const batch=db().batch();rows.docs.forEach(d=>batch.delete(d.ref));await batch.commit();}
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:'삭제 실패'},{status:500});}
}
