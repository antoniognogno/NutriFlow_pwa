export function NutriFlowLogo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        width="64"
        height="64"
        rx="16"
        className="fill-slate-100 transition-colors dark:fill-[#0d1722]"
      />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        strokeWidth="2"
        className="stroke-sky-600/35 dark:stroke-[#7aa6bd]/40"
      />
      <path
        d="M32 11C32 11 18 26.5 18 37.5C18 45.5 24.3 52 32 52C39.7 52 46 45.5 46 37.5C46 26.5 32 11 32 11Z"
        strokeWidth="2.8"
        strokeLinejoin="round"
        className="fill-sky-500/15 stroke-sky-600 dark:fill-[#7aa6bd]/16 dark:stroke-[#7aa6bd]"
      />
      <path
        d="M21.5 38.5H27L30.5 31L34.5 43L38 35.5H42.5"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-emerald-600 dark:stroke-[#34d399]"
      />
    </svg>
  )
}
