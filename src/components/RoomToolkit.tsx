import { useEffect, useMemo, useState } from 'react'
import {
  api,
  createRoomExpense,
  createRoomSettlement,
  deleteRoomExpense,
  getRoomCollaboration,
  getRoomExpenses,
  markRoomNotificationsRead,
  saveMeetupPoint,
  saveRoomPreferences,
  saveRoomRide,
  updateRoomExpense,
  updateRoomPlan,
  type RoomExpenseBook,
} from '../api'
import type { Room } from '../types'
import { PlanPanel } from './toolkit/PlanPanel'
import { AttendancePanel } from './toolkit/AttendancePanel'
import { NotificationsPanel } from './toolkit/NotificationsPanel'
import { ExpensesPanel } from './toolkit/ExpensesPanel'
import { RecommendPanel } from './toolkit/RecommendPanel'
import { RidesPanel } from './toolkit/RidesPanel'
import { WeatherPanel } from './toolkit/WeatherPanel'
import { syncGoogleCalendar } from './toolkit/toolkit-calendar'
import { distanceKm, type Point, type Place } from './toolkit/toolkit-types'

export type { Point, Place }

export function RoomToolkit({
  room,
  roomId,
  token,
  onRoom,
}: {
  room: Room
  roomId: string
  token: string
  onRoom: (room: Room) => void
}) {
  const [panel, setPanel] = useState('plan')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<Awaited<ReturnType<typeof getRoomCollaboration>>['data'] | null>(
    null
  )
  const [book, setBook] = useState<RoomExpenseBook | null>(null)

  const [name, setName] = useState(room.name)
  const [date, setDate] = useState(room.eventDate ?? '')
  const [time, setTime] = useState(room.eventTime?.slice(0, 5) ?? '')
  const [region, setRegion] = useState(room.region ?? '')
  const [notes, setNotes] = useState(room.planNotes ?? '')
  const [fallback, setFallback] = useState(room.weatherFallback ?? '')
  const [location, setLocation] = useState<Point | null>(
    room.eventLatitude != null && room.eventLongitude != null
      ? { lat: room.eventLatitude, lon: room.eventLongitude }
      : null
  )
  const [meetup, setMeetup] = useState<Point | null>(
    room.meetupLatitude != null && room.meetupLongitude != null
      ? { lat: room.meetupLatitude, lon: room.meetupLongitude }
      : null
  )

  const [weather, setWeather] = useState<{ chance: number | null; max: number | null } | null>(
    null
  )

  const [prefs, setPrefs] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [hasVehicle, setHasVehicle] = useState(false)
  const [seats, setSeats] = useState('0')
  const [pickup, setPickup] = useState('')
  const [rideNote, setRideNote] = useState('')

  const [expenseId, setExpenseId] = useState('')
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseTotal, setExpenseTotal] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [payers, setPayers] = useState<Record<string, string>>({})
  const [shares, setShares] = useState<Record<string, string>>({})

  const expenseMembers = useMemo(() => {
    const members = new globalThis.Map(
      room.members.map((m) => [m.id, { id: m.id, displayName: m.displayName }])
    )
    const old = book?.expenses.find((e) => e.id === expenseId)
    ;[...(old?.payers ?? []), ...(old?.shares ?? [])].forEach((m) => {
      if (!members.has(m.membershipId)) {
        members.set(m.membershipId, {
          id: m.membershipId,
          displayName: m.displayName + ' (đã rời phòng)',
        })
      }
    })
    return [...members.values()]
  }, [room.members, book, expenseId])

  async function refresh() {
    try {
      const [collab, expenses] = await Promise.all([
        getRoomCollaboration(roomId, token),
        getRoomExpenses(roomId, token),
      ])
      setData(collab.data)
      setBook(expenses.data)
      const p = collab.data.preferences.find((x) => x.membershipId === room.member.id)
      if (p) {
        setPrefs(p.preferences)
        setBudgetMin(p.budgetMin ? String(p.budgetMin) : '')
        setBudgetMax(p.budgetMax ? String(p.budgetMax) : '')
      }
      const r = collab.data.rides.find((x) => x.membershipId === room.member.id)
      if (r) {
        setHasVehicle(r.hasVehicle)
        setSeats(String(r.seatsAvailable))
        setPickup(r.pickupArea)
        setRideNote(r.note)
      }
    } catch {
      setError('Không tải được dữ liệu hoạt động của phòng.')
    }
  }

  useEffect(() => {
    void refresh()
  }, [roomId, token, room.revision])

  useEffect(() => {
    setName(room.name)
    setDate(room.eventDate ?? '')
    setTime(room.eventTime?.slice(0, 5) ?? '')
    setRegion(room.region ?? '')
    setNotes(room.planNotes ?? '')
    setFallback(room.weatherFallback ?? '')
    setLocation(
      room.eventLatitude != null && room.eventLongitude != null
        ? { lat: room.eventLatitude, lon: room.eventLongitude }
        : null
    )
    setMeetup(
      room.meetupLatitude != null && room.meetupLongitude != null
        ? { lat: room.meetupLatitude, lon: room.meetupLongitude }
        : null
    )
  }, [room])

  useEffect(() => {
    if (!location || !date) {
      setWeather(null)
      return
    }
    let cancelled = false
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.search = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lon),
      daily: 'precipitation_probability_max,temperature_2m_max',
      start_date: date,
      end_date: date,
      timezone: 'auto',
    }).toString()

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((payload) => {
        if (!cancelled) {
          const chance = payload.daily?.precipitation_probability_max?.[0] ?? null
          const max = payload.daily?.temperature_2m_max?.[0] ?? null
          setWeather({ chance, max })
          const key = `letsplay.weather.${roomId}.${date}`
          if (
            chance != null &&
            chance >= 50 &&
            'Notification' in window &&
            Notification.permission === 'granted' &&
            !sessionStorage.getItem(key)
          ) {
            new Notification('Có khả năng mưa trong ngày hẹn', {
              body: fallback
                ? `Phương án dự phòng: ${fallback}`
                : 'Mở phòng để xem thời tiết và cập nhật kế hoạch.',
            })
            sessionStorage.setItem(key, '1')
          }
        }
      })
      .catch(() => {
        if (!cancelled) setWeather(null)
      })

    return () => {
      cancelled = true
    }
  }, [location, date, roomId, fallback])

  async function action(run: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await run()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được thay đổi. Vui lòng thử lại.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function savePlan(cancelled = false): Promise<boolean> {
    const result = await action(async () => {
      const r = await updateRoomPlan(
        roomId,
        {
          name,
          eventDate: date || null,
          eventTime: time || null,
          region: region || null,
          notes: notes || null,
          latitude: location?.lat ?? null,
          longitude: location?.lon ?? null,
          weatherFallback: fallback || null,
          cancelled,
        },
        token
      )
      onRoom(r.data)
    })
    if (result) await refresh()
    return result
  }

  async function handleSyncCalendar(): Promise<boolean> {
    return await action(() => syncGoogleCalendar(room, roomId, token))
  }

  function handleSetLocation(point: Point | null, regionName?: string) {
    setLocation(point)
    if (regionName) setRegion(regionName)
  }

  function handleSetMeetup(point: Point | null) {
    setMeetup(point)
    if (point) {
      void saveMeetupPoint(roomId, point.lat, point.lon, token).catch(() =>
        setError('Không lưu được điểm xuất phát chung.')
      )
    }
  }

  async function savePrefs() {
    if (
      await action(() =>
        saveRoomPreferences(
          roomId,
          {
            preferences: prefs,
            budgetMin: budgetMin ? Number(budgetMin) : null,
            budgetMax: budgetMax ? Number(budgetMax) : null,
          },
          token
        )
      )
    ) {
      void refresh()
    }
  }

  async function saveRideForm() {
    if (
      await action(() =>
        saveRoomRide(
          roomId,
          {
            hasVehicle,
            seatsAvailable: Number(seats) || 0,
            pickupArea: pickup,
            note: rideNote,
          },
          token
        )
      )
    ) {
      void refresh()
    }
  }

  function beginEdit(e: RoomExpenseBook['expenses'][number]) {
    setExpenseId(e.id)
    setExpenseTitle(e.title)
    setExpenseTotal(String(e.totalAmount))
    setExpenseNote(e.note)
    setPayers(Object.fromEntries(e.payers.map((x) => [x.membershipId, String(x.amount)])))
    setShares(Object.fromEntries(e.shares.map((x) => [x.membershipId, String(x.amount)])))
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    const total = Number(expenseTotal)
    const payerRows = Object.entries(payers)
      .filter(([, v]) => Number(v) > 0)
      .map(([membershipId, v]) => ({ membershipId, amount: Number(v) }))
    const shareRows = Object.entries(shares)
      .filter(([, v]) => Number(v) >= 0 && v !== '')
      .map(([membershipId, v]) => ({ membershipId, amount: Number(v) }))

    if (
      payerRows.reduce((s, x) => s + x.amount, 0) !== total ||
      shareRows.reduce((s, x) => s + x.amount, 0) !== total
    ) {
      setError('Tổng tiền người trả và phần chia phải bằng tổng khoản chi.')
      return
    }

    const payload = {
      title: expenseTitle,
      totalAmount: total,
      note: expenseNote || undefined,
      payers: payerRows,
      shares: shareRows,
    }

    const ok = await action(() =>
      expenseId
        ? updateRoomExpense(roomId, expenseId, payload, token)
        : createRoomExpense(roomId, payload, token)
    )

    if (ok) {
      setExpenseId('')
      setExpenseTitle('')
      setExpenseTotal('')
      setExpenseNote('')
      setPayers({})
      setShares({})
      void refresh()
    }
  }

  async function confirmTransfer(transfer: {
    fromMembershipId: string
    toMembershipId: string
    amount: number
  }) {
    if (await action(() => createRoomSettlement(roomId, transfer, token))) void refresh()
  }

  const suggestion = useMemo(() => {
    const budgets =
      data?.preferences.filter((p) => p.budgetMax > 0).map((p) => p.budgetMax) ?? []
    const limit = budgets.length ? Math.min(...budgets) : null
    const keywords = (
      data?.preferences.flatMap((p) => p.preferences.toLocaleLowerCase().split(/[,;\s]+/)) ?? []
    ).filter((word) => word.length > 2)

    return room.proposals
      .map((p) => {
        const text = `${p.title} ${p.description ?? ''} ${p.location ?? ''}`.toLocaleLowerCase()
        const preferenceScore = keywords.filter((word) => text.includes(word)).length
        return {
          proposal: p,
          distance:
            p.latitude != null && p.longitude != null && meetup
              ? distanceKm({ lat: p.latitude, lon: p.longitude }, meetup)
              : null,
          preferenceScore,
          withinBudget:
            !limit || p.estimatedCostPerPerson == null || p.estimatedCostPerPerson <= limit,
        }
      })
      .sort(
        (a, b) =>
          Number(b.withinBudget) - Number(a.withinBudget) ||
          b.preferenceScore - a.preferenceScore ||
          (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) ||
          b.proposal.voteCount - a.proposal.voteCount
      )
  }, [room.proposals, data, meetup])

  return (
    <section className="room-toolkit !w-full">
      <div className="toolkit-tabs !w-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 !gap-2 !p-2.5 !overflow-visible !bg-stone-50 !rounded-xl !border !border-stone-200">
        {[
          ['plan', 'Kế hoạch'],
          ['attendance', 'Tham gia'],
          ['notifications', 'Thông báo'],
          ['expenses', 'Chia tiền'],
          ['recommend', 'Gợi ý'],
          ['rides', 'Đi chung'],
          ['weather', 'Thời tiết'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`!w-full !flex !items-center !justify-center !text-center !py-2.5 !px-2 !rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              panel === id ? 'active !bg-white !shadow-xs !text-emerald-950 font-bold' : ''
            }`}
            onClick={() => setPanel(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="toolkit-error">
          {error}
        </p>
      )}

      {panel === 'plan' && (
        <PlanPanel
          room={room}
          busy={busy}
          name={name}
          setName={setName}
          date={date}
          setDate={setDate}
          time={time}
          setTime={setTime}
          region={region}
          setRegion={setRegion}
          notes={notes}
          setNotes={setNotes}
          fallback={fallback}
          setFallback={setFallback}
          location={location}
          meetup={meetup}
          onSetLocation={handleSetLocation}
          onSetMeetup={handleSetMeetup}
          onSavePlan={savePlan}
          onSyncCalendar={handleSyncCalendar}
          planHistory={data?.planHistory}
        />
      )}

      {panel === 'attendance' && (
        <AttendancePanel
          room={room}
          attendance={data?.attendance}
          onUpdateStatus={(status) =>
            void action(async () => {
              const r = await api.put<Room>(
                `/rooms/${roomId}/attendance`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
              )
              onRoom(r.data)
              await refresh()
            })
          }
        />
      )}

      {panel === 'notifications' && (
        <NotificationsPanel
          notifications={data?.notifications}
          onMarkRead={() =>
            void action(async () => {
              await markRoomNotificationsRead(roomId, token)
              await refresh()
            })
          }
        />
      )}

      {panel === 'expenses' && (
        <ExpensesPanel
          room={room}
          book={book}
          busy={busy}
          expenseId={expenseId}
          setExpenseId={setExpenseId}
          expenseTitle={expenseTitle}
          setExpenseTitle={setExpenseTitle}
          expenseTotal={expenseTotal}
          setExpenseTotal={setExpenseTotal}
          expenseNote={expenseNote}
          setExpenseNote={setExpenseNote}
          payers={payers}
          setPayers={setPayers}
          shares={shares}
          setShares={setShares}
          expenseMembers={expenseMembers}
          onSaveExpense={saveExpense}
          onBeginEdit={beginEdit}
          onDeleteExpense={(id) =>
            void action(async () => {
              await deleteRoomExpense(roomId, id, token)
              await refresh()
            })
          }
          onConfirmTransfer={(transfer) => void confirmTransfer(transfer)}
        />
      )}

      {panel === 'recommend' && (
        <RecommendPanel
          prefs={prefs}
          setPrefs={setPrefs}
          budgetMin={budgetMin}
          setBudgetMin={setBudgetMin}
          budgetMax={budgetMax}
          setBudgetMax={setBudgetMax}
          onSavePrefs={savePrefs}
          suggestion={suggestion}
        />
      )}

      {panel === 'rides' && (
        <RidesPanel
          hasVehicle={hasVehicle}
          setHasVehicle={setHasVehicle}
          seats={seats}
          setSeats={setSeats}
          pickup={pickup}
          setPickup={setPickup}
          rideNote={rideNote}
          setRideNote={setRideNote}
          onSaveRide={saveRideForm}
          rides={data?.rides}
        />
      )}

      {panel === 'weather' && (
        <WeatherPanel
          location={location}
          date={date}
          weather={weather}
          fallback={fallback}
        />
      )}
    </section>
  )
}
