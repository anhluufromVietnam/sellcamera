import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

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

    const adminDb = getAdminDb()
    const orderId = await adminDb.runTransaction(async (transaction) => {
      const productRef = adminDb.collection("products").doc(payload.cameraId!)
      const productSnapshot = await transaction.get(productRef)

      if (!productSnapshot.exists) {
        throw new Error("PRODUCT_NOT_FOUND")
      }

      const product = productSnapshot.data() || {}
      const currentStock = Number(product.stock || 0)
      if (currentStock <= 0 || product.status === "hidden") {
        throw new Error("OUT_OF_STOCK")
      }

      const nextStock = currentStock - 1
      const orderRef = adminDb.collection("orders").doc()

      transaction.update(productRef, {
        stock: nextStock,
        status: nextStock === 0 ? "sold" : "active",
      })

      transaction.set(orderRef, {
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

      return orderRef.id
    })

    return NextResponse.json({ orderId }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""

    if (message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Sản phẩm không tồn tại" }, { status: 404 })
    }

    if (message === "OUT_OF_STOCK") {
      return NextResponse.json({ error: "Sản phẩm đã hết hàng" }, { status: 409 })
    }

    console.error("Create order error:", error)
    return NextResponse.json({ error: "Không thể tạo đơn" }, { status: 500 })
  }
}
