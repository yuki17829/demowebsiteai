// ============================================================
// DANH SÁCH MODULE / TOOL
// ------------------------------------------------------------
// Mỗi tool có trường "url":
//   - null  -> chưa có, hiện "Sắp ra mắt"
//   - Tên file (vd: "dos_wifi.zip") -> tải từ /api/download hoặc /filedownload/
// ============================================================
const TOOLS = [
  {
    id: "MOD-00",
    icon: "📡",
    name: "dos_wifi",
    desc: "Công cụ kiểm tra và phân tích tín hiệu WiFi xung quanh — quét kênh, đo cường độ sóng, phát hiện thiết bị lạ trong mạng LAN.",
    progress: 100,
    url: "dos_wifi.zip",
  },
  {
    id: "MOD-01",
    icon: "🎙",
    name: "Voice Sync",
    desc: "Nhận diện và tổng hợp giọng nói cho Rapheal, cho phép ra lệnh và nghe phản hồi bằng âm thanh.",
    progress: 62,
    url: null,
  },
  {
    id: "MOD-02",
    icon: "🗂",
    name: "File Sentinel",
    desc: "Quét, phân loại và dọn dẹp file rác tự động theo lịch, kèm báo cáo dung lượng đã giải phóng.",
    progress: 48,
    url: null,
  },
  {
    id: "MOD-03",
    icon: "🕸",
    name: "Task Weaver",
    desc: "Dựng quy trình tự động nhiều bước, ghép các lệnh lặp lại thành một kịch bản chạy một lần.",
    progress: 35,
    url: null,
  },
  {
    id: "MOD-04",
    icon: "👁",
    name: "Vision Core",
    desc: "Phân tích ảnh chụp màn hình, nhận diện văn bản (OCR) và mô tả nội dung hình ảnh.",
    progress: 70,
    url: null,
  },
  {
    id: "MOD-05",
    icon: "⌨",
    name: "Code Forge",
    desc: "Trợ lý sinh code nhanh theo yêu cầu, kèm giải thích và gợi ý refactor ngay trong chat.",
    progress: 80,
    url: null,
  },
  {
    id: "MOD-06",
    icon: "📡",
    name: "Net Watch",
    desc: "Theo dõi tình trạng mạng, độ trễ và cảnh báo khi có kết nối lạ hoặc bất thường.",
    progress: 27,
    url: null,
  },
  {
    id: "MOD-07",
    icon: "🗃",
    name: "Memory Vault",
    desc: "Lưu trữ ghi chú, đoạn hội thoại quan trọng và cho phép truy xuất lại theo từ khoá.",
    progress: 54,
    url: null,
  },
  {
    id: "MOD-08",
    icon: "🎛",
    name: "Macro Pulse",
    desc: "Ghi lại và phát lại chuỗi phím / chuột để tự động hoá các tác vụ lặp lại trên máy.",
    progress: 19,
    url: null,
  },
  {
    id: "MOD-09",
    icon: "📊",
    name: "Data Loom",
    desc: "Biến dữ liệu thô (CSV, log) thành biểu đồ trực quan chỉ trong vài giây.",
    progress: 40,
    url: null,
  },
  {
    id: "MOD-10",
    icon: "🛡",
    name: "Sentinel Guard",
    desc: "Quét lỗ hổng cơ bản, kiểm tra tiến trình lạ và cảnh báo rủi ro bảo mật hệ thống.",
    progress: 12,
    url: null,
  },
];

// ============================================================
// RENDER LƯỚI MODULE
// ============================================================
const toolGrid = document.getElementById("toolGrid");
const toolEmpty = document.getElementById("toolEmpty");
const toolSearch = document.getElementById("toolSearch");
const toolToast = document.getElementById("toolToast");

function showToast(text) {
  toolToast.textContent = text;
  toolToast.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toolToast.classList.remove("is-visible"), 2200);
}

function renderTools(list) {
  toolGrid.innerHTML = "";
  toolEmpty.hidden = list.length !== 0;

  list.forEach((tool, i) => {
    const isReady = !!tool.url;

    const card = document.createElement("article");
    card.className = "tool-card" + (isReady ? " is-ready" : "");
    card.style.animationDelay = (i * 0.05) + "s";

    card.innerHTML = `
      <div class="tool-card-top">
        <span class="tool-card-id">${tool.id}</span>
        <span class="tool-status ${isReady ? "ready" : "soon"}">
          <span class="tool-status-dot"></span>${isReady ? "Sẵn sàng" : "Sắp ra mắt"}
        </span>
      </div>
      <div class="tool-card-icon">${tool.icon}</div>
      <h3 class="tool-card-name">${tool.name}</h3>
      <p class="tool-card-desc">${tool.desc}</p>
      ${isReady ? "" : `
      <div class="tool-progress">
        <div class="tool-progress-fill" style="width:${tool.progress}%"></div>
      </div>`}
      <div class="tool-card-foot">
        <span class="tool-progress-label">${isReady ? "Đã đóng gói" : "Đang biên dịch · " + tool.progress + "%"}</span>
        <button class="tool-download ${isReady ? "is-ready" : "is-locked"}" data-name="${tool.name}" data-url="${tool.url || ""}">
          ${isReady ? "Tải xuống" : "Sắp ra mắt"}
        </button>
      </div>
    `;
    toolGrid.appendChild(card);
  });

  document.getElementById("statTotal").textContent = TOOLS.length;
  document.getElementById("statReady").textContent = TOOLS.filter(t => t.url).length;
  document.getElementById("statSoon").textContent = TOOLS.filter(t => !t.url).length;
}

renderTools(TOOLS);

// ============================================================
// TẢI FILE
//   - Nếu đang chạy qua Flask (localhost) -> gọi /api/download?file=...
//   - Nếu mở trực tiếp bằng browser (file://) -> tải từ ./filedownload/...
// ============================================================
function buildDownloadUrl(filename) {
  const isLocalServer = location.protocol === "http:" || location.protocol === "https:";
  if (isLocalServer && location.hostname === "127.0.0.1") {
    // Chạy qua Flask backend
    return `/api/download?file=${encodeURIComponent(filename)}`;
  }
  // Chạy qua browser thuần -> đọc thư mục filedownload cạnh web/
  return `./filedownload/${encodeURIComponent(filename)}`;
}

toolGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".tool-download");
  if (!btn) return;

  const url = btn.getAttribute("data-url");
  const name = btn.getAttribute("data-name");

  if (!url) {
    showToast(`"${name}" chưa mở khoá — module đang được hoàn thiện.`);
    return;
  }

  const downloadUrl = buildDownloadUrl(url);
  console.log(`[Download] ${name} -> ${downloadUrl}`);

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = url;
  document.body.appendChild(a);
  a.click();
  a.remove();

  showToast(`Đang tải "${name}"...`);
});

// ============================================================
// TÌM KIẾM / LỌC MODULE
// ============================================================
toolSearch.addEventListener("input", () => {
  const q = toolSearch.value.trim().toLowerCase();
  const filtered = TOOLS.filter(t =>
    t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
  );
  renderTools(filtered);
});