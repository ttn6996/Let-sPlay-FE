import { WarningOutlined } from '@ant-design/icons'
import type { Point } from './toolkit-types'

interface WeatherPanelProps {
  location: Point | null
  date: string
  weather: { chance: number | null; max: number | null } | null
  fallback: string
}

export function WeatherPanel({
  location,
  date,
  weather,
  fallback,
}: WeatherPanelProps) {
  return (
    <div className="toolkit-panel">
      <h2>Dự báo cho ngày hẹn</h2>
      {location && date && weather ? (
        <div className={`weather-card ${(weather.chance ?? 0) >= 50 ? 'weather-alert' : ''}`}>
          <strong>
            {(weather.chance ?? 0) >= 50 ? (
              <span className="weather-alert-heading">
                <WarningOutlined style={{ fontSize: 15 }} /> Có khả năng mưa cao
              </span>
            ) : (
              'Dự báo hiện tại'
            )}
          </strong>
          <p>
            {weather.chance == null
              ? 'Chưa có xác suất mưa'
              : `Khả năng mưa ${weather.chance}%`}{' '}
            {weather.max != null && ` · Nhiệt độ cao nhất ${weather.max}°C`}
          </p>
          <small>Dự báo có thể thay đổi; hãy kiểm tra lại gần ngày đi.</small>
          {(weather.chance ?? 0) >= 50 && fallback && (
            <p>
              <b>Phương án dự phòng:</b> {fallback}
            </p>
          )}
        </div>
      ) : (
        <p className="toolkit-muted">
          Chọn ngày và vị trí cuộc hẹn trong mục Kế hoạch để xem dự báo.
        </p>
      )}
      <p className="map-attribution">
        Dữ liệu dự báo: Open-Meteo · Bản đồ © OpenStreetMap contributors
      </p>
    </div>
  )
}
