import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasKey: Boolean(process.env.DIFY_API_KEY),
  });
}


export async function POST(req: Request) {
  try {
    const { title, meetingDate, transcript, conversationId } = await req.json();

    const base = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1';
    const url = `${base}/chat-messages`;

    // ← ここを修正：query に transcript を含める
    const query =
      [
        '以下は会議の文字起こしです。この内容をもとに、次の3つを必ず JSON で返してください。',
        '1) summary（要約：最大5点）',
        '2) decisions（決定事項：箇条書き）',
        '3) todos（担当者/期限/内容の配列）',
        '出力は以下のキー構造のみ：',
        '{ "summary":[], "decisions":[], "todos":[{"assignee":"","due_date":"","task":""}] }',
        '',
        '--- ここから文字起こし ---',
        transcript ?? '',
        '--- ここまで ---',
        '',
        `会議名: ${title || ''}`,
        `開催日時: ${meetingDate || ''}`,
      ].join('\n');

    const payload: Record<string, any> = {
      query,                         // ★ ここに本文を入れる
      inputs: { title, meetingDate },// メタ情報だけ inputs に残す（参照するならDify側で {{title}} など）
      response_mode: 'blocking',
      user: 'web-analyze',
      ...(conversationId ? { conversation_id: conversationId } : {}),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Dify API error:', error);
    return NextResponse.json({ error: 'Failed to call Dify API' }, { status: 500 });
  }
}
