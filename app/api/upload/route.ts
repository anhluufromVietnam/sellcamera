import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Lưu ảnh trong thư mục dự án: <project>/storage/uploads
// Có thể ghi đè bằng biến môi trường UPLOAD_DIR nếu cần.
const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads"),
)

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".bmp",
]

function safeCameraName(value: string) {
  const name = path.basename(value).replace(/[^a-zA-Z0-9_-]/g, "_")

  if (!name || name === "." || name === "..") {
    throw new Error("Tên thư mục không hợp lệ")
  }

  return name
}

function getSafeFilePath(cameraName: string, fileName: string) {
  const camera = safeCameraName(cameraName)
  const file = path.basename(fileName)

  if (
    !file ||
    file !== fileName ||
    file === "." ||
    file === ".." ||
    file.includes("\0")
  ) {
    throw new Error("Tên file không hợp lệ")
  }

  const directory = path.resolve(UPLOAD_ROOT, camera)
  const fullPath = path.resolve(directory, file)

  if (!fullPath.startsWith(directory + path.sep)) {
    throw new Error("Đường dẫn không hợp lệ")
  }

  return fullPath
}

function getMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()

  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
  }

  return types[ext] || "application/octet-stream"
}

function isAllowedImage(fileName: string) {
  return ALLOWED_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
}

// GET /api/upload?cameraName=gallery&file=abc.jpg
// Đọc ảnh từ storage/uploads và trả trực tiếp về trình duyệt.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cameraName = searchParams.get("cameraName") || ""
    const fileName = searchParams.get("file") || ""

    if (!cameraName || !fileName) {
      return NextResponse.json(
        { error: "Thiếu cameraName hoặc file" },
        { status: 400 },
      )
    }

    if (!isAllowedImage(fileName)) {
      return NextResponse.json(
        { error: "Định dạng ảnh không được hỗ trợ" },
        { status: 400 },
      )
    }

    const filePath = getSafeFilePath(cameraName, fileName)

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json(
        { error: "Không tìm thấy ảnh" },
        { status: 404 },
      )
    }

    const buffer = fs.readFileSync(filePath)

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getMimeType(fileName),
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Lỗi đọc ảnh:", error)

    return NextResponse.json(
      { error: "Không thể đọc ảnh" },
      { status: 400 },
    )
  }
}

// POST /api/upload
// Nhận files và lưu vào storage/uploads/<cameraName>/.
// Trả URL API để frontend có thể hiển thị ảnh cả trong production.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const cameraName = safeCameraName(
      String(formData.get("cameraName") || "unknown"),
    )

    const files = formData.getAll("files").filter(
      (item): item is File => item instanceof File && item.size > 0,
    )

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Không có file ảnh" },
        { status: 400 },
      )
    }

    // Kiểm tra tất cả file trước khi bắt đầu ghi để tránh upload dở dang
    // khi gặp file sai định dạng.
    for (const file of files) {
      const ext = path.extname(path.basename(file.name)).toLowerCase()

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Định dạng ảnh không được hỗ trợ: ${file.name}` },
          { status: 400 },
        )
      }
    }

    const uploadDir = path.join(UPLOAD_ROOT, cameraName)
    fs.mkdirSync(uploadDir, { recursive: true })

    const urls: string[] = []

    for (const file of files) {
      const ext = path.extname(path.basename(file.name)).toLowerCase()
      const storedName = `${randomUUID()}${ext}`
      const filePath = getSafeFilePath(cameraName, storedName)
      const bytes = Buffer.from(await file.arrayBuffer())

      fs.writeFileSync(filePath, bytes, { flag: "wx" })

      const params = new URLSearchParams({
        cameraName,
        file: storedName,
      })

      urls.push(`/api/upload?${params.toString()}`)
    }

    return NextResponse.json({ urls })
  } catch (error) {
    console.error("Lỗi upload ảnh:", error)

    return NextResponse.json(
      { error: "Không thể upload ảnh" },
      { status: 500 },
    )
  }
}

// DELETE /api/upload
// Body: { "url": "/api/upload?cameraName=gallery&file=abc.jpg" }
// Hỗ trợ URL API mới và URL cũ dạng /uploads/gallery/abc.jpg.
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const url = body?.url

    if (typeof url !== "string" || !url) {
      return NextResponse.json(
        { error: "Thiếu URL ảnh" },
        { status: 400 },
      )
    }

    // Chỉ xử lý URL cùng origin với ứng dụng, tránh URL ngoài.
    const parsed = new URL(url, req.nextUrl.origin)

    if (parsed.origin !== req.nextUrl.origin) {
      return NextResponse.json(
        { error: "URL ảnh không hợp lệ" },
        { status: 400 },
      )
    }

    let cameraName: string | null = null
    let fileName: string | null = null

    if (parsed.pathname === "/api/upload") {
      cameraName = parsed.searchParams.get("cameraName")
      fileName = parsed.searchParams.get("file")
    } else if (parsed.pathname.startsWith("/uploads/")) {
      const parts = parsed.pathname.split("/")

      if (parts.length !== 4) {
        return NextResponse.json(
          { error: "URL ảnh không hợp lệ" },
          { status: 400 },
        )
      }

      cameraName = parts[2]
      fileName = parts[3]
    } else {
      return NextResponse.json(
        { error: "URL ảnh không hợp lệ" },
        { status: 400 },
      )
    }

    if (!cameraName || !fileName) {
      return NextResponse.json(
        { error: "URL ảnh không hợp lệ" },
        { status: 400 },
      )
    }

    if (!isAllowedImage(fileName)) {
      return NextResponse.json(
        { error: "Định dạng ảnh không được hỗ trợ" },
        { status: 400 },
      )
    }

    // URL cũ cũng được tìm trong storage/uploads.
    // Nếu ảnh cũ vẫn nằm trong public/uploads, hãy chuyển ảnh sang
    // storage/uploads/<cameraName>/ trước khi xóa qua API này.
    const filePath = getSafeFilePath(cameraName, fileName)

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json(
        { error: "Ảnh không tồn tại trên ổ đĩa" },
        { status: 404 },
      )
    }

    fs.unlinkSync(filePath)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Lỗi xóa ảnh:", error)

    return NextResponse.json(
      { error: "Không thể xóa ảnh" },
      { status: 500 },
    )
  }
}
