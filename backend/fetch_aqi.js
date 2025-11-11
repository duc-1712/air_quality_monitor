import fetch from "node-fetch";
import { pool } from "./db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix cho __dirname trong ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc tệp .env ở thư mục gốc
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TOKEN = process.env.AQICN_TOKEN;

// SỬA LỖI: Quay lại dùng TỌA ĐỘ (geo) đã được xác minh 100%
const STATIONS = [
  { lat: 21.0285, lon: 105.8542 }, // US Embassy
  { lat: 21.0133, lon: 105.8166 }, // Lang Ha
  { lat: 21.0686, lon: 105.8223 }, // Tay Ho (Phu Thuong)
];

export async function updateAQIData() {
  console.log("Bắt đầu cập nhật dữ liệu AQI (dùng tọa độ geo)...");
  if (!TOKEN) {
    console.error("LỖI: Không tìm thấy AQICN_TOKEN. Hãy kiểm tra tệp .env.");
    return;
  }

  for (const station of STATIONS) {
    // SỬA LỖI: Dùng API geo
    const url = `https://api.waqi.info/feed/geo:${station.lat};${station.lon}/?token=${TOKEN}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      // Kiểm tra kỹ dữ liệu trả về
      if (
        data.status === "ok" &&
        typeof data.data === "object" &&
        data.data.city
      ) {
        const d = data.data;
        const aqi = d.aqi;

        // API geo trả về tên trạm trong 'd.city.name'
        const station_name = d.city.name;
        const real_lat = d.city.geo[0];
        const real_lon = d.city.geo[1];

        const pm25 = d.iaqi?.pm25?.v ?? null;
        const o3 = d.iaqi?.o3?.v ?? null;
        const co = d.iaqi?.co?.v ?? null;

        // Dùng INSERT... ON CONFLICT (UPSERT)
        // Chúng ta dùng 'station_name' (tên trạm) làm khóa UNIQUE
        await pool.query(
          `INSERT INTO stations (name, city, lat, lon, aqi, pm25, o3, co, last_update)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                     ON CONFLICT (name) DO UPDATE SET
                         city = EXCLUDED.city,
                         lat = EXCLUDED.lat,
                         lon = EXCLUDED.lon,
                         aqi = EXCLUDED.aqi,
                         pm25 = EXCLUDED.pm25,
                         o3 = EXCLUDED.o3,
                         co = EXCLUDED.co,
                         last_update = NOW()`,
          // Chúng ta giả định city là "Hanoi"
          [station_name, "Hanoi", real_lat, real_lon, aqi, pm25, o3, co]
        );

        console.log(`✅ Updated: ${station_name} (AQI: ${aqi})`);
      } else {
        console.warn(
          `⚠️ Failed to fetch data for geo:${station.lat};${station.lon}: ${data.data}`
        );
      }
    } catch (err) {
      console.error(
        `❌ Error fetching geo:${station.lat};${station.lon}:`,
        err
      );
    }
  }
  console.log("Cập nhật AQI hoàn tất.");
}
