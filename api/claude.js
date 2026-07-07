// Vercel Serverless Function — Anthropic API 프록시
// 브라우저에 API 키가 노출되지 않도록 서버에서만 호출합니다.
// Vercel 프로젝트 설정 → Environment Variables 에 ANTHROPIC_API_KEY 를 등록하세요.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 받을 수 있어요." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "ANTHROPIC_API_KEY가 설정되지 않았어요. Vercel 프로젝트 설정 → Environment Variables에서 등록한 뒤 다시 배포해 주세요.",
    });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.length > 20000) {
    return res.status(400).json({ error: "prompt가 비어 있거나 너무 길어요." });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: data?.error?.message || "Anthropic API 오류" });
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "서버 요청 실패: " + e.message });
  }
}
