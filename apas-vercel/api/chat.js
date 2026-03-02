// Vercel Serverless Function for Claude API
export default async function handler(req, res) {

  // السماح فقط بـ POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // إضافة CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // الرد على OPTIONS requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // التحقق من وجود API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    // إرسال الطلب إلى Anthropic مع API key الآمن
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    // التحقق من الأخطاء من Anthropic
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
