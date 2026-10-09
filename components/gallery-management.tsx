"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { ref as dbRef, set, get, remove } from "firebase/database"
import { database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Trash2, ImageIcon, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GalleryImage {
  id: string
  url: string
  name: string
  uploadedAt: string
}

/**
 * Chuyển URL ảnh cũ thành URL API mới.
 *
 * URL cũ:
 * /uploads/gallery/image.jpg
 * /uploads/Fujifilm_XS10/image.jpg
 *
 * URL mới:
 * /api/upload?cameraName=gallery&file=abc.jpg
 */
function resolveImageUrl(url: string | undefined | null): string {
  if (!url) {
    return "/placeholder.svg"
  }

  // URL API mới đã đúng định dạng.
  if (url.startsWith("/api/upload?")) {
    return url
  }

  try {
    const parsed = new URL(url, "http://localhost")

    // Hỗ trợ URL ảnh cũ lưu trong Firebase.
    if (parsed.pathname.startsWith("/uploads/")) {
      const parts = parsed.pathname.split("/")

      if (parts.length === 4 && parts[2] && parts[3]) {
        const params = new URLSearchParams({
          cameraName: parts[2],
          file: parts[3],
        })

        return `/api/upload?${params.toString()}`
      }
    }
  } catch (error) {
    console.error("URL ảnh không hợp lệ:", error)
    return "/placeholder.svg"
  }

  // Giữ nguyên các URL khác, ví dụ URL ảnh HTTPS bên ngoài.
  return url
}

export function GalleryManagement() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()

  /**
   * Tải danh sách ảnh từ Firebase Realtime Database.
   */
  const loadImages = useCallback(async () => {
    try {
      const galleryRef = dbRef(database, "gallery")
      const snapshot = await get(galleryRef)

      if (snapshot.exists()) {
        const data = snapshot.val()

        const imageList: GalleryImage[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }))

        imageList.sort(
          (a, b) =>
            new Date(b.uploadedAt).getTime() -
            new Date(a.uploadedAt).getTime(),
        )

        setImages(imageList)
      } else {
        setImages([])
      }
    } catch (error) {
      console.error("Lỗi tải danh sách ảnh:", error)

      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách ảnh",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadImages()
  }, [loadImages])

  /**
   * Upload nhiều ảnh:
   * 1. Gửi file đến API /api/upload.
   * 2. API lưu ảnh vào storage/uploads/gallery.
   * 3. Lưu URL và thông tin ảnh vào Firebase.
   */
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = e.currentTarget
    const files = input.files

    if (!files || files.length === 0) {
      return
    }

    // Lưu danh sách file trước khi reset input.
    const selectedFiles = Array.from(files)

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("cameraName", "gallery")

      for (const file of selectedFiles) {
        formData.append("files", file)
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload ảnh thất bại")
      }

      const urls: string[] = result.urls

      if (
        !Array.isArray(urls) ||
        urls.length !== selectedFiles.length
      ) {
        throw new Error("API không trả về đủ URL ảnh")
      }

      // Lưu metadata vào Firebase Realtime Database.
      const uploadedAt = new Date().toISOString()

      for (let i = 0; i < urls.length; i++) {
        const imageId = `img_${Date.now()}_${i}_${Math.random()
          .toString(36)
          .slice(2, 8)}`

        await set(dbRef(database, `gallery/${imageId}`), {
          url: urls[i],
          name: selectedFiles[i].name,
          uploadedAt,
        })
      }

      toast({
        title: "Thành công",
        description: `Đã upload ${selectedFiles.length} ảnh`,
      })

      await loadImages()
    } catch (error) {
      console.error("Lỗi upload ảnh:", error)

      toast({
        title: "Lỗi",
        description:
          error instanceof Error
            ? error.message
            : "Không thể upload ảnh",
        variant: "destructive",
      })

      // Làm mới danh sách trong trường hợp một phần metadata đã được lưu.
      await loadImages()
    } finally {
      setUploading(false)

      // Cho phép chọn lại cùng một file.
      input.value = ""
    }
  }

  /**
   * Xóa file qua API trước, sau đó xóa metadata khỏi Firebase.
   */
  const handleDelete = async (image: GalleryImage) => {
    if (!confirm(`Xóa ảnh "${image.name}"?`)) {
      return
    }

    try {
      const response = await fetch("/api/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: image.url,
        }),
      })

      const result = await response.json()

      // Không xóa metadata nếu API xóa file thất bại.
      if (!response.ok) {
        throw new Error(result.error || "Không thể xóa file ảnh")
      }

      // Xóa metadata khỏi Firebase sau khi API thành công.
      await remove(dbRef(database, `gallery/${image.id}`))

      toast({
        title: "Đã xóa",
        description: "Ảnh đã được xóa khỏi gallery",
      })

      await loadImages()
    } catch (error) {
      console.error("Lỗi xóa ảnh:", error)

      toast({
        title: "Lỗi",
        description:
          error instanceof Error
            ? error.message
            : "Không thể xóa ảnh",
        variant: "destructive",
      })
    }
  }

  /**
   * Trạng thái tải danh sách.
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề và nút upload */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Quản lý Gallery
          </h2>

          <p className="text-muted-foreground mt-1">
            Upload và quản lý ảnh hiển thị trên trang booking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="upload-images"
            className="cursor-pointer"
          >
            <div
              className={`glass-strong hover:glass-card px-6 py-3 rounded-xl flex items-center gap-2 transition-all border-2 border-white/30 ${
                uploading
                  ? "opacity-60 cursor-not-allowed"
                  : ""
              }`}
            >
              <Upload className="h-5 w-5" />

              <span className="font-medium">
                {uploading
                  ? "Đang upload..."
                  : "Upload ảnh"}
              </span>
            </div>
          </Label>

          <Input
            id="upload-images"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/bmp"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>
      </div>

      {/* Danh sách ảnh */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />

            <span className="font-semibold">
              {images.length} ảnh trong gallery
            </span>
          </div>

          <a
            href="https://www.facebook.com/media/set?vanity=bbbtranslation&set=a.746067487801116"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Xem album Facebook
          </a>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12 glass rounded-xl">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />

            <p className="text-muted-foreground">
              Chưa có ảnh nào. Upload ảnh để hiển thị trên
              trang booking.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map((image) => (
              <Card
                key={image.id}
                className="glass group overflow-hidden border-2 border-white/20 hover:border-white/40 transition-all"
              >
                <div className="aspect-square relative">
                  <img
                    src={resolveImageUrl(image.url)}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget

                      if (!img.src.endsWith("/placeholder.svg")) {
                        img.src = "/placeholder.svg"
                      }
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(image)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa
                    </Button>
                  </div>
                </div>

                <div className="p-2">
                  <p
                    className="text-xs text-muted-foreground truncate"
                    title={image.name}
                  >
                    {image.name}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
