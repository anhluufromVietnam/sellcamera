"use client"

import { useState } from "react"
import { Camera, Menu, ShoppingBag, X } from "lucide-react"
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
        <section className="relative overflow-hidden px-4 py-14 sm:py-24">
          <div className="container relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
            <div className="text-center lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full glass-light px-4 py-2 text-sm">
                <ShoppingBag className="h-4 w-4 text-pink-500" aria-hidden="true" />
                Mua bán máy ảnh dễ dàng
              </div>
              <h2 className="text-balance text-4xl font-bold leading-tight sm:text-6xl">
                <span className="text-pink-500">Tìm chiếc máy</span>
                <br />
                kể chuyện cùng bạn
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70 lg:mx-0">
                Những thân máy có cá tính, những khung hình đang chờ được kể. Khám phá, chọn lựa và sở hữu chiếc máy hợp với cách bạn nhìn thế giới.
              </p>
              <Button size="lg" className="mt-8 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-8 text-white" onClick={() => document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" })}>
                Xem máy ảnh
              </Button>
            </div>

            <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4" aria-label="Ảnh tham khảo phong cách nhiếp ảnh">
              <div className="space-y-3 pt-8 sm:space-y-4">
                <img src={referenceImages[0].src} alt={referenceImages[0].alt} width={1366} height={2049} fetchPriority="high" className="aspect-[2/3] w-full rounded-[2rem] bg-black/5 object-contain shadow-2xl" />
                <div className="glass-card rounded-[1.5rem] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-pink-500">chupchoet.camera</p>
                  <p className="mt-2 font-serif text-lg italic">Look closer.</p>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <img src={referenceImages[2].src} alt={referenceImages[2].alt} width={2730} height={4095} className="aspect-[2/3] w-full rounded-[2rem] bg-black/5 object-contain shadow-2xl" />
                <img src={referenceImages[3].src} alt={referenceImages[3].alt} width={1170} height={1708} className="aspect-[2/3] w-full rounded-[2rem] bg-black/5 object-contain shadow-2xl" />
              </div>
            </div>
          </div>
        </section>

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
                    {["Xem giá, tình trạng và thông số từng máy.", "Để lại thông tin liên hệ và ghi chú cho người bán.", "Ngày/giờ là tùy chọn để hẹn nhận hàng, không phải thời gian thuê."][index]}
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
