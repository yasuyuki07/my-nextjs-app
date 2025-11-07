import { NextResponse } from 'next/server'

export const runtime = 'nodejs'          // ★ 追加（任意）
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasKey: Boolean(process.env.DIFY_API_KEY),
  })
}

export async function POST(req: Request) {
  const apiKey = process.env.DIFY_API_KEY?.trim()

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Dify API key is not configured on the server.' },
      { status: 500 }
    )
  }

  try {
    const { title, meetingDate, transcript, conversationId } = await req.json()

    const base = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1'
    const url = `${base}/chat-messages`

    const query = [
      '以下は会議の文字起こしです。この内容をもとに、次の3つを必ず JSON で返してください。',
      '1) summary（最大全5点。重要度の高い論点や結論の要約を短文で。）',
      '2) decisions（決定事項：箇条書き。会議中に明確に合意/承認/決定された内容のみ（推測不可））',
      '3) todos（担当者/期限日/行動が分かる命令形/動詞始まりの短文（例:「◯◯の見積を作成」））',
      '出力は以下のキー構造のみ：',
      '{ "summary":[], "decisions":[], "todos":[{"assignee":"","due_date":"","task":""}] }',
      '',
      '--- ここから文字起こし ---',
      transcript ?? '',
      '--- ここまで ---',
      '',
      `会議名: ${title || ''}`,
      `開催日時: ${meetingDate || ''}`,
    ].join('\n')

    const payload: Record<string, any> = {
      query,
      inputs: { title, meetingDate },
      response_mode: 'blocking',
      user: 'web-analyze',
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok && res.status === 401) {
      return NextResponse.json(
        {
          error: 'Dify rejected the request because the API key was invalid. Please double-check the configured key.',
          details: data,
        },
        { status: 401 }
      )
    }

    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Dify API error:', error)
    return NextResponse.json({ error: 'Failed to call Dify API' }, { status: 500 })
  }
}
