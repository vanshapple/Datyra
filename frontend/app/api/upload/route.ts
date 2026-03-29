import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  
  const response = await fetch('https://datyra-production.up.railway.app/upload', {
    method: 'POST',
    body: formData,
  })
  
  const data = await response.json()
  return NextResponse.json(data)
}
