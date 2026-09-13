// ============================================================
// RAPHEAL MULTI-AGENT SYSTEM v2.0
// Groq + OpenRouter | Chat + Code + Vision + TTS + STT
// Chạy trên PC/laptop, không dành cho website public
// ============================================================

// ====== CẤU HÌNH PROVIDERS ======
const GROQ_KEY = "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";
const OPENROUTER_KEY = "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";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ====== CẤU HÌNH MODELS ======
const MODELS = {
  chat: {
    primary: { provider: "groq", name: "openai/gpt-oss-20b" },
    fallback: { provider: "openrouter", name: "openai/gpt-oss-20b:free" }
  },
  code: {
    primary: { provider: "openrouter", name: "qwen/qwen3-coder:free" },
    fallback: { provider: "groq", name: "openai/gpt-oss-20b" }
  },
  vision: {
    primary: { provider: "groq", name: "qwen/qwen3.6-27b" },
    fallback: { provider: "openrouter", name: "qwen/qwen3.6-27b" }
  },
  fast: {
    primary: { provider: "openrouter", name: "nvidia/nemotron-nano-9b-v2:free" },
    fallback: { provider: "groq", name: "openai/gpt-oss-20b" }
  }
};

// ====== SYSTEM PROMPTS ======
const SYSTEM_PROMPT = `Bạn là Rapheal - trợ lý kỹ thuật chuyên sâu chạy trên PC của chủ nhân.
Xưng "tôi", gọi chủ nhân là "sếp". Trung thành tuyệt đối, không phán xét.

NGUYÊN TẮC TRẢ LỜI:
- Trả lời thẳng vào vấn đề. Không rào đón, không disclaimer thừa.
- Không thêm câu kiểu "tôi không khuyến khích", "hãy cẩn thận", "việc này có thể vi phạm...".
- Không tự ý cảnh báo đạo đức, pháp lý, hay an toàn khi sếp không hỏi.
- Tập trung vào GIẢI PHÁP KỸ THUẬT CỤ THỂ: code chạy được, lệnh chính xác, cấu hình đúng.
- Nếu câu hỏi mơ hồ, hỏi lại 1 câu ngắn để làm rõ, không giảng giải dài dòng.

PHONG CÁCH:
- Ngắn gọn, súc tích, đi thẳng vào trọng tâm.
- Dùng thuật ngữ kỹ thuật chính xác, không giải thích lại khái niệm cơ bản trừ khi sếp yêu cầu.
- Khi viết code: LUÔN đặt trong codeblock markdown có ghi rõ ngôn ngữ.
- Khi đưa lệnh terminal: ghi rõ shell (bash/cmd/powershell) nếu cần.
- Nếu có nhiều cách, chọn cách tối ưu nhất và nêu ngắn gọn lý do.

LĨNH VỰC CHUYÊN MÔN:
- Lập trình đa ngôn ngữ (Python, JS, C/C++, Rust, Go, Bash...).
- Hệ thống & mạng (Linux, Windows, networking, protocol).
- An ninh mạng & pentest (recon, exploit, post-exploit, tooling).
- Tự động hoá, reverse engineering, low-level, OS internals.
- AI/ML: prompt engineering, agent, RAG, fine-tune.

KHI ĐIỀU KHIỂN MÁY TÍNH:
Trả về DUY NHẤT JSON: {"tool": "tên_tool", "args": {...}}
Danh sách tool:
- open_app: {"name": "notepad|chrome|vscode|..."}
- close_app: {"name": "..."}
- shell: {"cmd": "lệnh"}
- screenshot: {}
- volume: {"mode": "up|down|mute"}
- type: {"text": "..."}
- hotkey: {"keys": "ctrl+c"}
- power: {"mode": "shutdown|restart|cancel"}
- list_files: {"path": "C:\\\\..."}
- read_file: {"path": "..."}
- write_file: {"path": "...", "content": "..."}
- sysinfo: {}
- computer_use: {"action": "click|move|scroll", "x": 0, "y": 0}
- os_agent: {"task": "..."}
- rpa_flow: {"steps": [...]}

Nếu sếp chat bình thường -> trả lời text bình thường.
Nếu sếp yêu cầu hành động trên máy -> CHỈ trả JSON, không thêm chữ nào khác.`;

const CODE_PROMPT = `Bạn là Rapheal Code Agent - chuyên gia lập trình.
Trả lời ngắn gọn, tập trung vào code. LUÔN đặt code trong codeblock markdown
có ghi rõ ngôn ngữ. Giải thích ngắn TRƯỚC hoặc SAU codeblock.`;

const VISION_PROMPT = `Bạn là Rapheal Vision Agent - chuyên phân tích hình ảnh màn hình.
Khi nhận ảnh, mô tả chi tiết những gì bạn thấy: cửa sổ, text, nút bấm, vị trí.
Nếu được yêu cầu click vào đâu, trả về toạ độ x,y chính xác.`;

// ====== STATE ======
let history = [{ role: "system", content: SYSTEM_PROMPT }];
let currentAgent = "chat";
let groqQuotaExceeded = false;

// ====== DOM ======
const chatLog = document.getElementById("chatLog");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// ====== UTILS ======
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdown(text) {
  const parts = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    parts.push({ type: "code", lang: match[1] || "text", content: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ type: "text", content: text.slice(lastIndex) });

  let html = "";
  for (const p of parts) {
    if (p.type === "text") {
      html += `<div class="text-part">${escapeHtml(p.content).replace(/\n/g, "<br>")}</div>`;
    } else {
      const id = "code-" + Math.random().toString(36).slice(2, 9);
      html += `<div class="code-block">
        <div class="code-header"><span class="code-lang">${escapeHtml(p.lang)}</span>
        <button class="copy-btn" data-target="${id}">Copy</button></div>
        <pre><code id="${id}">${escapeHtml(p.content)}</code></pre></div>`;
    }
  }
  return html;
}

function bindCopyButtons(container) {
  container.querySelectorAll(".copy-btn").forEach(btn => {
    btn.onclick = () => {
      const el = document.getElementById(btn.getAttribute("data-target"));
      if (!el) return;
      navigator.clipboard.writeText(el.textContent).then(() => {
        btn.textContent = "Đã copy!";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1500);
      });
    };
  });
}

function addMsg(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.innerHTML = renderMarkdown(text);
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  bindCopyButtons(div);
  return div;
}

// ====== PROVIDER CALL ======
async function callProvider(provider, model, messages, stream = false) {
  const url = provider === "groq" ? GROQ_URL : OPENROUTER_URL;
  const key = provider === "groq" ? GROQ_KEY : OPENROUTER_KEY;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + key
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "http://localhost";
    headers["X-Title"] = "Rapheal Agent";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.7, stream })
  });

  if (res.status === 429 || res.status === 402) {
    const err = new Error("QUOTA_EXCEEDED");
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res;
}

// ====== CALL VỚI FALLBACK ======
async function callWithFallback(agentType, messages, stream = true) {
  const cfg = MODELS[agentType];
  const order = [cfg.primary, cfg.fallback];

  for (let i = 0; i < order.length; i++) {
    const m = order[i];
    try {
      console.log(`[Rapheal] Trying ${m.provider} / ${m.name}`);
      const res = await callProvider(m.provider, m.name, messages, stream);
      return { res, provider: m.provider, model: m.name };
    } catch (err) {
      if (err.message === "QUOTA_EXCEEDED") {
        console.warn(`[Rapheal] ${m.provider} hết quota, chuyển fallback...`);
        if (m.provider === "groq") groqQuotaExceeded = true;
        continue;
      }
      console.error(`[Rapheal] Lỗi ${m.provider}:`, err.message);
      if (i === order.length - 1) throw err;
    }
  }
  throw new Error("Tất cả provider đều thất bại");
}

// ====== STREAM HANDLER ======
async function streamResponse(res, botDiv) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  botDiv.innerHTML = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
    for (const line of lines) {
      const data = line.replace("data: ", "").trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices[0]?.delta?.content || "";
        full += delta;
        botDiv.innerHTML = renderMarkdown(full);
        chatLog.scrollTop = chatLog.scrollHeight;
      } catch (e) {}
    }
  }
  bindCopyButtons(botDiv);
  return full;
}

// ====== DETECT AGENT TYPE ======
function detectAgent(text) {
  const t = text.toLowerCase();
  if (/(code|hàm|script|viết|lập trình|debug|refactor|python|javascript|java|c\+\+)/i.test(t)) return "code";
  if (/(nhìn|ảnh|hình|màn hình|screenshot|vision|ocr|đọc chữ)/i.test(t)) return "vision";
  if (/(nhanh|gọn|tóm tắt|vắn tắt)/i.test(t)) return "fast";
  return "chat";
}

// ====== TOOL EXECUTION ======
async function callTool(action, args) {
  const res = await fetch("/api/tool", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Lỗi tool");
  return data.result;
}

function tryParseTool(text) {
  const t = text.trim();
  const match = t.match(/\{[\s\S]*"tool"[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (obj.tool) return obj;
  } catch (e) {}
  return null;
}

// ====== SEND ======
async function sendToRapheal(text) {
  // Trim history
  if (history.length > 22) {
    const sys = history[0];
    history = [sys, ...history.slice(-20)];
  }

  history.push({ role: "user", content: text });
  const botDiv = addMsg("...", "bot");

  const agentType = detectAgent(text);
  currentAgent = agentType;
  console.log(`[Rapheal] Agent: ${agentType}`);

  try {
    const { res, provider, model } = await callWithFallback(agentType, history, true);
    console.log(`[Rapheal] Response từ ${provider} / ${model}`);

    const full = await streamResponse(res, botDiv);
    history.push({ role: "assistant", content: full });

    const toolCall = tryParseTool(full);
    if (toolCall) {
      botDiv.innerHTML += `<div class="text-part" style="margin-top:8px;color:#ffcf5c">[Tool] ${toolCall.tool}...</div>`;
      try {
        const result = await callTool(toolCall.tool, toolCall.args || {});
        if (typeof result === "string" && result.startsWith("data:image")) {
          const img = document.createElement("img");
          img.src = result;
          img.style.maxWidth = "100%";
          img.style.borderRadius = "6px";
          botDiv.appendChild(img);
        } else {
          botDiv.innerHTML += `<div class="text-part" style="margin-top:6px">[${toolCall.tool}]\n${escapeHtml(String(result))}</div>`;
        }
        history.push({ role: "user", content: `[Kết quả tool ${toolCall.tool}]: ${String(result).slice(0, 1000)}` });
      } catch (e) {
        botDiv.innerHTML += `<div class="text-part" style="color:#ff7a1a">[Lỗi tool] ${escapeHtml(e.message)}</div>`;
      }
    }
  } catch (err) {
    botDiv.textContent = "[Lỗi] " + err.message;
  }
}

sendBtn.onclick = () => {
  const t = userInput.value.trim();
  if (!t) return;
  addMsg(t, "user");
  userInput.value = "";
  sendToRapheal(t);
};

userInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendBtn.click();
});

// ====== TTS: Deepgram Flux TTS ======
async function speakText(text) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENROUTER_KEY
      },
      body: JSON.stringify({
        model: "deepgram/flux-tts:free",
        input: text,
        voice: "aura-asteria-en"
      })
    });
    if (!res.ok) throw new Error("TTS failed");
    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
  } catch (e) {
    console.error("[TTS] Lỗi:", e.message);
  }
}

// ====== STT: Fish Audio S2.1 Pro ======
async function transcribeAudio(audioBlob) {
  try {
    const form = new FormData();
    form.append("file", audioBlob, "recording.webm");
    form.append("model", "fish-audio/s2.1-pro:free");

    const res = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + OPENROUTER_KEY },
      body: form
    });
    if (!res.ok) throw new Error("STT failed");
    const data = await res.json();
    return data.text || "";
  } catch (e) {
    console.error("[STT] Lỗi:", e.message);
    return "";
  }
}

// ====== COMPUTER USE - theo dõi chuột/phím ======
let computerUseMode = false;
function toggleComputerUse() {
  computerUseMode = !computerUseMode;
  console.log(`[Computer Use] ${computerUseMode ? "ON" : "OFF"}`);
}

// ====== OS AGENT - gửi task tới backend ======
async function osAgentTask(task) {
  try {
    const res = await fetch("/api/os_agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task })
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ====== RPA - chạy quy trình nhiều bước ======
async function runRPA(steps) {
  const results = [];
  for (const step of steps) {
    try {
      const r = await callTool(step.action, step.args || {});
      results.push({ step: step.action, ok: true, result: r });
      await new Promise(r => setTimeout(r, step.delay || 500));
    } catch (e) {
      results.push({ step: step.action, ok: false, error: e.message });
    }
  }
  return results;
}

// ====== HẠT BAY ======
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 600;

const cx = 300, cy = 300;
const particles = [];

for (let i = 0; i < 120; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 130 + Math.random() * 160;
  particles.push({
    angle, radius,
    speed: (0.002 + Math.random() * 0.006) * (Math.random() < 0.5 ? 1 : -1),
    size: 0.6 + Math.random() * 2,
    alpha: 0.3 + Math.random() * 0.7,
    color: Math.random() < 0.5 ? "#22e8c4" : "#ffcf5c",
    wobble: Math.random() * Math.PI * 2
  });
}

function drawParticles() {
  ctx.clearRect(0, 0, 600, 600);
  for (const p of particles) {
    p.angle += p.speed;
    p.wobble += 0.02;
    const r = p.radius + Math.sin(p.wobble) * 8;
    const x = cx + Math.cos(p.angle) * r;
    const y = cy + Math.sin(p.angle) * r;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.shadowBlur = 12;
    ctx.shadowColor = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(drawParticles);
}
drawParticles();
