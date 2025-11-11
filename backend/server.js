import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { pool } from "./db.js";
import { updateAQIData } from "./fetch_aqi.js";
import path from "path";
import { fileURLToPath } from "url";

// Fix cho __dirname trong ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc .env ở thư mục gốc
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Phục vụ các tệp tĩnh từ thư mục frontend
// (Giúp bạn chạy web bằng cách vào http://localhost:5000)
app.use(express.static(path.join(__dirname, "../frontend")));

// --- API CHO FRONTEND ---
app.get("/api/stations", async (req, res) => {
  console.log("Frontend đang gọi /api/stations...");
  try {
    // ĐỌC từ CSDL
    const { rows } = await pool.query(
      "SELECT * FROM stations WHERE city = 'Hanoi'"
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi khi truy vấn CSDL:", err.message);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

// --- LOGIC CHẠY NGẦM ---
app.listen(PORT, () => {
  console.log(`🌍 Server đang chạy tại http://localhost:${PORT}`);

  // 1. Chạy hàm update 1 lần ngay khi server khởi động
  console.log("Khởi động, đang lấy dữ liệu AQI lần đầu...");
  updateAQIData();

  // 2. Lên lịch tự động cập nhật mỗi 15 phút
  cron.schedule("*/15 * * * *", () => {
    console.log("Đã đến giờ (15 phút), đang tự động cập nhật dữ liệu AQI...");
    updateAQIData();
  });
});
