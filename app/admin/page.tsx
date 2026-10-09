"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, CalendarDays, Camera, LogOut, Package, Settings } from "lucide-react"
import { useGlobalErrorLogger } from "@/hooks/useGlobalErrorLogger"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CameraManagement } from "@/components/camera-management"
import { OrderManagement } from "@/components/order-management"
import { RevenueManagement } from "@/components/revenue-management"
import { SalesCalendar } from "@/components/sales-calendar"
import { SettingsImage } from "@/components/settings-image"

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()
  useGlobalErrorLogger()

  useEffect(() => {
    if (localStorage.getItem("adminAuth") === "true") setAuthenticated(true)
    else router.replace("/admin/khanh")
  }, [router])

  if (!authenticated) {
    return <div className="flex min-h-screen items-center justify-center">Đang tải...</div>
  }

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-2">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">chupchoet.camera</h1>
              <p className="text-sm text-muted-foreground">Quản trị marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">Admin</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem("adminAuth")
                router.replace("/admin/khanh")
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="listings" className="gap-7">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-3xl border border-white/40 bg-white/45 p-2 shadow-inner backdrop-blur-2xl sm:grid-cols-5">
            <TabsTrigger value="listings" className="h-11 rounded-2xl data-[state=active]:bg-amber-50 data-[state=active]:shadow-lg">
              <Camera className="mr-2 h-4 w-4" />
              Máy ảnh
            </TabsTrigger>
            <TabsTrigger value="orders" className="h-11 rounded-2xl data-[state=active]:bg-amber-50 data-[state=active]:shadow-lg">
              <Package className="mr-2 h-4 w-4" />
              Đơn hàng
            </TabsTrigger>
            <TabsTrigger value="calendar" className="h-11 rounded-2xl data-[state=active]:bg-amber-50 data-[state=active]:shadow-lg">
              <CalendarDays className="mr-2 h-4 w-4" />
              Lịch
            </TabsTrigger>
            <TabsTrigger value="revenue" className="h-11 rounded-2xl data-[state=active]:bg-amber-50 data-[state=active]:shadow-lg">
              <BarChart3 className="mr-2 h-4 w-4" />
              Quản lý
            </TabsTrigger>
            <TabsTrigger value="settings" className="h-11 rounded-2xl data-[state=active]:bg-amber-50 data-[state=active]:shadow-lg">
              <Settings className="mr-2 h-4 w-4" />
              Cài đặt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            <CameraManagement />
          </TabsContent>
          <TabsContent value="orders">
            <OrderManagement />
          </TabsContent>
          <TabsContent value="calendar">
            <SalesCalendar />
          </TabsContent>
          <TabsContent value="revenue">
            <RevenueManagement />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsImage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
