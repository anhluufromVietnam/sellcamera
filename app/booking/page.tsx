"use client"

import { useState } from "react"
import { Camera, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicBooking } from "@/components/public-booking"

export default function MarketplacePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const referenceImages = [
    { src: "/camera1.jpg", alt: "Máy ảnh film trong bộ sưu tập tham khảo", label: "Film stories" },
    { src: "/camera2.jpg", alt: "Khoảnh khắc chụp thử với máy ảnh Fujifilm", label: "Everyday frames" },
    { src: "/camera3.jpg", alt: "Máy ảnh Fujifilm XT100", label: "Classic bodies" },
    { src: "/DE74CB7F-E2CD-4AEA-B03C-9ED9A98C511D.jpg", alt: "Máy ảnh trong bộ ảnh tham khảo", label: "Quiet details" },
    { src: "/2a7e512e-6ed5-45ae-a94e-5c33fc9e5c89.jpeg", alt: "Khoảnh khắc đời thường qua ống kính", label: "Soft light" },
  ]

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-3" aria-label="chupchoet.camera trang chủ">
            <div className="rounded-2xl bg-gradient-to-br from-pink-400/30 to-purple-400/30 p-2">
              <Camera className="h-7 w-7 text-pink-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-pink-500 sm:text-2xl">chupchoet.camera</h1>
              <p className="text-xs text-foreground/60">Mua bán máy ảnh đã chọn lọc</p>
            </div>
          </a>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#listings" className="font-medium hover:text-pink-500">Máy ảnh</a>
            <a href="#how-it-works" className="font-medium hover:text-pink-500">Cách mua</a>
          </nav>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Đóng menu" : "Mở menu"}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 md:hidden">
            <a href="#listings" onClick={() => setMenuOpen(false)}>Máy ảnh</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>Cách mua</a>
          </nav>
        )}
      </header>

      <main>
        <section id="listings" className="container mx-auto px-4 py-12 sm:px-6 sm:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Máy ảnh đang được đăng bán</h2>
            <p className="mt-3 text-foreground/70">Chọn sản phẩm, điền thông tin và hẹn thời gian nhận nếu cần.</p>
          </div>
          <PublicBooking />
        </section>

        <section className="border-y border-white/10 px-4 py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-500">Thư viện cảm hứng</p>
                <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Nhìn máy ảnh theo cách khác</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-foreground/65">
                Ảnh mẫu trong kho được giữ lại như một góc tham khảo để bạn cảm nhận màu sắc, chất liệu và tinh thần của từng chiếc máy.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {referenceImages.map((image, index) => (
                <figure key={image.src} className={`group relative overflow-hidden rounded-[1.75rem] bg-black/5 ${index === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}>
                  <img src={image.src} alt={image.alt} width={2730} height={4095} loading="lazy" className="aspect-[2/3] h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-12 text-sm font-medium text-white">{image.label}</div>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-white/10 px-4 py-16">
          <div className="container mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-3xl font-bold">Mua máy ảnh tại chupchoet.camera</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {["Chọn sản phẩm", "Gửi yêu cầu mua", "Nhận máy đã hẹn"].map((title, index) => (
                <div key={title} className="glass-card rounded-2xl p-6 text-center">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">{index + 1}</div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    {["Xem giá, tình trạng và thông số từng máy.", "Để lại thông tin liên hệ và chọn địa điểm lấy máy.", "Hẹn ngày/giờ đến shop lấy máy đã chọn."][index]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 py-10 text-center text-sm text-foreground/60">
        © 2026 chupchoet.camera · Mua bán máy ảnh cho người yêu nhiếp ảnh
      </footer>
    </div>
  )
}
