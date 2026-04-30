// 固定の開催時間（朝9時〜10時）
const START_TIME = "09:00";
const END_TIME = "10:00";

// CSVを読み込んで配列に変換
async function loadCSV() {
  const response = await fetch("data.csv");
  const text = await response.text();

  // CRLF / LF 両対応
  const lines = text.trim().split(/\r?\n/);

  // BOM除去
  lines[0] = lines[0].replace(/^\uFEFF/, "");

  const headers = lines[0].split(",");

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const cleanLine = lines[i].replace(/^\uFEFF/, "").replace(/\r$/, "");
    const cols = cleanLine.split(",");

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx];
    });

  data.push({
    id: row["ID"],
    date: row["開催日"],
    reason: row["理由"] || ""
  });
  }

  return data;
}

// Googleカレンダー登録
function addToCalendar(dateStr) {
  const title = encodeURIComponent("芝刈り当番");
  const details = encodeURIComponent("保育園の芝刈り当番です");

  const start = new Date(`${dateStr} ${START_TIME}`).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const end = new Date(`${dateStr} ${END_TIME}`).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const url =
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}` +
    `&dates=${start}/${end}&details=${details}`;

  window.open(url, "_blank");
}

// ID検索
async function search() {
  let id = document.getElementById("inputId").value.trim();
  const result = document.getElementById("result");

  if (!id) {
    result.innerHTML = "IDを入力してください。";
    return;
  }

  // ★ 全角 → 半角に変換
  id = toHalfWidth(id).toUpperCase();

  const data = await loadCSV();
  const hit = data.find(item => item.id === id);

  if (hit) {
    result.innerHTML =
      `ID「${id}」の当番日は <span class="result-date">${formatDate(hit.date)}</span> です。<br><br>` +
      `<button onclick="addToCalendar('${hit.date}')">Googleカレンダーに登録</button>`;
  } else {
    result.innerHTML = "該当するIDが見つかりません。";
  }
}

function toHalfWidth(str) {
  return str.replace(/[！-～]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
}

function normalizeInput() {
  const input = document.getElementById("inputId");
  input.value = toHalfWidth(input.value).toUpperCase();
}

// CSVからID一覧を読み込み、datalist にセット
async function setupIdList() {
  const data = await loadCSV();
  const list = document.getElementById("idlist");

  data.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    list.appendChild(option);
  });
}

// 全体スケジュール表示（日付 → ID一覧）
async function showAllSchedule() {
  const data = await loadCSV();

  // 日付ごとにまとめる（ID と理由を保持）
  const grouped = {};
  data.forEach(item => {
    if (!grouped[item.date]) {
      grouped[item.date] = { ids: [], reason: item.reason };
    }
    if (item.id) {
      grouped[item.date].ids.push(item.id);
    }
  });

  // CSV に存在する日付をすべて取得（ソート）
  const dates = Object.keys(grouped).sort();

  // 最大ID数
  const maxIds = Math.max(
    ...dates.map(date => grouped[date].ids.length),
    1
  );

  let html = "<div class='table-wrapper'><table>";

  html += `<tr>
    <th rowspan="1">日付</th>
    <th colspan="${maxIds}">当番割り当て（ID）</th>
  </tr>`;

  dates.forEach(date => {
    const entry = grouped[date];

    if (entry.reason) {
      // ★ お休み週
      html += `<tr class="off">
        <td>${formatDate(date)}</td>
        <td colspan="${maxIds}">${entry.reason}</td>
      </tr>`;
    } else {
      // ★ 通常週
      html += `<tr><td>${formatDate(date)}</td>`;
      for (let i = 0; i < maxIds; i++) {
        html += `<td>${entry.ids[i] ? entry.ids[i] : ""}</td>`;
      }
      html += "</tr>";
    }
  });

  html += "</table></div>";

  document.getElementById("allSchedule").innerHTML = html;
}

// 日付整形
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}


window.onload = function() {
  showAllSchedule();
  setupIdList();
};