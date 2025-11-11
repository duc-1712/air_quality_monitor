// API URL trỏ đến backend
const API_URL = "http://localhost:5000/api/stations";

// Khởi tạo bản đồ - Đảm bảo #map có kích thước
const map = L.map("map").setView([21.0285, 105.8542], 12);

// Thêm lớp nền (tile layer)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Hàm lấy màu theo AQI
function getAQIColor(aqi) {
  if (aqi <= 50) return "#00e400"; // Tốt
  if (aqi <= 100) return "#ffff00"; // Trung bình
  if (aqi <= 150) return "#ff7e00"; // Kém
  if (aqi <= 200) return "#ff0000"; // Xấu
  if (aqi <= 300) return "#8f3f97"; // Rất xấu
  return "#7e0023"; // Nguy hiểm
}

// Hàm chính để tải trạm
async function loadStations() {
  console.log("Đang gọi API tại:", API_URL);
  const list = document.getElementById("station-list");

  try {
    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const stations = await res.json();
    console.log("Đã nhận được dữ liệu:", stations);

    list.innerHTML = ""; // Xóa "Đang tải..."

    if (stations.length === 0) {
      list.innerHTML = "<li>Không tìm thấy trạm nào.</li>";
      return;
    }

    stations.forEach((st) => {
      const color = getAQIColor(st.aqi);

      // 1. Thêm vào danh sách (sidebar)
      const li = document.createElement("li");
      li.innerHTML = `<b>${st.name}</b><br><span style="color:${color}; font-weight: bold;">AQI: ${st.aqi}</span>`;
      li.onclick = () => map.setView([st.lat, st.lon], 14);
      list.appendChild(li);

      // 2. Thêm vào bản đồ (marker)
      L.circleMarker([st.lat, st.lon], {
        color: "black",
        weight: 1,
        fillColor: color,
        radius: 10,
        fillOpacity: 0.8,
      }).addTo(map).bindPopup(`
          <h3>${st.name}</h3>
          AQI: <b style="color:${color}; font-size: 1.2em;">${
        st.aqi
      }</b><br><hr>
          PM2.5: ${st.pm25 ?? "N/A"} µg/m³<br>
          O₃: ${st.o3 ?? "N/A"}<br>
          CO: ${st.co ?? "N/A"}<br>
          <small>Cập nhật: ${new Date(st.last_update).toLocaleString(
            "vi-VN"
          )}</small>
        `);
    });
  } catch (error) {
    console.error("LỖI KHI TẢI TRẠM:", error);
    list.innerHTML = `<li>Lỗi khi tải dữ liệu. Vui lòng kiểm tra Bảng điều khiển (F12) và đảm bảo backend đang chạy.</li>`;
  }
}

// Chạy hàm
loadStations();

// Tùy chọn: Tự động làm mới mỗi 5 phút
setInterval(loadStations, 5 * 60 * 1000);
