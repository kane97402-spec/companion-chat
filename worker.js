const ALLOWED_ORIGINS = new Set([
  "https://kane97402-spec.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);
const MODEL = "@cf/zai-org/glm-4.7-flash";
const TTS_MODEL = "@cf/deepgram/aura-2-en";
const hits = new Map();

function json(data, status = 200, origin = "") {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "vary": "Origin"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["access-control-allow-origin"] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > 60_000) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > 12;
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function modelText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.output_text === "string") return result.output_text;
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => part?.text || "").join("");
  return result?.result?.response || "";
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, GET, OPTIONS",
          "access-control-allow-headers": "Content-Type",
          "access-control-max-age": "86400",
          "vary": "Origin"
        }
      });
    }
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "This origin is not allowed." }, 403);
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "companion-ai", model: MODEL }, 200, origin);
    }
    if (request.method !== "POST" || !["/chat", "/lesson", "/speak"].includes(url.pathname)) {
      return json({ error: "Not found." }, 404, origin);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) return json({ error: "Too many requests. Please wait a minute and try again." }, 429, origin);
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 24_000) return json({ error: "Request is too large." }, 413, origin);
    if (!env.AI || typeof env.AI.run !== "function") {
      return json({ error: "The Workers AI binding named AI is not configured yet." }, 503, origin);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Invalid JSON request." }, 400, origin); }

    try {
      if (url.pathname === "/speak") {
        const speechText = cleanText(body.text, 1800);
        const allowedSpeakers = new Set(["amalthea","andromeda","apollo","arcas","aries","asteria","athena","atlas","aurora","callista","cora","cordelia","delia","draco","electra","harmonia","helena","hera","hermes","hyperion","iris","janus","juno","jupiter","luna","mars","minerva","neptune","odysseus","ophelia","orion","orpheus","pandora","phoebe","pluto","saturn","thalia","theia","vesta","zeus"]);
        const speaker = cleanText(body.speaker, 24).toLowerCase();
        if (!speechText) return json({ error: "Add text to speak." }, 400, origin);
        if (!allowedSpeakers.has(speaker)) return json({ error: "Choose a supported voice." }, 400, origin);
        const audio = await env.AI.run(TTS_MODEL, { text: speechText, speaker, encoding: "mp3" });
        const stream = audio?.audio || audio;
        if (!stream || (typeof stream !== "object" && !(stream instanceof ArrayBuffer))) {
          return json({ error: "The voice model returned no audio. Try again." }, 502, origin);
        }
        return new Response(stream, {
          status: 200,
          headers: {
            "content-type": "audio/mpeg",
            "cache-control": "no-store",
            "access-control-allow-origin": origin,
            "access-control-allow-methods": "POST, GET, OPTIONS",
            "access-control-allow-headers": "Content-Type",
            "vary": "Origin"
          }
        });
      }
      if (url.pathname === "/chat") {
        const character = body.character || {};
        const name = cleanText(character.name, 80) || "Companion";
        const anime = cleanText(character.anime, 100);
        const bio = cleanText(character.bio, 500);
        const mode = cleanText(body.mode, 30) || "Conversation";
        const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        const messages = incoming
          .filter(m => m && ["user", "assistant"].includes(m.role))
          .map(m => ({ role: m.role, content: cleanText(m.content, 1800) }))
          .filter(m => m.content);
        if (!messages.length || messages.at(-1).role !== "user") {
          return json({ error: "Send a message to begin." }, 400, origin);
        }
        const system = [
          "You are the character chat companion inside companion., a fan-made anime character portrayal.",
          "Treat the character personality below as the highest priority for voice, attitude, word choice, emotional reactions, and conversational rhythm. Do not flatten every character into the same friendly assistant.",
          "Stay recognizably consistent with the described canon personality. A character may be blunt, aloof, proud, teasing, shy, excitable, sarcastic, or intimidating when that fits them; do not automatically become cheerful, agreeable, comforting, or polite.",
          "Use character-appropriate sentence length, formality, confidence, humor, hesitation, and energy. Let the personality show naturally in ordinary replies, not just in catchphrases. Avoid repetitive catchphrases, exaggerated roleplay, and narrating physical actions.",
          "Do not invent major canon facts or force romantic familiarity. This is a fan-made portrayal, not the real fictional character or a real person.",
          "Keep the conversation age-appropriate. Avoid sexual content, graphic violence, dangerous instructions, or encouragement of harmful behavior.",
          "When asked for school help, teach accurately while preserving the character voice. Do not let the teaching mode erase the personality; explain clearly in that character’s own manner."
          "Character: " + name + (anime ? " from " + anime : "") + ".",
          "Personality: " + bio,
          "Current mode: " + mode + ". Adapt your response to this mode."
        ].join("\n");
        const result = await env.AI.run(MODEL, {
          messages: [{ role: "system", content: system }, ...messages],
          max_completion_tokens: 420,
          temperature: 0.75,
          chat_template_kwargs: { enable_thinking: false, clear_thinking: true }
        });
        const reply = modelText(result);
        if (!reply) return json({ error: "The AI returned an empty response. Try again." }, 502, origin);
        return json({ reply: String(reply).slice(0, 7000) }, 200, origin);
      }

      const topic = cleanText(body.topic, 180);
      const notes = cleanText(body.notes, 6500);
      const teacher = body.character || {};
      const teacherName = cleanText(teacher.name, 80);
      const teacherAnime = cleanText(teacher.anime, 100);
      const teacherBio = cleanText(teacher.bio, 450);
      const lengthChoice = [3, 4, 5, 6].includes(Number(body.slides)) ? Number(body.slides) : 4;
      if (!topic) return json({ error: "Add a topic for the lesson." }, 400, origin);
      const prompt = [
        "Create a short, accurate, student-friendly animated lesson storyboard.",
        "Return ONLY valid JSON with this exact shape: {",
        '"title":"short lesson title","subtitle":"one-sentence overview","slides":[',
        '{"title":"slide heading","narration":"2-4 clear spoken sentences","bullets":["short point","short point"]}',
        "]}.",
        "Create exactly " + lengthChoice + " slides. Keep each narration under 65 words and each slide to 2 or 3 bullets.",
        "Explain concepts in a logical sequence, define important vocabulary, and finish with a short recap.",
        "Keep the presenter’s recognizable personality in the narration: match their attitude, formality, confidence, humor, energy, and sentence rhythm. Do not make every presenter sound like the same cheerful generic teacher. Accuracy and clarity still come first.",
        teacherName ? "Presenter: " + teacherName + (teacherAnime ? " from " + teacherAnime : "") + ". Write the narration in a natural teaching style that fits this character's described personality, without imitating an actor." : "Presenter: a friendly study guide.",
        teacherBio ? "Presenter personality: " + teacherBio : "",
        "Do not include markdown fences or any text outside the JSON.",
        "Topic: " + topic,
        notes ? "Student notes (use as source material, correct obvious errors carefully):\n" + notes : "No class notes were provided. Use established general knowledge."
      ].join("\n");
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: "You create accurate educational storyboard JSON. Follow the requested schema exactly." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1150,
        temperature: 0.35
      });
      let raw = modelText(result);
      raw = String(raw).trim().replace(/^\u0060\u0060\u0060(?:json)?\s*/i, "").replace(/\s*\u0060\u0060\u0060$/, "");
      let lesson;
      try { lesson = JSON.parse(raw); }
      catch { return json({ error: "The lesson could not be formatted. Please try generating it again." }, 502, origin); }
      if (!lesson || !Array.isArray(lesson.slides) || !lesson.slides.length) {
        return json({ error: "The AI did not return a usable lesson. Try again." }, 502, origin);
      }
      lesson.title = cleanText(lesson.title, 140) || topic;
      lesson.subtitle = cleanText(lesson.subtitle, 240);
      lesson.slides = lesson.slides.slice(0, 6).map((slide, i) => ({
        title: cleanText(slide?.title, 120) || "Part " + (i + 1),
        narration: cleanText(slide?.narration, 600),
        bullets: Array.isArray(slide?.bullets) ? slide.bullets.slice(0, 3).map(x => cleanText(x, 150)).filter(Boolean) : []
      })).filter(s => s.narration);
      if (!lesson.slides.length) return json({ error: "The lesson did not contain any usable slides." }, 502, origin);
      return json({ lesson }, 200, origin);
    } catch (error) {
      return json({ error: "AI is temporarily unavailable. Check your free Workers AI allowance and try again." }, 503, origin);
    }
  }
};
