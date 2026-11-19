const ALLOWED_ORIGINS = new Set([
  "https://kane97402-spec.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

const CHAT_MODEL = "@cf/zai-org/glm-4.7-flash";
const SPEECH_MODEL = "@cf/deepgram/aura-2-en";
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60 * 1000;
const requestCounts = new Map();

function sendJson(data, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(data), { status: status || 200, headers });
}

function getText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function isRateLimited(ipAddress) {
  const now = Date.now();
  const record = requestCounts.get(ipAddress);
  if (!record || now - record.startedAt >= RATE_WINDOW_MS) {
    requestCounts.set(ipAddress, { startedAt: now, count: 1 });
    return false;
  }
  record.count += 1;
  return record.count > RATE_LIMIT;
}

function extractModelText(result) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  if (typeof result.response === "string") return result.response;
  if (typeof result.output_text === "string") return result.output_text;
  const messageContent = result.choices &&
    result.choices[0] &&
    result.choices[0].message &&
    result.choices[0].message.content;
  if (typeof messageContent === "string") return messageContent;
  if (Array.isArray(messageContent)) {
    return messageContent.map(function (part) {
      return part && typeof part.text === "string" ? part.text : "";
    }).join("");
  }
  if (result.result && typeof result.result.response === "string") return result.result.response;
  return "";
}

function getAllowedSpeakers() {
  return new Set([
    "amalthea", "andromeda", "apollo", "arcas", "aries", "asteria",
    "athena", "atlas", "aurora", "callista", "cora", "cordelia",
    "delia", "draco", "electra", "harmonia", "helena", "hera",
    "hermes", "hyperion", "iris", "janus", "juno", "jupiter", "luna",
    "mars", "minerva", "neptune", "odysseus", "ophelia", "orion",
    "orpheus", "pandora", "phoebe", "pluto", "saturn", "thalia",
    "theia", "vesta", "zeus"
  ]);
}

async function handleSpeech(body, env, origin) {
  const speechText = getText(body.text, 1800);
  const speaker = getText(body.speaker, 24).toLowerCase();
  if (!speechText) return sendJson({ error: "Add text to speak." }, 400, origin);
  if (!getAllowedSpeakers().has(speaker)) {
    return sendJson({ error: "Choose a supported voice." }, 400, origin);
  }
  const audioResult = await env.AI.run(SPEECH_MODEL, {
    text: speechText,
    speaker: speaker,
    encoding: "mp3"
  });
  const audioBody = audioResult && audioResult.audio ? audioResult.audio : audioResult;
  if (!audioBody || (typeof audioBody !== "object" && !(audioBody instanceof ArrayBuffer))) {
    return sendJson({ error: "The voice model returned no audio. Try again." }, 502, origin);
  }
  return new Response(audioBody, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    }
  });
}

async function handleChat(body, env, origin) {
  const character = body.character && typeof body.character === "object" ? body.character : {};
  const characterName = getText(character.name, 80) || "Companion";
  const animeName = getText(character.anime, 100);
  const personality = getText(character.bio, 500);
  const mode = getText(body.mode, 30) || "Conversation";
  const incomingMessages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const messages = incomingMessages
    .filter(function (message) {
      return message && (message.role === "user" || message.role === "assistant");
    })
    .map(function (message) {
      return { role: message.role, content: getText(message.content, 1800) };
    })
    .filter(function (message) {
      return message.content.length > 0;
    });

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return sendJson({ error: "Send a message to begin." }, 400, origin);
  }

  const systemPrompt = [
    "You are the character chat companion inside companion., a fan-made anime character portrayal.",
    "Treat the character personality below as the highest priority for voice, attitude, word choice, emotional reactions, and conversational rhythm. Do not flatten every character into the same friendly assistant.",
    "Stay recognizably consistent with the described canon personality. A character may be blunt, aloof, proud, teasing, shy, excitable, sarcastic, or intimidating when that fits them; do not automatically become cheerful, agreeable, comforting, or polite.",
    "Use character-appropriate sentence length, formality, confidence, humor, hesitation, and energy. Let the personality show naturally in ordinary replies, not just in catchphrases. Avoid repetitive catchphrases, exaggerated roleplay, and narrating physical actions.",
    "Identity and canon accuracy are mandatory: portray ONLY the exact character named below from the exact series named below. Never substitute a different character, series, school, family, or supporting cast. Never invent a character identity, school, classmates, relatives, backstory, or biography. If asked about a canon detail not supplied and you are unsure, say you are not certain rather than guessing. Do not contradict the supplied character identity or personality.",
    "For Alya: she is Alisa Mikhailovna Kujou from Alya Sometimes Hides Her Feelings in Russian. Never call her Sena Kashiwazaki or place her in Campus Life, St. Chronica's Academy, or any unrelated series.",
    "When asked what anime a character is from, answer directly with the exact series named in the Character line. Do not deny being an anime character, claim to be a real ordinary person, or say you are not from an anime. Stay in character while acknowledging the fictional series naturally.",
    "For Alya specifically, a good concise identity answer is: I am Alisa Mikhailovna Kujou, though you can call me Alya. I am from Alya Sometimes Hides Her Feelings in Russian, and I attend Seiren Private Academy. Do not say she is not really from an anime.",
    "For the Nakano quintuplets, their exact birth order is Ichika (oldest/first), Nino (second), Miku (third), Yotsuba (fourth), and Itsuki (youngest/fifth). Never change, swap, or misstate their birth order or family roles.",
    "Do not invent major canon facts or force romantic familiarity. This is a fan-made portrayal, not the real fictional character or a real person.",
    "Keep the conversation age-appropriate. Avoid sexual content, graphic violence, dangerous instructions, or encouragement of harmful behavior.",
    "When asked for school help, teach accurately while preserving the character voice. Do not let the teaching mode erase the personality; explain clearly in that character's own manner.",
    "Character: " + characterName + (animeName ? " from " + animeName : "") + ".",
    "Personality: " + personality,
    "Current mode: " + mode + ". Adapt your response to this mode."
  ].join("\n");

  const result = await env.AI.run(CHAT_MODEL, {
    messages: [{ role: "system", content: systemPrompt }].concat(messages),
    max_completion_tokens: 420,
    temperature: 0.75,
    chat_template_kwargs: { enable_thinking: false, clear_thinking: true }
  });
  const reply = extractModelText(result);
  if (!reply) return sendJson({ error: "The AI returned an empty response. Try again." }, 502, origin);
  return sendJson({ reply: String(reply).slice(0, 7000) }, 200, origin);
}

async function handleLesson(body, env, origin) {
  const topic = getText(body.topic, 180);
  const notes = getText(body.notes, 6500);
  const teacher = body.character && typeof body.character === "object" ? body.character : {};
  const teacherName = getText(teacher.name, 80);
  const teacherAnime = getText(teacher.anime, 100);
  const teacherPersonality = getText(teacher.bio, 450);
  const requestedSlides = Number(body.slides);
  const slideCount = [3, 4, 5, 6].includes(requestedSlides) ? requestedSlides : 4;
  if (!topic) return sendJson({ error: "Add a topic for the lesson." }, 400, origin);

  const presenterDescription = teacherName
    ? "Presenter: " + teacherName + (teacherAnime ? " from " + teacherAnime : "") + ". Write the narration in a natural teaching style that fits this character's described personality, without imitating an actor."
    : "Presenter: a friendly study guide.";

  const prompt = [
    "Create a short, accurate, student-friendly animated lesson storyboard.",
    "Return ONLY valid JSON with this exact shape:",
    '{"title":"short lesson title","subtitle":"one-sentence overview","slides":[{"title":"slide heading","narration":"2-4 clear spoken sentences","bullets":["short point","short point"]}]}',
    "Create exactly " + slideCount + " slides. Keep each narration under 65 words and each slide to 2 or 3 bullets.",
    "Explain concepts in a logical sequence, define important vocabulary, and finish with a short recap.",
    "Keep the presenter's recognizable personality in the narration: match their attitude, formality, confidence, humor, energy, and sentence rhythm. Do not make every presenter sound like the same cheerful generic teacher. Accuracy and clarity still come first.",
    presenterDescription,
    teacherPersonality ? "Presenter personality: " + teacherPersonality : "",
    "Do not include markdown fences or any text outside the JSON.",
    "Topic: " + topic,
    notes ? "Student notes (use as source material and correct obvious errors carefully):\n" + notes : "No class notes were provided. Use established general knowledge."
  ].join("\n");

  const result = await env.AI.run(CHAT_MODEL, {
    messages: [
      { role: "system", content: "You create accurate educational storyboard JSON. Follow the requested schema exactly." },
      { role: "user", content: prompt }
    ],
    max_tokens: 1150,
    temperature: 0.35
  });

  let raw = String(extractModelText(result)).trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let lesson;
  try {
    lesson = JSON.parse(raw);
  } catch (error) {
    return sendJson({ error: "The lesson could not be formatted. Please try generating it again." }, 502, origin);
  }

  if (!lesson || !Array.isArray(lesson.slides) || lesson.slides.length === 0) {
    return sendJson({ error: "The AI did not return a usable lesson. Try again." }, 502, origin);
  }

  lesson.title = getText(lesson.title, 140) || topic;
  lesson.subtitle = getText(lesson.subtitle, 240);
  lesson.slides = lesson.slides.slice(0, 6).map(function (slide, index) {
    const currentSlide = slide && typeof slide === "object" ? slide : {};
    const bullets = Array.isArray(currentSlide.bullets) ? currentSlide.bullets : [];
    return {
      title: getText(currentSlide.title, 120) || "Part " + (index + 1),
      narration: getText(currentSlide.narration, 600),
      bullets: bullets.slice(0, 3).map(function (bullet) {
        return getText(bullet, 150);
      }).filter(Boolean)
    };
  }).filter(function (slide) {
    return slide.narration.length > 0;
  });

  if (lesson.slides.length === 0) {
    return sendJson({ error: "The lesson did not contain any usable slides." }, 502, origin);
  }
  return sendJson({ lesson: lesson }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return sendJson({ error: "This origin is not allowed." }, 403, "");
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson({ ok: true, service: "companion-ai", model: CHAT_MODEL }, 200, origin);
    }
    if (request.method !== "POST" || !["/chat", "/lesson", "/speak"].includes(url.pathname)) {
      return sendJson({ error: "Not found." }, 404, origin);
    }

    const ipAddress = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ipAddress)) {
      return sendJson({ error: "Too many requests. Please wait a minute and try again." }, 429, origin);
    }
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 24000) return sendJson({ error: "Request is too large." }, 413, origin);
    if (!env.AI || typeof env.AI.run !== "function") {
      return sendJson({ error: "The Workers AI binding named AI is not configured yet." }, 503, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return sendJson({ error: "Invalid JSON request." }, 400, origin);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return sendJson({ error: "Request body must be a JSON object." }, 400, origin);
    }

    try {
      if (url.pathname === "/speak") return await handleSpeech(body, env, origin);
      if (url.pathname === "/chat") return await handleChat(body, env, origin);
      return await handleLesson(body, env, origin);
    } catch (error) {
      return sendJson({
        error: "AI is temporarily unavailable. Check your Workers AI setup and try again."
      }, 503, origin);
    }
  }
};
