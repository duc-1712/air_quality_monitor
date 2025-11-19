import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { pool } from "./db.js";
import { updateAQIData } from "./fetch_aqi.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// --- API 1: LẤY DANH SÁCH TRẠM (Cho bản đồ) ---
app.get("/api/stations", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM stations WHERE city = 'Hanoi'"
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi DB:", err.message);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

// --- API 2: LẤY LỊCH SỬ (Cho biểu đồ) - ĐÃ CẬP NHẬT ---
app.get("/api/history", async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "Thiếu tên trạm" });

  try {
    // Lấy đủ các chỉ số: PM2.5, PM10, NO2, CO, O3
    const { rows } = await pool.query(
      `SELECT recorded_at, pm25, pm10, no2, co, o3 
       FROM station_history 
       WHERE station_name = $1 
       ORDER BY recorded_at ASC`,
      [name]
    );

    // Chuẩn hóa dữ liệu trả về
    const times = rows.map((row) => {
      const d = new Date(row.recorded_at);
      return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00`;
    });

    res.json({
      times: times,
      pm25: rows.map((row) => row.pm25),
      pm10: rows.map((row) => row.pm10),
      no2: rows.map((row) => row.no2),
      co: rows.map((row) => row.co),
      o3: rows.map((row) => row.o3),
    });
  } catch (err) {
    console.error("Lỗi lấy lịch sử:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

app.listen(PORT, () => {
  console.log(`🌍 Server đang chạy tại http://localhost:${PORT}`);

  console.log("Khởi động, lấy dữ liệu lần đầu...");
  updateAQIData();

  cron.schedule("*/15 * * * *", () => {
    console.log("Đến giờ cập nhật (15 phút)...");
    updateAQIData();
  });
});
