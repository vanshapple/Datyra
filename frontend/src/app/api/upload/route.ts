import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const response = await fetch('https://datyra-production.up.railway.app/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 })
  }
}
