"use client"

import { useEffect, useMemo, useState } from "react"
import { ref as dbRef, onValue } from "firebase/database"
import { BarChart3, Box, CalendarDays, Camera, CheckCircle2, Clock, TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface RevenueOrder {
  id: string
  unitPrice: number
  status: "pending" | "confirmed" | "completed" | "cancelled"
  createdAt: string
}

const statusCards = [
  { key: "total", label: "Tổng đơn", icon: Box, color: "bg-violet-600" },
  { key: "pending", label: "Chờ duyệt", icon: Clock, color: "bg-amber-500" },
  { key: "confirmed", label: "Đang xử lý", icon: Camera, color: "bg-emerald-500" },
  { key: "completed", label: "Đã xong", icon: CheckCircle2, color: "bg-slate-900" },
] as const

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")} VND`
const toDateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getOrderDate = (order: RevenueOrder) => {
  const date = new Date(order.createdAt)
  return Number.isNaN(date.getTime()) ? null : date
}

const getPresetStart = (range: string) => {
  const now = new Date()
  const start = new Date(now)

  if (range === "week") start.setDate(now.getDate() - 6)
  if (range === "month") start.setDate(now.getDate() - 29)
  if (range === "year") start.setMonth(now.getMonth() - 11)
  start.setHours(0, 0, 0, 0)

  return start
}

const daysBetween = (start: Date, end: Date) => {
  const startDay = new Date(start)
  const endDay = new Date(end)
  startDay.setHours(0, 0, 0, 0)
  endDay.setHours(0, 0, 0, 0)
  return Math.max(1, Math.floor((endDay.getTime() - startDay.getTime()) / 86400000) + 1)
}

export function RevenueManagement() {
  const [orders, setOrders] = useState<RevenueOrder[]>([])
  const [range, setRange] = useState("month")
  const [mode, setMode] = useState<"preset" | "custom">("preset")
  const [customStart, setCustomStart] = useState(() => toDateValue(getPresetStart("month")))
  const [customEnd, setCustomEnd] = useState(() => toDateValue(new Date()))

  useEffect(() => {
    const ordersRef = dbRef(database, "orders")
    return onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {}
      setOrders(Object.keys(data).map((key) => {
        const order = data[key] as Partial<RevenueOrder>
        return {
          id: key,
          unitPrice: Number(order.unitPrice ?? 0),
          status: order.status || "pending",
          createdAt: order.createdAt || "",
        }
      }))
    })
  }, [])

  const activeRangeLabel = useMemo(() => {
    if (mode === "custom") {
      const start = new Date(`${customStart}T00:00:00`)
      const end = new Date(`${customEnd}T00:00:00`)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Khoảng tùy chỉnh"
      return `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`
    }

    return {
      week: "7 ngày gần đây",
      month: "30 ngày gần đây",
      year: "12 tháng gần đây",
      all: "Tất cả thời gian",
    }[range]
  }, [customEnd, customStart, mode, range])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const date = getOrderDate(order)
      if (!date) return false

      if (mode === "custom") {
        const start = new Date(`${customStart}T00:00:00`)
        const end = new Date(`${customEnd}T23:59:59`)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
        return date >= start && date <= end
      }

      if (range === "all") return true
      return date >= getPresetStart(range)
    })
  }, [customEnd, customStart, mode, orders, range])

  const stats = useMemo(() => {
    const payableOrders = filteredOrders.filter((order) => order.status !== "cancelled")
    return {
      revenue: payableOrders.reduce((total, order) => total + order.unitPrice, 0),
      total: filteredOrders.length,
      pending: filteredOrders.filter((order) => order.status === "pending").length,
      confirmed: filteredOrders.filter((order) => order.status === "confirmed").length,
      completed: filteredOrders.filter((order) => order.status === "completed").length,
    }
  }, [filteredOrders])

  const chartData = useMemo(() => {
    if (mode === "custom") {
      const start = new Date(`${customStart}T00:00:00`)
      const end = new Date(`${customEnd}T00:00:00`)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []

      const length = Math.min(daysBetween(start, end), 45)
      return Array.from({ length }, (_, index) => {
        const date = new Date(start)
        date.setDate(start.getDate() + index)
        const value = toDateValue(date)
        const revenue = filteredOrders
          .filter((order) => order.createdAt.slice(0, 10) === value && order.status !== "cancelled")
          .reduce((total, order) => total + order.unitPrice, 0)

        return { label: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }), revenue }
      })
    }

    const now = new Date()
    if (range === "year") {
      return Array.from({ length: 12 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
        const revenue = filteredOrders
          .filter((order) => {
            const orderDate = getOrderDate(order)
            return orderDate &&
              orderDate.getMonth() === date.getMonth() &&
              orderDate.getFullYear() === date.getFullYear() &&
              order.status !== "cancelled"
          })
          .reduce((total, order) => total + order.unitPrice, 0)

        return { label: date.toLocaleDateString("vi-VN", { month: "2-digit" }), revenue }
      })
    }

    const length = range === "week" ? 7 : 12
    return Array.from({ length }, (_, index) => {
      const date = new Date(now)
      date.setDate(now.getDate() - (length - 1 - index))
      const value = toDateValue(date)
      const revenue = filteredOrders
        .filter((order) => order.createdAt.slice(0, 10) === value && order.status !== "cancelled")
        .reduce((total, order) => total + order.unitPrice, 0)

      return { label: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }), revenue }
    })
  }, [customEnd, customStart, filteredOrders, mode, range])

  return (
    <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_20rem] md:p-6">
      <Card className="rounded-3xl border-white/50 bg-white/55 shadow-xl backdrop-blur-2xl">
        <CardContent className="p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Phân tích doanh thu</h2>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                Theo dõi hiệu quả bán máy ảnh
              </div>
            </div>
            <div className="rounded-full bg-white/60 p-1 shadow-inner">
              <Button type="button" size="sm" variant={mode === "preset" ? "default" : "ghost"} className="rounded-full" onClick={() => setMode("preset")}>Mặc định</Button>
              <Button type="button" size="sm" variant={mode === "custom" ? "default" : "ghost"} className="rounded-full" onClick={() => setMode("custom")}>Tùy chỉnh</Button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tổng thu nhập</p>
              <p className="mt-2 text-4xl font-black tracking-normal">{formatCurrency(stats.revenue)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{activeRangeLabel}</p>
            </div>

            {mode === "preset" ? (
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-11 rounded-full border-white/60 bg-white/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">7 ngày gần đây</SelectItem>
                  <SelectItem value="month">30 ngày gần đây</SelectItem>
                  <SelectItem value="year">12 tháng gần đây</SelectItem>
                  <SelectItem value="all">Tất cả thời gian</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="grid gap-3 rounded-2xl border border-white/50 bg-white/40 p-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  <span className="flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-4 w-4" />Từ ngày</span>
                  <Input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} className="h-11 rounded-xl bg-white/60" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span className="flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-4 w-4" />Đến ngày</span>
                  <Input type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} className="h-11 rounded-xl bg-white/60" />
                </label>
              </div>
            )}
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis hide domain={[0, "dataMax + 1000000"]} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} labelClassName="font-semibold" />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {statusCards.map((item) => {
          const Icon = item.icon
          const value = stats[item.key]
          return (
            <Card key={item.key} className="overflow-hidden rounded-3xl border-white/50 bg-white/55 shadow-xl backdrop-blur-2xl">
              <CardContent className="relative p-6">
                <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black">{value.toLocaleString("vi-VN")}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.label}</p>
                <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-primary/5" />
              </CardContent>
            </Card>
          )
        })}
        <Card className="rounded-3xl border-white/50 bg-white/40 shadow-xl backdrop-blur-2xl">
          <CardContent className="flex items-center justify-center gap-2 p-6 text-sm font-semibold text-muted-foreground">
            <BarChart3 className="h-5 w-5" />
            Xem báo cáo tăng trưởng
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
