import {
  PlusCircleOutlined,
  KeyOutlined,
  CalendarOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import type { Account } from '../../api'

export type NavTab = 'create' | 'join' | 'rooms' | 'account'

interface HomeSidebarProps {
  account: Account | null
  tab: NavTab
  roomCount: number
  onTabChange: (tab: NavTab) => void
  onLogout: () => void
}

export function HomeSidebar({
  account,
  tab,
  roomCount,
  onTabChange,
  onLogout,
}: HomeSidebarProps) {
  return (
    <aside className="board-sidebar bg-stone-50/80 border-r border-stone-200 p-5 sm:p-6 flex flex-col gap-4 shrink-0 w-full md:w-[280px]">
      <nav className="flex flex-col gap-1.5" aria-label="Menu chức năng">
        {/* MỤC 1: TẠO PHÒNG MỚI */}
        <button
          type="button"
          className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
            tab === 'create'
              ? 'bg-white text-emerald-950 font-bold shadow-xs border-stone-200'
              : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900 border-transparent'
          }`}
          onClick={() => onTabChange('create')}
        >
          <span
            className={`w-7 h-7 flex items-center justify-center shrink-0 ${
              tab === 'create' ? 'text-amber-700' : 'text-stone-400'
            }`}
          >
            <PlusCircleOutlined style={{ fontSize: 18 }} />
          </span>
          <span className="truncate">Tạo phòng mới</span>
        </button>

        {/* MỤC 2: THAM GIA BẰNG MÃ */}
        <button
          type="button"
          className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
            tab === 'join'
              ? 'bg-white text-emerald-950 font-bold shadow-xs border-stone-200'
              : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900 border-transparent'
          }`}
          onClick={() => onTabChange('join')}
        >
          <span
            className={`w-7 h-7 flex items-center justify-center shrink-0 ${
              tab === 'join' ? 'text-amber-700' : 'text-stone-400'
            }`}
          >
            <KeyOutlined style={{ fontSize: 18 }} />
          </span>
          <span className="truncate">Tham gia bằng mã</span>
        </button>

        {/* MỤC 3: PHÒNG CỦA TÔI */}
        <button
          type="button"
          className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
            tab === 'rooms'
              ? 'bg-white text-emerald-950 font-bold shadow-xs border-stone-200'
              : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900 border-transparent'
          }`}
          onClick={() => onTabChange('rooms')}
        >
          <span
            className={`w-7 h-7 flex items-center justify-center shrink-0 ${
              tab === 'rooms' ? 'text-amber-700' : 'text-stone-400'
            }`}
          >
            <CalendarOutlined style={{ fontSize: 18 }} />
          </span>
          <span className="truncate">Phòng của tôi</span>
          {roomCount > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0">
              {roomCount}
            </span>
          )}
        </button>

        {/* MỤC 4: TÀI KHOẢN NGƯỜI DÙNG - CĂN THẲNG HÀNG VỚI CÁC MENU TRÊN */}
        {account ? (
          <div
            onClick={() => onTabChange('account')}
            className={`flex items-center gap-3 w-full px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
              tab === 'account'
                ? 'bg-white text-emerald-950 font-bold shadow-xs border-stone-200'
                : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900 border-transparent'
            }`}
            title="Quản lý tài khoản"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-900 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
              {account.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1 text-left leading-tight">
              <span className="text-sm font-semibold text-stone-900 truncate">
                {account.displayName}
              </span>
              <span className="text-[11px] text-stone-500 truncate">{account.email}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onLogout()
              }}
              title="Đăng xuất"
              className="ml-auto text-stone-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-md hover:bg-stone-200/60 shrink-0"
            >
              <LogoutOutlined style={{ fontSize: 15 }} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onTabChange('account')}
            className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
              tab === 'account'
                ? 'bg-white text-emerald-950 font-bold shadow-xs border-stone-200'
                : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900 border-transparent'
            }`}
            title="Đăng nhập tài khoản"
          >
            <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center shrink-0 text-xs">
              ?
            </div>
            <div className="flex flex-col min-w-0 flex-1 text-left leading-tight">
              <span className="text-sm font-semibold text-stone-900 truncate">Khách vãng lai</span>
              <span className="text-[11px] text-stone-500 truncate">Chưa đăng nhập</span>
            </div>
            <span className="ml-auto text-xs font-bold text-amber-700 hover:underline shrink-0">
              Đăng nhập
            </span>
          </div>
        )}
      </nav>

      <div className="mt-auto p-3.5 rounded-xl bg-emerald-950/5 text-xs text-stone-600 leading-relaxed">
        💡 <b>Mẹo:</b> Phòng tự lưu phiên trong tab. Đăng nhập tài khoản để mở lại phòng trên mọi thiết bị.
      </div>
    </aside>
  )
}
