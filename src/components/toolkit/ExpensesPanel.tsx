import type React from 'react'
import { money } from './toolkit-types'
import type { RoomExpenseBook } from '../../api'
import type { Room } from '../../types'

interface ExpensesPanelProps {
  room: Room
  book: RoomExpenseBook | null
  busy: boolean
  expenseId: string
  setExpenseId: (val: string) => void
  expenseTitle: string
  setExpenseTitle: (val: string) => void
  expenseTotal: string
  setExpenseTotal: (val: string) => void
  expenseNote: string
  setExpenseNote: (val: string) => void
  payers: Record<string, string>
  setPayers: React.Dispatch<React.SetStateAction<Record<string, string>>>
  shares: Record<string, string>
  setShares: React.Dispatch<React.SetStateAction<Record<string, string>>>
  expenseMembers: Array<{ id: string; displayName: string }>
  onSaveExpense: (e: React.FormEvent) => void
  onBeginEdit: (e: RoomExpenseBook['expenses'][number]) => void
  onDeleteExpense: (expenseId: string) => void
  onConfirmTransfer: (transfer: {
    fromMembershipId: string
    toMembershipId: string
    amount: number
  }) => void
}

export function ExpensesPanel({
  room,
  book,
  busy,
  expenseId,
  setExpenseId,
  expenseTitle,
  setExpenseTitle,
  expenseTotal,
  setExpenseTotal,
  expenseNote,
  setExpenseNote,
  payers,
  setPayers,
  shares,
  setShares,
  expenseMembers,
  onSaveExpense,
  onBeginEdit,
  onDeleteExpense,
  onConfirmTransfer,
}: ExpensesPanelProps) {
  return (
    <div className="toolkit-panel">
      <h2>Sổ chi tiêu · minh bạch cho cả phòng</h2>
      <p className="toolkit-muted">
        Ai trong phòng cũng có thể thêm, sửa hoặc xóa khoản chi. Lịch sử ghi nhận người chỉnh
        sửa.
      </p>
      <form className="toolkit-form" onSubmit={onSaveExpense}>
        <label>
          Nội dung khoản chi
          <input
            required
            maxLength={160}
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            placeholder="Ví dụ: tiền ăn tối"
          />
        </label>
        <label>
          Tổng tiền (₫)
          <input
            required
            type="number"
            min="1"
            step="1"
            value={expenseTotal}
            onChange={(e) => setExpenseTotal(e.target.value)}
          />
        </label>
        <label>
          Ghi chú
          <input
            maxLength={1000}
            value={expenseNote}
            onChange={(e) => setExpenseNote(e.target.value)}
          />
        </label>
        <div className="expense-allocation">
          <strong>Ai đã trả? (có thể chọn nhiều người)</strong>
          {expenseMembers.map((m) => (
            <label key={m.id}>
              {m.displayName}
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={payers[m.id] ?? ''}
                onChange={(e) => setPayers({ ...payers, [m.id]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="expense-allocation">
          <strong>Ai cùng chia khoản này?</strong>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              const each = Math.floor(Number(expenseTotal || 0) / room.members.length)
              const remainder = Number(expenseTotal || 0) - each * room.members.length
              setShares(
                Object.fromEntries(
                  room.members.map((m, i) => [
                    m.id,
                    String(each + (i === 0 ? remainder : 0)),
                  ])
                )
              )
            }}
          >
            Chia đều cho cả phòng
          </button>
          {expenseMembers.map((m) => (
            <label key={m.id}>
              {m.displayName}
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={shares[m.id] ?? ''}
                onChange={(e) => setShares({ ...shares, [m.id]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <button className="primary-button" disabled={busy}>
          {expenseId ? 'Lưu sửa khoản chi' : 'Thêm khoản chi'}
        </button>
        {expenseId && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setExpenseId('')}
          >
            Hủy sửa
          </button>
        )}
      </form>

      {book?.expenses.map((e) => (
        <article className="expense-card" key={e.id}>
          <div className="toolkit-heading">
            <strong>
              {e.title} · {money(e.totalAmount)}
            </strong>
            <span>
              <button onClick={() => onBeginEdit(e)}>Sửa</button>
              <button
                onClick={() => {
                  if (confirm('Xóa khoản chi?')) onDeleteExpense(e.id)
                }}
              >
                Xóa
              </button>
            </span>
          </div>
          <p>
            Trả:{' '}
            {e.payers.map((p) => `${p.displayName} ${money(p.amount)}`).join(' · ')}
          </p>
          <p>
            Chia:{' '}
            {e.shares.map((s) => `${s.displayName} ${money(s.amount)}`).join(' · ')}
          </p>
        </article>
      ))}

      {(book?.balances?.suggestedTransfers?.length ?? 0) > 0 && (
        <div className="expense-balance">
          <strong>Gợi ý thanh toán để cân bằng</strong>
          {book?.balances?.suggestedTransfers.map((t, i) => (
            <p key={i}>
              {t.from} chuyển {money(t.amount)} cho {t.to}{' '}
              <button type="button" onClick={() => onConfirmTransfer(t)}>
                Đã thanh toán
              </button>
            </p>
          ))}
        </div>
      )}

      {(book?.balances?.settlements?.length ?? 0) > 0 && (
        <details>
          <summary>Lịch sử chuyển tiền</summary>
          {book?.balances?.settlements.map((s) => (
            <p key={s.id}>
              {s.from} → {s.to} · {money(s.amount)} · {s.status}
            </p>
          ))}
        </details>
      )}

      <details>
        <summary>Lịch sử chỉnh sửa</summary>
        {book?.audit.map((a) => (
          <p key={a.id}>
            {a.actor} · {a.action} · {a.description}
          </p>
        ))}
      </details>
    </div>
  )
}
