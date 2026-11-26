export function NutriFlowLogo({ className = 'size-8' }: { className?: string }) {
  return (
    <img
      src="/icons/android/android-launchericon-192-192.png"
      alt=""
      aria-hidden="true"
      className={`${className} rounded-[22%] object-cover ring-1 ring-emerald-400/25 shadow-[0_0_16px_rgba(52,211,153,0.18)]`}
    />
  )
}
