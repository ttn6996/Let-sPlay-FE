import { type RefObject } from 'react'
import { Link } from 'react-router-dom'

interface HomeHeaderProps {
  heroRef: RefObject<HTMLElement | null>
}

export function HomeHeader({ heroRef }: HomeHeaderProps) {
  return (
    <>
      <header className="topbar !h-14 !min-h-[56px] border-b border-stone-200">
        <Link className="brand" to="/" aria-label="Kèo, trang chủ">
          <span className="brand-mark">
            <img src="/favicon.svg" alt="k" width="28" height="28" />
          </span>
          <span>Kèo</span>
        </Link>
        <span className="top-note text-xs text-stone-500">Một buổi vui, cùng nhau lên kế hoạch</span>
      </header>

      {/* CHỮ THÀNH 1 HÀNG DUY NHẤT - GỌN GÀNG, KHÔNG CẦN CUỘN */}
      <section
        className="hero-header-top w-full mx-auto my-2.5 px-1 flex flex-row items-center justify-between gap-4"
        ref={heroRef}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <p className="eyebrow !my-0 scale-90 origin-left">
            <span className="status-dot" /> HẸN NHAU DỄ HƠN
          </p>
          <h1 className="text-sm sm:text-base md:text-lg font-bold text-stone-900 tracking-tight !my-0 font-display whitespace-nowrap">
            Chọn một ngày, <em className="italic text-amber-700 font-semibold">Chốt một cuộc vui.</em>
          </h1>
        </div>

        <p className="text-stone-500 text-xs sm:text-sm truncate !my-0 hidden md:block">
          Gom ý tưởng, chọn hoạt động và sắp lịch cùng hội bạn trong một căn phòng riêng.
        </p>

        <div className="hero-footnote flex items-center gap-2 shrink-0 !mt-0">
          <span className="avatar-stack scale-75 origin-right">
            <i>A</i>
            <i>M</i>
            <i>+</i>
          </span>
          <span className="text-xs text-stone-500 font-medium whitespace-nowrap hidden sm:inline">
            Cả nhóm cùng góp ý
          </span>
        </div>
      </section>
    </>
  )
}
