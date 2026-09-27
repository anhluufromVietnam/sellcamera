"use client"

import { useEffect, useMemo, useState } from "react"
import { ref as dbRef, set, get, remove, onValue, query, orderByChild, equalTo, runTransaction, update } from "firebase/database"
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, CreditCard, ShoppingBag, Store, Truck } from "lucide-react"
import { database } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { CameraListing, normalizeCameraListing } from "@/components/camera-management"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"

interface PurchaseForm {
  name: string
  email: string
  phone: string
  pickupDate: string
  pickupTime: string
  shippingAddress: string
  notes: string
}

interface PaymentSettings {
  qrUrl: string
  bankName: string
  accountNumber: string
  accountHolder: string
  paymentSyntax: string
}

const emptyForm: PurchaseForm = { name: "", email: "", phone: "", pickupDate: "", pickupTime: "", shippingAddress: "", notes: "" }
const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
const timeSlots = Array.from({ length: 49 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 15
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
})

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const toDateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const parseDateValue = (value: string) => {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

const formatDateLabel = (value: string) => {
  const date = parseDateValue(value)
  if (!date) return "Chọn ngày"
  return date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })
}

function SoftDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const today = startOfDay(new Date())
  const selectedDate = parseDateValue(value)
  const [viewDate, setViewDate] = useState(selectedDate ?? today)

  const days = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const previousMonthDays = new Date(year, month, 0).getDate()

    return Array.from({ length: 42 }, (_, index) => {
      const dayOffset = index - firstWeekday + 1
      const date = new Date(year, month, dayOffset)
      const inMonth = dayOffset >= 1 && dayOffset <= daysInMonth
      const label = inMonth ? dayOffset : dayOffset < 1 ? previousMonthDays + dayOffset : dayOffset - daysInMonth
      return { inMonth, label, value: toDateValue(date), disabled: startOfDay(date) < today }
    })
  }, [today, viewDate])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full justify-start rounded-xl border-white/40 bg-white/45 px-3 text-left font-normal shadow-sm backdrop-blur-xl hover:bg-white/60">
          <CalendarDays className="mr-2 h-4 w-4 text-primary" />
          <span className={value ? "" : "text-muted-foreground"}>{formatDateLabel(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[19rem] rounded-2xl border-white/50 bg-white/85 p-3 shadow-2xl backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold capitalize">{viewDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}</div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] font-semibold text-muted-foreground">
          {weekDays.map((day) => <div key={day} className="py-1">{day}</div>)}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isSelected = day.value === value
            const isToday = day.value === toDateValue(today)

            return (
              <Button
                key={day.value}
                type="button"
                variant="ghost"
                disabled={day.disabled}
                onClick={() => onChange(day.value)}
                className={[
                  "h-9 rounded-xl p-0 text-sm font-medium transition-all",
                  !day.inMonth && "text-muted-foreground/45",
                  isToday && !isSelected && "bg-primary/10 text-primary",
                  isSelected && "bg-primary text-primary-foreground shadow-md hover:bg-primary",
                ].filter(Boolean).join(" ")}
              >
                {day.label}
              </Button>
            )
          })}
        </div>

        <div className="mt-3 flex justify-between">
          <Button type="button" variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => onChange("")}>
            Xóa
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => {
              onChange(toDateValue(today))
              setViewDate(today)
            }}
          >
            Hôm nay
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SoftTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full justify-start rounded-xl border-white/40 bg-white/45 px-3 text-left font-normal shadow-sm backdrop-blur-xl hover:bg-white/60">
          <Clock className="mr-2 h-4 w-4 text-primary" />
          <span className={value ? "" : "text-muted-foreground"}>{value || "Chọn giờ"}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[18rem] rounded-2xl border-white/50 bg-white/85 p-3 shadow-2xl backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Giờ nhận hàng</div>
            <div className="text-xs text-muted-foreground">Cách nhau 15 phút</div>
          </div>

          <Button type="button" variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => onChange("")}>
            Xóa
          </Button>
        </div>

        <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto pr-1">
          {timeSlots.map((slot) => (
            <Button
              key={slot}
              type="button"
              variant={slot === value ? "default" : "secondary"}
              onClick={() => onChange(slot)}
              className="h-9 rounded-xl text-sm"
            >
              {slot}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function PublicBooking() {
  const [cameras, setCameras] = useState<CameraListing[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCamera, setSelectedCamera] = useState<CameraListing | null>(null)
  const [form, setForm] = useState<PurchaseForm>(emptyForm)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<"info" | "payment">("info")
  const [paymentOption, setPaymentOption] = useState<"bank_transfer_ship" | "bank_transfer_pickup" | "cod">("bank_transfer_ship")
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const productsRef = dbRef(database, "products")

    return onValue(productsRef, (snapshot) => {
      const data = snapshot.val() || {}

      const cameras = Object.keys(data).map((key) =>
        normalizeCameraListing(
          key,
          data[key] as Partial<CameraListing> & { price?: number }
        )
      )

      setCameras(
        cameras.filter(
          (camera) => camera.status !== "hidden" && camera.stock > 0
        )
      )
    })
  }, [])

  useEffect(() => {
    const loadPaymentSettings = async () => {
      const settingsRef = dbRef(database, "settings/payment")
      const snapshot = await get(settingsRef)

      if (!snapshot.exists()) return

      const data = snapshot.val() as Partial<PaymentSettings>

      setPaymentSettings({
        qrUrl: data.qrUrl || "",
        bankName: data.bankName || "",
        accountNumber: data.accountNumber || "",
        accountHolder: data.accountHolder || "",
        paymentSyntax: data.paymentSyntax || "",
      })
    }

    loadPaymentSettings().catch(() => setPaymentSettings(null))
  }, [])

  const filtered = useMemo(
    () =>
      cameras.filter((camera) =>
        [camera.name, camera.brand, camera.model, camera.category].some(
          (value) =>
            value?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      ),
    [cameras, searchTerm]
  )

  const transferContent = useMemo(() => {
    const fallback =
      `MUA MAY ANH ${form.name || selectedCamera?.name || ""}`.trim()

    return (paymentSettings?.paymentSyntax || fallback)
      .replace(
        /\[Tên\]|\[Ten\]|\[name\]/gi,
        form.name || "Ten khach hang"
      )
      .replace(
        /\[Mã đơn\]|\[Ma don\]|\[order\]/gi,
        selectedCamera?.id || "Ma don"
      )
      .replace(
        /\[Sản phẩm\]|\[San pham\]|\[product\]/gi,
        selectedCamera?.name || "May anh"
      )
  }, [
    form.name,
    paymentSettings?.paymentSyntax,
    selectedCamera?.id,
    selectedCamera?.name,
  ])

  const updateForm = (
    field: keyof PurchaseForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const resetCheckout = () => {
    setSelectedCamera(null)
    setCheckoutStep("info")
    setPaymentOption("bank_transfer_ship")
  }

  const continueToPayment = (event: React.FormEvent) => {
    event.preventDefault()
    setCheckoutStep("payment")
  }

  const submitPurchase = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedCamera) return

    const trimmedAddress = form.shippingAddress.trim()

    if (
      (paymentOption === "bank_transfer_ship" ||
        paymentOption === "cod") &&
      !trimmedAddress
    ) {
      toast({
        title: "Thiếu địa chỉ giao hàng",
        description: "Vui lòng nhập địa chỉ để shop giao máy.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const productRef = dbRef(
        database,
        "products/" + selectedCamera.id
      )

      const productSnapshot = await get(productRef)

      if (!productSnapshot.exists()) {
        throw new Error("PRODUCT_NOT_FOUND")
      }

      const product = productSnapshot.val() || {}

      const currentStock = Number(
        product.stock ?? selectedCamera.stock ?? 0
      )

      if (
        currentStock <= 0 ||
        product.status === "hidden"
      ) {
        throw new Error("OUT_OF_STOCK")
      }

      const nextStock = currentStock - 1

      const orderRef = dbRef(
        database,
        "orders/" + Date.now().toString()
      )

      const isCod = paymentOption === "cod"
      const isBankShip =
        paymentOption === "bank_transfer_ship"
      const isBankPickup =
        paymentOption === "bank_transfer_pickup"

      await update(productRef, {
        stock: nextStock,
        status: nextStock === 0 ? "sold" : "active",
      })

      await set(orderRef, {
        cameraId: selectedCamera.id,
        cameraName:
          product.name ||
          selectedCamera.name ||
          "Sản phẩm không rõ",

        unitPrice: Number(
          product.salePrice ??
          product.price ??
          selectedCamera.salePrice ??
          0
        ),

        customerName: form.name.trim(),
        customerEmail: form.email.trim(),
        customerPhone: form.phone.trim(),

        pickupDate: isBankPickup
          ? form.pickupDate || null
          : null,

        pickupTime: isBankPickup
          ? form.pickupTime || null
          : null,

        shippingAddress:
          isBankShip || isCod
            ? trimmedAddress
            : null,

        shippingMethod: isBankShip
          ? "ship"
          : isBankPickup
            ? "pickup"
            : "cod",

        notes: form.notes || "",

        paymentAmount: Number(
          product.salePrice ??
          product.price ??
          selectedCamera.salePrice ??
          0
        ),

        paymentMethod: isCod
          ? "cod"
          : "bank_transfer",

        paymentStatus: isCod
          ? "cod_pending"
          : "awaiting_confirmation",

        transferContent: !isCod
          ? transferContent
          : null,

        status: "pending",

        createdAt: new Date().toISOString(),
      })

      toast({
        title:
          paymentOption === "cod"
            ? "Đã đặt ship COD thành công"
            : "Đặt mua thành công",

        description:
          paymentOption === "cod"
            ? "Shop sẽ liên hệ xác nhận và giao máy cho bạn."
            : "Shop đã ghi nhận đơn và sẽ liên hệ xác nhận đơn hàng.",
      })

      // Hiển thị trạng thái thành công
      setShowSuccess(true)

      // Reset form
      resetCheckout()
      setForm(emptyForm)

      // Mở Instagram ngay sau khi đặt hàng thành công
      setTimeout(() => {
        // Thử mở Instagram App trước
        window.location.href =
          "instagram://user?username=chupchoetdigicam"

        // Sau 600ms nếu không có app → fallback sang web
        setTimeout(() => {
          window.location.href =
            "https://www.instagram.com/chupchoetdigicam/"
        }, 600)
      }, 1200)
    } catch (error: any) {
      console.error("Order error:", error)

      if (error?.message === "OUT_OF_STOCK") {
        toast({
          title: "Sản phẩm đã hết hàng",
          description:
            "Rất tiếc, sản phẩm này vừa có người đặt hết.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Không thể tạo đơn",
          description:
            "Đã xảy ra lỗi khi tạo đơn hàng. Vui lòng thử lại sau.",
          variant: "destructive",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Tìm kiếm máy ảnh..."
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
        />

        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingBag className="h-4 w-4" />
          {filtered.length} sản phẩm
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((camera) => (
          <Card key={camera.id} className="overflow-hidden">
            <div className="flex aspect-[4/3] items-center justify-center bg-white p-4 sm:aspect-[5/4]">
              {camera.images?.[0] ? (
                <img
                  src={camera.images[0]}
                  alt={camera.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12" />
                </div>
              )}
            </div>

            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{camera.name}</CardTitle>
                  <CardDescription>
                    {camera.brand} {camera.model}
                  </CardDescription>
                </div>

                <Badge>{camera.category}</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {camera.description ||
                  "Máy ảnh đã được kiểm tra và sẵn sàng giao đến bạn."}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-primary">
                  {Number(
                    camera.salePrice || 0
                  ).toLocaleString("vi-VN")}đ
                </span>

                <Button
                  onClick={() => {
                    setSelectedCamera(camera)
                    setCheckoutStep("info")
                    setPaymentOption("bank_transfer_ship")
                  }}
                >
                  Mua ngay
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Chưa có sản phẩm phù hợp. Hãy quay lại sau nhé.
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(selectedCamera)}
        onOpenChange={(open) =>
          !open && resetCheckout()
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Mua {selectedCamera?.name}
            </DialogTitle>

            <DialogDescription>
              {checkoutStep === "info"
                ? "Điền thông tin cá nhân để chuyển sang bước thanh toán."
                : "Chọn phương thức thanh toán và giao hàng để hoàn tất đặt mua."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-1 text-sm font-medium">
            <div
              className={`rounded-xl px-3 py-2 text-center transition ${
                checkoutStep === "info"
                  ? "bg-white shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              1. Thông tin
            </div>

            <div
              className={`rounded-xl px-3 py-2 text-center transition ${
                checkoutStep === "payment"
                  ? "bg-white shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              2. Thanh toán
            </div>
          </div>

          <form
            onSubmit={
              checkoutStep === "info"
                ? continueToPayment
                : submitPurchase
            }
            className="space-y-4"
          >
            {checkoutStep === "info" ? (
              <>
                <div>
                  <Label>Họ và tên *</Label>
                  <Input
                    required
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-black uppercase"
                      style={{
                        animation:
                          "blinkRedBlack 0.8s infinite",
                      }}
                    >
                      ⚠️ Tài khoản Instagram *

                      <style>{`
                        @keyframes blinkRedBlack {
                          0%, 100% { color: black; }
                          50% { color: red; }
                        }
                      `}</style>
                    </Label>

                    <Input
                      value={form.email}
                      onChange={(event) =>
                        updateForm(
                          "email",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label>Số điện thoại *</Label>
                    <Input
                      required
                      value={form.phone}
                      onChange={(event) =>
                        updateForm(
                          "phone",
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Ghi chú</Label>
                  <Textarea
                    rows={3}
                    placeholder="Ví dụ: muốn xem máy trước khi nhận..."
                    value={form.notes}
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <span>Tổng thanh toán</span>

                  <strong>
                    {Number(
                      selectedCamera?.salePrice || 0
                    ).toLocaleString("vi-VN")}đ
                  </strong>
                </div>

                <Button className="w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Tiếp tục chọn thanh toán
                </Button>
              </>
            ) : (
              <>
                <div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl md:text-2xl text-center font-bold">
                      Xác nhận đặt thuê
                    </CardTitle>

                    <CardDescription className="text-center mt-1 leading-tight alert-blink">
                      Khách hàng vui lòng gửi bill chuyển khoản về Fanpage hoặc Instagram
                    </CardDescription>

                    <CardDescription className="text-center leading-tight alert-blink">
                      Nếu không shop sẽ không xác nhận đơn
                    </CardDescription>
                  </CardHeader>
                </div>

                <div className="rounded-2xl border border-white/50 bg-white/50 p-4 shadow-sm backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {paymentOption === "cod"
                          ? "Số tiền cần thu khi giao"
                          : "Số tiền cần thanh toán"}
                      </p>

                      <p className="text-2xl font-bold text-primary">
                        {Number(
                          selectedCamera?.salePrice || 0
                        ).toLocaleString("vi-VN")}đ
                      </p>
                    </div>

                    {paymentOption === "cod" ? (
                      <Truck className="h-8 w-8 text-primary" />
                    ) : (
                      <CreditCard className="h-8 w-8 text-primary" />
                    )}
                  </div>

                  {paymentOption !== "cod" && (
                    <div className="space-y-3 text-sm">
                      {paymentSettings?.qrUrl && (
                        <div className="flex justify-center">
                          <div className="h-44 w-44 rounded-2xl bg-white p-3 shadow-inner">
                            <img
                              src={paymentSettings.qrUrl}
                              alt="QR thanh toán"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-xl bg-white/55 p-3">
                        <span className="text-muted-foreground">
                          Ngân hàng
                        </span>

                        <strong>
                          {paymentSettings?.bankName ||
                            "Chưa cài đặt"}
                        </strong>
                      </div>

                      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-xl bg-white/55 p-3">
                        <span className="text-muted-foreground">
                          Số tài khoản
                        </span>

                        <strong>
                          {paymentSettings?.accountNumber ||
                            "Chưa cài đặt"}
                        </strong>
                      </div>

                      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-xl bg-white/55 p-3">
                        <span className="text-muted-foreground">
                          Chủ tài khoản
                        </span>

                        <strong>
                          {paymentSettings?.accountHolder ||
                            "Chưa cài đặt"}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-primary/10 p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          Nội dung chuyển khoản
                        </span>

                        <p className="mt-1 break-words font-bold text-primary">
                          {transferContent}
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentOption === "bank_transfer_ship" && (
                    <div className="space-y-1.5 pt-2 border-t border-white/60">
                      <Label>
                        Địa chỉ nhận máy ảnh *
                      </Label>

                      <Textarea
                        required
                        rows={3}
                        placeholder="Nhập số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                        value={form.shippingAddress}
                        onChange={(event) =>
                          updateForm(
                            "shippingAddress",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  )}

                  {paymentOption === "bank_transfer_pickup" && (
                    <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-white/60">
                      <div className="space-y-1.5">
                        <Label>
                          Ngày đến nhận (tùy chọn)
                        </Label>

                        <SoftDatePicker
                          value={form.pickupDate}
                          onChange={(value) =>
                            updateForm(
                              "pickupDate",
                              value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>
                          Giờ đến nhận (tùy chọn)
                        </Label>

                        <SoftTimePicker
                          value={form.pickupTime}
                          onChange={(value) =>
                            updateForm(
                              "pickupTime",
                              value
                            )
                          }
                        />
                      </div>
                    </div>
                  )}

                  {paymentOption === "cod" && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-primary/10 p-3 text-sm text-primary">
                        Shop sẽ liên hệ xác nhận đơn và giao máy đến địa chỉ của bạn. Bạn thanh toán khi nhận hàng.
                      </div>

                      <div>
                        <Label>
                          Địa chỉ giao hàng *
                        </Label>

                        <Textarea
                          required
                          rows={3}
                          placeholder="Nhập số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                          value={form.shippingAddress}
                          onChange={(event) =>
                            updateForm(
                              "shippingAddress",
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      setCheckoutStep("info")
                    }
                    disabled={submitting}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại
                  </Button>

                  <Button
                    type="submit"
                    className="flex-[1.4]"
                    disabled={submitting}
                  >
                    {submitting ? (
                      "Đang gửi đơn..."
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {paymentOption === "cod"
                          ? "Đặt ship COD"
                          : "Tôi đã thanh toán"}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}