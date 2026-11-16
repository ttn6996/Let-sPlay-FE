interface RidesPanelProps {
  hasVehicle: boolean
  setHasVehicle: (val: boolean) => void
  seats: string
  setSeats: (val: string) => void
  pickup: string
  setPickup: (val: string) => void
  rideNote: string
  setRideNote: (val: string) => void
  onSaveRide: () => Promise<void>
  rides?: Array<{
    membershipId: string
    displayName: string
    registered: boolean
    hasVehicle: boolean
    seatsAvailable: number
    pickupArea: string
  }>
}

export function RidesPanel({
  hasVehicle,
  setHasVehicle,
  seats,
  setSeats,
  pickup,
  setPickup,
  rideNote,
  setRideNote,
  onSaveRide,
  rides,
}: RidesPanelProps) {
  return (
    <div className="toolkit-panel">
      <h2>Đi chung xe</h2>
      <form
        className="toolkit-form"
        onSubmit={(e) => {
          e.preventDefault()
          void onSaveRide()
        }}
      >
        <label className="inline-check">
          <input
            type="checkbox"
            checked={hasVehicle}
            onChange={(e) => setHasVehicle(e.target.checked)}
          />
          Mình có xe
        </label>
        {hasVehicle && (
          <label>
            Số chỗ còn trống
            <input
              type="number"
              min="0"
              max="20"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </label>
        )}
        <label>
          Khu vực có thể đón
          <input value={pickup} onChange={(e) => setPickup(e.target.value)} />
        </label>
        <label>
          Ghi chú
          <input value={rideNote} onChange={(e) => setRideNote(e.target.value)} />
        </label>
        <button className="primary-button">Lưu thông tin xe</button>
      </form>
      <div className="attendance-list">
        {rides?.map((r) => (
          <div key={r.membershipId}>
            <strong>
              {r.displayName}
              {!r.registered
                ? ' · chưa cập nhật'
                : r.hasVehicle
                ? ` · có xe (${r.seatsAvailable} chỗ trống)`
                : ' · không có xe'}
            </strong>
            <span>{r.pickupArea}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
