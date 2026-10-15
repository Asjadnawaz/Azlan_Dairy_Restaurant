/** Shared status vocabulary for the customer order history. */
export function isOrderComplete(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === "completed" || s === "complete" || s === "delivered";
}

export function StatusBadge({ status }: { status?: string }) {
  const s = (status || "pending").toLowerCase();
  if (s === "completed" || s === "complete" || s === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        Complete
      </span>
    );
  }
  if (s === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
        <span className="material-symbols-outlined text-[14px]">cancel</span>
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
      <span className="material-symbols-outlined text-[14px]">timelapse</span>
      In Progress
    </span>
  );
}
