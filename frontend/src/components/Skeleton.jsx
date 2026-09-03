import React from "react"

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
    />
  )
}

// 1. POS Product Grid Skeleton
export function PosCatalogSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 flex flex-col justify-between space-y-3 shadow-xs"
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-14 rounded-md" />
              <Skeleton className="h-3 w-10 rounded-md" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>

          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-xl" />
            <Skeleton className="h-8 flex-1 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

// 2. Dashboard KPIs & Charts Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <Skeleton className="h-9 w-60 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// 3. Table Rows Skeleton (Products, Sales, Khata)
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full space-y-2.5 p-4 bg-white rounded-2xl border border-slate-200">
      <div className="flex gap-4 pb-2 border-b border-slate-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded-md" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-slate-50 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 rounded-md" />
          ))}
        </div>
      ))}
    </div>
  )
}
