import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'My Keyword Lab',description:'초대 사용자 전용 네이버 블로그 키워드 분석'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>;}
