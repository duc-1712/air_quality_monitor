-- Xóa bảng cũ nếu tồn tại để chạy lại từ đầu
DROP TABLE IF EXISTS stations;
-- Tạo bảng mới
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