const API_URL = "http://localhost:5000/api/stations";
const HISTORY_API_URL = "http://localhost:5000/api/history";

// 1. Khởi tạo bản đồ
const map = L.map("map").setView([21.0285, 105.8542], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

// --- FIX LAG: Dùng LayerGroup ---
const markersLayer = L.layerGroup().addTo(map);

// --- QUẢN LÝ BIỂU ĐỒ ---
// Lưu trữ các instance biểu đồ để xóa đi vẽ lại tránh lỗi
let chartInstances = {};

function getAQIColor(aqi) {
  if (aqi <= 50) return "#00e400";
  if (aqi <= 100) return "#ffff00";
  if (aqi <= 150) return "#ff7e00";
  if (aqi <= 200) return "#ff0000";
  if (aqi <= 300) return "#8f3f97";
  return "#7e0023";
}

const AQI_ADVICE = [
  { max: 50, advice: "Không khí trong lành." },
  { max: 100, advice: "Chấp nhận được, nhóm nhạy cảm cần chú ý." },
  { max: 150, advice: "Hạn chế hoạt động ngoài trời." },
  { max: 200, advice: "Không khí xấu, tránh ra ngoài." },
  { max: 300, advice: "Rất xấu, mọi người nên ở trong nhà." },
  { max: Infinity, advice: "Nguy hại! Đeo khẩu trang chuyên dụng." },
];

function getAQIAdvice(aqi) {
  const item = AQI_ADVICE.find((a) => aqi <= a.max);
  return item ? item.advice : "Không có dữ liệu.";
}

// --- HÀM HỖ TRỢ VẼ 1 BIỂU ĐỒ ---
function renderSingleChart(domId, title, color, times, values) {
  const dom = document.getElementById(domId);
  if (!dom) return;

  // Nếu biểu đồ cũ đang tồn tại ở div này, hủy nó đi
  if (chartInstances[domId]) {
    chartInstances[domId].dispose();
  }

  const myChart = echarts.init(dom);
  chartInstances[domId] = myChart; // Lưu lại instance mới

  const option = {
    title: {
      text: title,
      left: "left",
      textStyle: { fontSize: 14, fontWeight: "bold" },
    },
    tooltip: { trigger: "axis" },
    grid: {
      left: "40px",
      right: "20px",
      bottom: "40px",
      top: "40px",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: times,
    },
    yAxis: {
      type: "value",
      name: "µg/m³",
    },
    dataZoom: [
      { type: "slider", start: 70, end: 100 }, // Zoom mặc định xem 30% cuối
      { type: "inside" },
    ],
    series: [
      {
        name: title,
        type: "line",
        smooth: true,
        itemStyle: { color: color },
        areaStyle: { opacity: 0.2, color: color },
        data: values,
      },
    ],
  };

  myChart.setOption(option);
  window.addEventListener("resize", () => myChart.resize());
}

// --- HÀM HIỂN THỊ TOÀN BỘ BIỂU ĐỒ ---
async function showStationChart(stationName) {
  // 1. Scroll xuống
  const bottomContainer = document.getElementById("bottom-container");
  if (bottomContainer) bottomContainer.scrollIntoView({ behavior: "smooth" });

  // 2. Update UI
  document.getElementById("chart-instruction").style.display = "none";
  document.getElementById(
    "chart-title"
  ).innerText = `Lịch sử quan trắc: ${stationName}`;

  try {
    // 3. Gọi API
    const res = await fetch(
      `${HISTORY_API_URL}?name=${encodeURIComponent(stationName)}`
    );
    const data = await res.json();

    if (!data.times || data.times.length === 0) {
      console.warn("Không có dữ liệu lịch sử");
      return;
    }

    // 4. Vẽ lần lượt 4 biểu đồ
    // PM2.5 (Xanh dương)
    renderSingleChart(
      "chart-pm25",
      "Nồng độ PM2.5",
      "#0098d9",
      data.times,
      data.pm25
    );
    // PM10 (Xanh lá)
    renderSingleChart(
      "chart-pm10",
      "Nồng độ PM10",
      "#00e400",
      data.times,
      data.pm10
    );
    // NO2 (Cam)
    renderSingleChart(
      "chart-no2",
      "Nồng độ NO2",
      "#ff7e00",
      data.times,
      data.no2
    );
    // CO (Đỏ đậm)
    renderSingleChart("chart-co", "Nồng độ CO", "#7e0023", data.times, data.co);
  } catch (err) {
    console.error("Lỗi tải biểu đồ:", err);
    document.getElementById("charts-wrapper").innerHTML =
      "<p style='text-align:center; color:red; padding-top:20px'>Lỗi tải dữ liệu hoặc chưa có dữ liệu lịch sử.</p>";
  }
}

// --- LOGIC TẢI TRẠM (Đã tối ưu) ---
async function loadStations() {
  const list = document.getElementById("station-list");
  try {
    const res = await fetch(API_URL);
    const stations = await res.json();

    list.innerHTML = "";

    // XÓA MARKER CŨ (Fix lag)
    markersLayer.clearLayers();

    if (stations.length === 0) {
      list.innerHTML = "<li>Không tìm thấy trạm nào.</li>";
      return;
    }

    stations.forEach((st) => {
      const color = getAQIColor(st.aqi);
      const advice = getAQIAdvice(st.aqi);

      // 1. Sidebar List
      const li = document.createElement("li");
      li.innerHTML = `<b>${st.name}</b><br>
        <span style="color:${color}; font-weight: bold;">AQI: ${st.aqi}</span><br>
        <small>${advice}</small>`;

      li.onclick = () => {
        map.setView([st.lat, st.lon], 14);
        showStationChart(st.name);
      };
      list.appendChild(li);

      // 2. Marker Map
      const marker = L.circleMarker([st.lat, st.lon], {
        color: "black",
        weight: 1,
        fillColor: color,
        radius: 10,
        fillOpacity: 0.8,
      });

      const popupContent = `
          <h3>${st.name}</h3>
          AQI: <b style="color:${color}; font-size: 1.2em;">${st.aqi}</b><br>
          PM2.5: ${st.pm25 ?? "N/A"} µg/m³<br>
          <hr>
          <button id="btn-${
            st.id
          }" style="background:#007bff; color:white; border:none; padding:5px; cursor:pointer; width:100%">Xem lịch sử chi tiết</button>
      `;

      marker.bindPopup(popupContent);
      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-${st.id}`);
        if (btn) btn.onclick = () => showStationChart(st.name);
      });

      markersLayer.addLayer(marker);
    });
  } catch (error) {
    console.error("Lỗi tải trạm:", error);
    list.innerHTML = "<li>Lỗi kết nối backend.</li>";
  }
}

loadStations();
setInterval(loadStations, 5 * 60 * 1000);

// Toggle sidebar
const toggleBtn = document.getElementById("toggle-sidebar");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("hidden");
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
});
