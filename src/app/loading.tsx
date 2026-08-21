export default function Loading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-[#00230c]/20 overflow-hidden pointer-events-none">
      <div className="h-full bg-[#FFC700] w-1/3 animate-pulse" />
    </div>
  );
}
