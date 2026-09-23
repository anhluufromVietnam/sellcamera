"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, doc, onSnapshot, runTransaction, updateDoc } from "firebase/firestore"
import { CheckCircle, Clock, CreditCard, MapPin, Package, Search, Truck, XCircle } from "lucide-react"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Order {
  id: string
  cameraId?: string
  cameraName: string
  customerName: string
  customerEmail: string
  customerPhone: string
  unitPrice: number
  pickupDate?: string | null
  pickupTime?: string | null
  shippingAddress?: string | null
  shippingMethod?: string
  notes?: string
  paymentAmount?: number
  paymentMethod?: "bank_transfer" | "cod" | string
  paymentStatus?: "awaiting_confirmation" | "confirmed" | "cod_pending" | "paid_on_delivery" | "refunded"
  transferContent?: string | null
  status: "pending" | "confirmed" | "completed" | "cancelled"
  createdAt: string
}

const statusLabels: Record<Order["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
}

const paymentLabels: Record<NonNullable<Order["paymentStatus"]>, string> = {
  awaiting_confirmation: "Chờ xác nhận tiền",
  confirmed: "Đã nhận tiền",
  cod_pending: "COD - chờ giao",
  paid_on_delivery: "Đã thu COD",
  refunded: "Đã hoàn tiền",
}

const statusIcons = { pending: Clock, confirmed: CheckCircle, completed: CheckCircle, cancelled: XCircle }

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const { toast } = useToast()

  useEffect(() => onSnapshot(collection(db, "orders"), (snapshot) => {
    setOrders(snapshot.docs.map((document) => {
      const order = document.data() as Partial<Order>
      return {
        id: document.id,
        cameraId: order.cameraId || "",
        cameraName: order.cameraName || "Sản phẩm không rõ",
        customerName: order.customerName || "Khách hàng",
        customerEmail: order.customerEmail || "",
        customerPhone: order.customerPhone || "",
        unitPrice: Number(order.unitPrice ?? 0),
        pickupDate: order.pickupDate ?? null,
        pickupTime: order.pickupTime ?? null,
        shippingAddress: order.shippingAddress ?? null,
        shippingMethod: order.shippingMethod || "",
        notes: order.notes || "",
        paymentAmount: Number(order.paymentAmount ?? order.unitPrice ?? 0),
        paymentMethod: order.paymentMethod || "bank_transfer",
        paymentStatus: order.paymentStatus || "awaiting_confirmation",
        transferContent: order.transferContent || "",
        status: order.status || "pending",
        createdAt: order.createdAt || "",
      } satisfies Order
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }), [])

  const visible = useMemo(() => orders.filter((order) =>
    (filter === "all" || order.status === filter) &&
    [order.cameraName, order.customerName, order.customerPhone, order.customerEmail, order.transferContent, order.shippingAddress]
      .some((value) => value?.toLowerCase().includes(query.toLowerCase())),
  ), [orders, query, filter])

  const confirmBankPaymentAndOrder = async (id: string) => {
    await updateDoc(doc(db, "orders", id), {
      paymentStatus: "confirmed",
      status: "confirmed",
    })
    toast({ title: "Đã xác nhận thanh toán", description: "Đơn hàng đã chuyển sang trạng thái Đã xác nhận." })
  }

  const confirmCodOrder = async (id: string) => {
    await updateDoc(doc(db, "orders", id), {
      status: "confirmed",
      paymentStatus: "cod_pending",
    })
    toast({ title: "Đã xác nhận đơn hàng", description: "Đơn hàng COD đã được xác nhận và sẵn sàng giao." })
  }

  const completeOrder = async (order: Order) => {
    const isCod = order.paymentMethod === "cod"
    await updateDoc(doc(db, "orders", order.id), {
      status: "completed",
      ...(isCod ? { paymentStatus: "paid_on_delivery" } : { paymentStatus: "confirmed" }),
    })
    toast({
      title: "Đơn hàng hoàn tất",
      description: isCod ? "Đã giao hàng và thu tiền COD thành công." : "Đã hoàn tất giao máy cho khách hàng.",
    })
  }

  const cancelOrder = async (order: Order) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", order.id)
        const orderSnapshot = await transaction.get(orderRef)
        if (!orderSnapshot.exists()) throw new Error("Order not found")

        const latestOrder = orderSnapshot.data() as Partial<Order>
        if (latestOrder.status === "cancelled") return

        const cameraId = latestOrder.cameraId || order.cameraId
        let currentStock: number | null = null
        let productRef: ReturnType<typeof doc> | null = null

        if (cameraId) {
          productRef = doc(db, "products", cameraId)
          const productSnapshot = await transaction.get(productRef)
          currentStock = productSnapshot.exists() ? Number(productSnapshot.data().stock || 0) : null
        }

        transaction.update(orderRef, {
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
          stockRestored: Boolean(productRef && currentStock !== null),
        })

        if (productRef && currentStock !== null) {
          transaction.update(productRef, { stock: currentStock + 1, status: "active" })
        }
      })
      toast({ title: "Đã hủy đơn", description: "Số lượng máy ảnh đã được hoàn lại vào kho." })
    } catch {
      toast({ title: "Không thể hủy đơn", description: "Vui lòng thử lại sau.", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-bold">Đơn mua</h2>
        <p className="text-muted-foreground">Theo dõi đơn hàng, lịch nhận máy và trạng thái thanh toán.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tìm đơn hàng hoặc người mua..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {visible.map((order) => {
          const Icon = statusIcons[order.status]
          const isCod = order.paymentMethod === "cod" || order.shippingMethod === "cod"
          const isShip = Boolean(order.shippingAddress || isCod || order.shippingMethod === "ship")

          return (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-primary" />
                    {order.cameraName}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{order.customerName} · {order.customerPhone}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      {isShip ? (
                        <>
                          <Truck className="h-3.5 w-3.5 text-primary" /> {isCod ? "Ship COD tận nhà" : "Chuyển khoản · Ship tận nhà"}
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5 text-primary" /> Đến shop lấy máy
                        </>
                      )}
                    </span>
                    {!isShip && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {order.pickupDate ? `Hẹn: ${order.pickupDate}${order.pickupTime ? ` · ${order.pickupTime}` : ""}` : "Chưa hẹn ngày/giờ"}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className="flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {statusLabels[order.status]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-3">
                  <p><span className="text-muted-foreground">Giá:</span> <strong>{order.unitPrice.toLocaleString("vi-VN")}đ</strong></p>
                  <p><span className="text-muted-foreground">Email:</span> {order.customerEmail}</p>
                  <p><span className="text-muted-foreground">Hình thức:</span> <strong>{isShip ? "Giao tận nhà" : "Đến shop lấy"}</strong></p>
                </div>

                <div className="rounded-xl bg-muted/70 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      {isCod ? <Truck className="h-4 w-4 text-primary" /> : <CreditCard className="h-4 w-4 text-primary" />}
                      {isCod ? "Ship COD" : order.shippingAddress ? "Chuyển khoản · Ship tận nhà" : "Chuyển khoản · Lấy tại shop"}
                    </span>
                    <Badge variant={order.paymentStatus === "confirmed" || order.paymentStatus === "paid_on_delivery" ? "default" : "secondary"}>
                      {paymentLabels[order.paymentStatus || "awaiting_confirmation"]}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p><span className="text-muted-foreground">{isCod ? "Cần thu:" : "Số tiền:"}</span> <strong>{Number(order.paymentAmount || order.unitPrice).toLocaleString("vi-VN")}đ</strong></p>
                    {order.transferContent && (
                      <p><span className="text-muted-foreground">Nội dung CK:</span> <strong>{order.transferContent}</strong></p>
                    )}
                    {order.shippingAddress && (
                      <p className="flex gap-1 sm:col-span-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><span className="text-muted-foreground">Địa chỉ giao:</span> <strong>{order.shippingAddress}</strong></span></p>
                    )}
                  </div>
                </div>

                {order.notes && <p className="rounded bg-muted p-2"><span className="text-muted-foreground">Ghi chú:</span> {order.notes}</p>}

                <div className="flex flex-wrap gap-2 pt-1">
                  {order.status === "pending" && (
                    isCod ? (
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm" onClick={() => confirmCodOrder(order.id)}>
                        Xác nhận đơn & Chuẩn bị máy
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm" onClick={() => confirmBankPaymentAndOrder(order.id)}>
                        Xác nhận đã nhận tiền
                      </Button>
                    )
                  )}

                  {order.status === "confirmed" && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm" onClick={() => completeOrder(order)}>
                      {isCod ? "Đã giao & Thu tiền COD" : "Đã giao máy cho khách"}
                    </Button>
                  )}

                  {order.status !== "completed" && order.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => cancelOrder(order)}>
                      Hủy đơn
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {visible.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">Chưa có đơn mua nào.</CardContent></Card>}
    </div>
  )
}
