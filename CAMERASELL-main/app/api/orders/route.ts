import { NextResponse } from "next/server"
import { getAdminDatabase } from "@/lib/firebase-admin"

type PaymentMethod = "bank_transfer" | "cod"

interface CreateOrderPayload {
  cameraId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  pickupDate?: string | null
  pickupTime?: string | null
  shippingAddress?: string | null
  notes?: string
  paymentMethod?: PaymentMethod
  transferContent?: string | null
}

const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value)

export async function POST(req: Request) {
  try {
    const payload = await req.json() as CreateOrderPayload
    const paymentMethod = payload.paymentMethod === "cod" ? "cod" : "bank_transfer"
    const customerName = payload.customerName?.trim()
    const customerEmail = payload.customerEmail?.trim()
    const customerPhone = payload.customerPhone?.trim()
    const shippingAddress = payload.shippingAddress?.trim()

    if (!payload.cameraId) {
      return NextResponse.json({ error: "Thiếu sản phẩm" }, { status: 400 })
    }

    if (!customerName || !customerPhone || !customerEmail) {
      return NextResponse.json({ error: "Thiếu thông tin khách hàng" }, { status: 400 })
    }

    if (!isEmail(customerEmail)) {
      return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 })
    }

    if (paymentMethod === "cod" && !shippingAddress) {
      return NextResponse.json({ error: "Thiếu địa chỉ giao hàng COD" }, { status: 400 })
    }

    const adminDb = getAdminDatabase()
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // Get current stock
    const productRef = `products/${payload.cameraId}`
    const productSnapshot = await adminDb.ref(productRef).get()
    
    if (!productSnapshot.exists()) {
      return NextResponse.json({ error: "Sản phẩm không tồn tại" }, { status: 404 })
    }

    const product = productSnapshot.val() || {}
    const currentStock = Number(product.stock || 0)
    if (currentStock <= 0 || product.status === "hidden") {
      return NextResponse.json({ error: "Sản phẩm đã hết hàng" }, { status: 409 })
    }

    const nextStock = currentStock - 1
    const orderRef = `orders/${orderId}`

    // Update stock
    await adminDb.ref(productRef).update({
      stock: nextStock,
      status: nextStock === 0 ? "sold" : "active",
    })

    // Create order
    await adminDb.ref(orderRef).set({
      cameraId: payload.cameraId,
      cameraName: product.name || "Sản phẩm không rõ",
      unitPrice: Number(product.salePrice ?? product.price ?? 0),
      customerName,
      customerEmail,
      customerPhone,
      pickupDate: payload.pickupDate || null,
      pickupTime: payload.pickupTime || null,
      shippingAddress: paymentMethod === "cod" ? shippingAddress : null,
      shippingMethod: paymentMethod === "cod" ? "cod" : "pickup_or_transfer",
      notes: payload.notes || "",
      paymentAmount: Number(product.salePrice ?? product.price ?? 0),
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "cod_pending" : "awaiting_confirmation",
      transferContent: paymentMethod === "bank_transfer" ? payload.transferContent || null : null,
      status: "pending",
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ orderId }, { status: 201 })
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json({ error: "Không thể tạo đơn" }, { status: 500 })
  }
}
