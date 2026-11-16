import { money } from './toolkit-types'
import type { Room } from '../../types'

interface RecommendPanelProps {
  prefs: string
  setPrefs: (val: string) => void
  budgetMin: string
  setBudgetMin: (val: string) => void
  budgetMax: string
  setBudgetMax: (val: string) => void
  onSavePrefs: () => Promise<void>
  suggestion: Array<{ proposal: Room['proposals'][number] }>
}

export function RecommendPanel({
  prefs,
  setPrefs,
  budgetMin,
  setBudgetMin,
  budgetMax,
  setBudgetMax,
  onSavePrefs,
  suggestion,
}: RecommendPanelProps) {
  return (
    <div className="toolkit-panel">
      <h2>Ưu tiên của bạn</h2>
      <div className="toolkit-form">
        <label>
          Sở thích / điều cần lưu ý
          <input
            value={prefs}
            onChange={(e) => setPrefs(e.target.value)}
            placeholder="Món chay, hoạt động ngoài trời…"
          />
        </label>
        <div className="toolkit-fields">
          <label>
            Ngân sách tối thiểu/người
            <input
              type="number"
              min="0"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
          </label>
          <label>
            Ngân sách tối đa/người
            <input
              type="number"
              min="0"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </label>
        </div>
        <button className="primary-button" onClick={() => void onSavePrefs()}>
          Lưu ưu tiên
        </button>
        <h3>Đề xuất trong phòng</h3>
        {suggestion.map(({ proposal }) => (
          <div className="suggestion-row" key={proposal.id}>
            <strong>{proposal.title}</strong>
            <span>
              {proposal.location || 'Chưa có địa điểm'} ·{' '}
              {proposal.estimatedCostPerPerson != null
                ? money(proposal.estimatedCostPerPerson)
                : 'Chưa ước tính chi phí'}{' '}
              · {proposal.voteCount} bình chọn
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
