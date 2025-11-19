-- 1. Xóa bảng cũ nếu tồn tại (Thứ tự quan trọng: xóa lịch sử trước, trạm sau)
DROP TABLE IF EXISTS station_history;
DROP TABLE IF EXISTS stations;
-- 2. Tạo bảng danh sách trạm (Lưu trạng thái hiện tại)
CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    -- Thêm UNIQUE để chúng ta có thể dùng ON CONFLICT (UPSERT)
    name VARCHAR(255) UNIQUE NOT NULL,
    city VARCHAR(100),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    aqi INTEGER,
    pm25 REAL,
    o3 REAL,
    co REAL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 3. Tạo bảng lịch sử (MỚI - Để lưu dữ liệu theo thời gian cho biểu đồ)
CREATE TABLE station_history (
    id SERIAL PRIMARY KEY,
    station_name VARCHAR(255) NOT NULL,
    -- Sẽ dùng tên trạm để khớp dữ liệu
    aqi INTEGER,
    pm25 REAL,
    o3 REAL,
    co REAL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 4. Tạo Index (Giúp vẽ biểu đồ nhanh hơn khi dữ liệu nhiều lên)
CREATE INDEX idx_history_name_time ON station_history(station_name, recorded_at);