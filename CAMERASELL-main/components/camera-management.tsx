"use client"

import { useEffect, useMemo, useState } from "react"
import { ref as dbRef, set, get, remove, onValue, query, orderByChild, equalTo } from "firebase/database"
import { Camera, Edit, Package, Plus, Search, Trash2, X } from "lucide-react"
import { database } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export interface CameraListing {
  id: string
  name: string
  brand: string
  model: string
  category: string
  salePrice: number
  stock: number
  description: string
  specifications: string
  status: "active" | "sold" | "hidden"
  images?: string[]
}

export function normalizeCameraListing(id: string, value: Partial<CameraListing> & { price?: number }) {
  return {
    id,
    name: value.name || "Máy ảnh chưa đặt tên",
    brand: value.brand || "",
    model: value.model || "",
    category: value.category || "",
    salePrice: Number(value.salePrice ?? value.price ?? 0),
    stock: Math.max(0, Number(value.stock ?? 0)),
    description: value.description || "",
    specifications: value.specifications || "",
    status: value.status || "active",
    images: Array.isArray(value.images) ? value.images : [],
  } satisfies CameraListing
}

const CATEGORIES = ["DSLR", "Mirrorless", "Film Camera", "Action Camera", "Instant Camera", "Medium Format"]

export function CameraManagement() {
  const [cameras, setCameras] = useState<CameraListing[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingCamera, setEditingCamera] = useState<CameraListing | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const productsRef = dbRef(database, "products")
    return onValue(productsRef, (snapshot) => {
      const data = snapshot.val() || {}
      setCameras(Object.keys(data).map((key) => normalizeCameraListing(key, data[key] as Partial<CameraListing> & { price?: number })))
    }, () => {
      try {
        const saved = localStorage.getItem("cameras")
        setCameras(saved ? JSON.parse(saved) : [])
      } catch {
        setCameras([])
      }
    })
  }, [])

  const saveLocal = (next: CameraListing[]) => {
    setCameras(next)
    localStorage.setItem("cameras", JSON.stringify(next))
  }

  const normalizeStatus = (data: Omit<CameraListing, "id">) => {
    let status = data.status
    if (data.stock > 0 && status === "sold") {
      status = "active"
    } else if (data.stock === 0 && status === "active") {
      status = "sold"
    }
    return { ...data, status }
  }

  const addCamera = async (rawData: Omit<CameraListing, "id">) => {
    const data = normalizeStatus(rawData)
    const id = Date.now().toString()
    try {
      await set(dbRef(database, "products/" + id), data)
    } catch {
      saveLocal([...cameras, { ...data, id }])
    }
    setIsAddOpen(false)
    toast({ title: "Đã đăng bán", description: "Tin đăng máy ảnh đã được lưu." })
  }

  const editCamera = async (rawData: Omit<CameraListing, "id">) => {
    if (!editingCamera) return
    const data = normalizeStatus(rawData)
    try {
      await set(dbRef(database, "products/" + editingCamera.id), data)
    } catch {
      saveLocal(cameras.map((camera) => camera.id === editingCamera.id ? { ...data, id: camera.id } : camera))
    }
    setEditingCamera(null)
    toast({ title: "Đã cập nhật", description: "Tin đăng đã được cập nhật." })
  }

  const deleteCamera = async (camera: CameraListing) => {
    if (!window.confirm(`Xóa tin đăng "${camera.name}"?`)) return
    try {
      await remove(dbRef(database, "products/" + camera.id))
    } catch {
      saveLocal(cameras.filter((item) => item.id !== camera.id))
    }
    toast({ title: "Đã xóa tin đăng" })
  }

  const filtered = useMemo(() => cameras.filter((camera) =>
    [camera.name, camera.brand, camera.model, camera.category].some((value) =>
      value?.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  ), [cameras, searchTerm])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tin đăng máy ảnh</h2>
          <p className="text-muted-foreground">Đăng bán, chỉnh sửa và quản lý máy ảnh trên chupchoet.camera.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Đăng máy ảnh</Button></DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>Đăng máy ảnh mới</DialogTitle><DialogDescription>Thêm thông tin sản phẩm để người mua có thể đặt mua.</DialogDescription></DialogHeader>
            <CameraForm onSubmit={addCamera} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tìm theo tên, hãng hoặc dòng máy..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Package className="h-4 w-4" />{cameras.length} tin đăng</div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((camera) => (
          <Card key={camera.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2"><Camera className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><CardTitle className="truncate text-lg">{camera.name}</CardTitle><CardDescription className="truncate">{camera.brand} {camera.model}</CardDescription></div></div>
                <Badge variant={camera.status === "active" ? "default" : "secondary"}>{camera.status === "active" ? "Đang bán" : camera.status === "sold" ? "Đã bán" : "Ẩn"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {camera.images?.[0] && <img src={camera.images[0]} alt={camera.name} className="aspect-[4/3] w-full rounded-lg object-cover" />}
              <div className="grid grid-cols-2 gap-3 text-sm"><div><Label className="text-muted-foreground">Giá bán</Label><p className="font-semibold text-primary">{Number(camera.salePrice || 0).toLocaleString("vi-VN")}đ</p></div><div><Label className="text-muted-foreground">Tồn kho</Label><p className="font-medium">{Number(camera.stock || 0)} sản phẩm</p></div></div>
              <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEditingCamera(camera)}><Edit className="mr-1 h-3 w-3" />Sửa</Button><Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteCamera(camera)}><Trash2 className="mr-1 h-3 w-3" />Xóa</Button></div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <Card><CardContent className="flex flex-col items-center py-12 text-center"><Camera className="mb-4 h-12 w-12 text-muted-foreground" /><p className="font-semibold">Chưa có tin đăng phù hợp</p><p className="text-sm text-muted-foreground">Hãy đăng chiếc máy ảnh đầu tiên của bạn.</p></CardContent></Card>}

      <Dialog open={Boolean(editingCamera)} onOpenChange={(open) => !open && setEditingCamera(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Chỉnh sửa tin đăng</DialogTitle><DialogDescription>Cập nhật thông tin sản phẩm.</DialogDescription></DialogHeader>
          {editingCamera && <CameraForm camera={editingCamera} onSubmit={editCamera} isEditing />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CameraForm({ camera, onSubmit, isEditing = false }: { camera?: CameraListing; onSubmit: (data: Omit<CameraListing, "id">) => void; isEditing?: boolean }) {
  const [formData, setFormData] = useState<Omit<CameraListing, "id">>({
    name: camera?.name || "", brand: camera?.brand || "", model: camera?.model || "", category: camera?.category || "",
    salePrice: camera?.salePrice || 0, stock: camera?.stock || 1, description: camera?.description || "", specifications: camera?.specifications || "",
    status: camera?.status || "active", images: camera?.images || [],
  })
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setUploading(true)
    let images = formData.images || []
    if (files.length) {
      const body = new FormData()
      files.forEach((file) => body.append("files", file))
      body.append("cameraName", formData.name)
      try {
        const response = await fetch("/api/upload", { method: "POST", body })
        if (response.ok) images = [...images, ...(await response.json()).urls]
      } catch { /* The listing can still be saved without uploaded images. */ }
    }
    const finalStatus = formData.stock > 0 && formData.status === "sold" ? "active" : formData.stock === 0 && formData.status === "active" ? "sold" : formData.status
    onSubmit({ ...formData, status: finalStatus, images })
    setUploading(false)
  }

  const existingImages = formData.images || []

  return <form onSubmit={handleSubmit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      {(["name", "brand", "model"] as const).map((field) => <div key={field}><Label>{field === "name" ? "Tên sản phẩm" : field === "brand" ? "Thương hiệu" : "Model"} *</Label><Input required value={formData[field]} onChange={(event) => setFormData({ ...formData, [field]: event.target.value })} /></div>)}
      <div><Label>Loại máy ảnh</Label><Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}><SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger><SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Giá bán (VNĐ) *</Label><Input required min="0" type="number" value={formData.salePrice} onChange={(event) => setFormData({ ...formData, salePrice: Number(event.target.value) || 0 })} /></div>
      <div><Label>Số lượng *</Label><Input required min="0" type="number" value={formData.stock} onChange={(event) => {
        const newStock = Number(event.target.value) || 0
        setFormData((prev) => ({
          ...prev,
          stock: newStock,
          status: newStock > 0 && prev.status === "sold" ? "active" : newStock === 0 && prev.status === "active" ? "sold" : prev.status,
        }))
      }} /></div>
    </div>
    <div><Label>Ảnh sản phẩm</Label><Input type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />{existingImages.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{existingImages.map((image) => <img key={image} src={image} alt="" className="h-16 w-16 rounded object-cover" />)}</div>}</div>
    <div><Label>Mô tả</Label><Textarea rows={3} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} /></div>
    <div><Label>Thông số kỹ thuật</Label><Textarea rows={3} value={formData.specifications} onChange={(event) => setFormData({ ...formData, specifications: event.target.value })} /></div>
    <div><Label>Trạng thái</Label><Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as CameraListing["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Đang bán</SelectItem><SelectItem value="hidden">Ẩn tin</SelectItem><SelectItem value="sold">Đã bán</SelectItem></SelectContent></Select></div>
    <Button type="submit" disabled={uploading}>{uploading ? "Đang lưu..." : isEditing ? "Cập nhật tin đăng" : "Đăng bán"}</Button>
  </form>
}
