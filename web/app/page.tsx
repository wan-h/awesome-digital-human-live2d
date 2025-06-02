'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 直接跳转页面
export default function Page()
{
  const router = useRouter();
  useEffect(() => {
    router.push('/sentio');    
  })

  return;
}