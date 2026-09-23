"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Package, Truck } from "lucide-react"
import { db } from "@/lib/firebase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CalendarOrder {
  id: string
  cameraName: string
  customerName: string
  customerPhone: string
  pickupDate?: string | null
  pickupTime?: string | null
  shippingAddress?: string | null
  shippingMethod?: string
  paymentMethod?: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  createdAt: string
}

const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
const statusLabels: Record<CalendarOrder["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Đã xong",
  cancelled: "Đã hủy",
}

const toDateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const orderDateValue = (order: CalendarOrder) => order.pickupDate || order.createdAt.slice(0, 10)

export function SalesCalendar() {
  const [orders, setOrders] = useState<CalendarOrder[]>([])
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => toDateValue(new Date()))

  useEffect(() => onSnapshot(collection(db, "orders"), (snapshot) => {
    setOrders(snapshot.docs.map((document) => {
      const order = document.data() as Partial<CalendarOrder>
      return {
        id: document.id,
        cameraName: order.cameraName || "Sản phẩm không rõ",
        customerName: order.customerName || "Khách hàng",
        customerPhone: order.customerPhone || "",
        pickupDate: order.pickupDate ?? null,
        pickupTime: order.pickupTime ?? null,
        shippingAddress: order.shippingAddress ?? null,
        shippingMethod: order.shippingMethod || "",
        paymentMethod: order.paymentMethod || "",
        status: order.status || "pending",
        createdAt: order.createdAt || "",
      }
    }))
  }), [])

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const firstWeekday = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const previousMonthDays = new Date(year, month, 0).getDate()

    return Array.from({ length: 42 }, (_, index) => {
      const dayOffset = index - firstWeekday + 1
      const date = new Date(year, month, dayOffset)
      const inMonth = dayOffset >= 1 && dayOffset <= daysInMonth
      const label = inMonth ? dayOffset : dayOffset < 1 ? previousMonthDays + dayOffset : dayOffset - daysInMonth
      const value = toDateValue(date)
      const dayOrders = orders.filter((order) => orderDateValue(order) === value)

      return { value, label, inMonth, orders: dayOrders }
    })
  }, [orders, viewDate])

  const selectedOrders = useMemo(() => orders
    .filter((order) => orderDateValue(order) === selectedDate)
    .sort((a, b) => (a.pickupTime || "99:99").localeCompare(b.pickupTime || "99:99")),
  [orders, selectedDate])

  const changeMonth = (offset: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)] md:p-6">
      <Card className="rounded-3xl border-white/50 bg-white/50 shadow-xl backdrop-blur-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarDays className="h-5 w-5 text-primary" />
              Lịch đơn hàng
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Theo dõi ngày hẹn nhận máy, đơn chờ xử lý và lịch bàn giao.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="icon" className="rounded-full" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" size="icon" className="rounded-full" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5 text-center text-lg font-bold capitalize">
            {viewDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
            {weekDays.map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const isSelected = day.value === selectedDate
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setSelectedDate(day.value)}
                  className={[
                    "min-h-24 rounded-2xl border p-2 text-left transition-all",
                    day.inMonth ? "border-white/60 bg-white/45 hover:bg-white/70" : "border-white/30 bg-white/20 text-muted-foreground/50",
                    isSelected && "border-primary/60 bg-primary/10 shadow-md",
                  ].filter(Boolean).join(" ")}
                >
                  <span className="text-sm font-semibold">{day.label}</span>
                  {day.orders.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-primary/70" />
                      <span className="text-[0.7rem] font-medium text-primary">{day.orders.length} đơn</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-white/50 bg-white/55 shadow-xl backdrop-blur-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Chi tiết trong ngày</CardTitle>
          <p className="text-sm text-muted-foreground">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedOrders.map((order) => {
            const isShip = Boolean(order.shippingAddress || order.paymentMethod === "cod" || order.shippingMethod === "cod" || order.shippingMethod === "ship")

            return (
              <div key={order.id} className="rounded-2xl border border-white/60 bg-white/50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <Package className="h-4 w-4 text-primary" />
                      {order.cameraName}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{order.customerName} · {order.customerPhone || "Chưa có SĐT"}</p>
                  </div>
                  <Badge>{statusLabels[order.status]}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {isShip ? (
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Truck className="h-4 w-4 text-primary" /> Giao tận nhà
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Clock className="h-4 w-4 text-primary" /> Đến shop lấy máy
                      </span>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {order.pickupTime ? `Hẹn giờ: ${order.pickupTime}` : "Chưa hẹn giờ cụ thể"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {selectedOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/70 bg-white/30 p-8 text-center text-sm text-muted-foreground">
              Chưa có đơn nào trong ngày này.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
