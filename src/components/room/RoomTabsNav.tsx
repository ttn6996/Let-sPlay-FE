import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  TeamOutlined,
} from '@ant-design/icons'

export type RoomTab = 'proposals' | 'availability' | 'toolkit' | 'members'

interface RoomTabsNavProps {
  activeTab: RoomTab
  onTabChange: (tab: RoomTab) => void
  proposalsCount: number
  availabilityCount: number
  memberCount: number
}

export function RoomTabsNav({
  activeTab,
  onTabChange,
  proposalsCount,
  availabilityCount,
  memberCount,
}: RoomTabsNavProps) {
  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2.5 p-2 bg-stone-100/90 border border-stone-200/90 rounded-2xl my-4">
      <button
        type="button"
        onClick={() => onTabChange('proposals')}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
          activeTab === 'proposals'
            ? 'bg-white text-emerald-950 shadow-xs border border-stone-200 font-bold'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 border border-transparent'
        }`}
      >
        <ThunderboltOutlined
          style={{ fontSize: 16 }}
          className={activeTab === 'proposals' ? 'text-amber-700' : 'text-stone-400'}
        />
        <span>Ý tưởng & Bình chọn</span>
        {proposalsCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 text-xs font-bold">
            {proposalsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onTabChange('availability')}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
          activeTab === 'availability'
            ? 'bg-white text-emerald-950 shadow-xs border border-stone-200 font-bold'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 border border-transparent'
        }`}
      >
        <ClockCircleOutlined
          style={{ fontSize: 16 }}
          className={activeTab === 'availability' ? 'text-amber-700' : 'text-stone-400'}
        />
        <span>Khung giờ rảnh</span>
        {availabilityCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 text-xs font-bold">
            {availabilityCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onTabChange('toolkit')}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
          activeTab === 'toolkit'
            ? 'bg-white text-emerald-950 shadow-xs border border-stone-200 font-bold'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 border border-transparent'
        }`}
      >
        <AppstoreOutlined
          style={{ fontSize: 16 }}
          className={activeTab === 'toolkit' ? 'text-amber-700' : 'text-stone-400'}
        />
        <span>Công cụ & Kế hoạch</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('members')}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
          activeTab === 'members'
            ? 'bg-white text-emerald-950 shadow-xs border border-stone-200 font-bold'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 border border-transparent'
        }`}
      >
        <TeamOutlined
          style={{ fontSize: 16 }}
          className={activeTab === 'members' ? 'text-amber-700' : 'text-stone-400'}
        />
        <span>Thành viên</span>
        <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 text-xs font-bold">
          {memberCount}
        </span>
      </button>
    </div>
  )
}
