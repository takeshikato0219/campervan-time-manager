import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Button } from "./ui/button";
import {
    LayoutDashboard,
    Calendar,
    Car,
    Clock,
    BarChart3,
    LogOut,
    Menu,
    X,
    Download,
    Settings,
    Users,
    CheckSquare,
    ClipboardCheck,
    Coffee,
    CalendarDays,
    Database,
    Timer,
} from "lucide-react";

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const { user } = useAuth();
    const [location] = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const logoutMutation = trpc.auth.logout.useMutation({
        onSuccess: () => {
            window.location.href = "/login";
        },
    });

    const menuItems = [
        { icon: LayoutDashboard, label: "マイダッシュボード", path: "/", admin: false },
        { icon: Calendar, label: "出退勤記録", path: "/my-attendance", admin: false },
        { icon: Clock, label: "作業記録管理", path: "/work-records", admin: false },
        { icon: Car, label: "車両管理", path: "/vehicles", admin: false },
        { icon: ClipboardCheck, label: "車両チェック", path: "/vehicle-checks", admin: false },
        { icon: CalendarDays, label: "スタッフ休み予定一覧", path: "/staff-schedule", admin: false },
        { icon: Timer, label: "車両制作時間確認", path: "/vehicle-production", admin: false },
        { icon: BarChart3, label: "統計・分析", path: "/analytics", admin: false },
    ];

    const adminMenuItems = [
        { icon: Calendar, label: "出退勤管理", path: "/admin/attendance", admin: true },
        { icon: Clock, label: "作業記録管理", path: "/admin/work-records", admin: true },
        { icon: Download, label: "CSV出力", path: "/admin/csv-export", admin: true },
        { icon: Settings, label: "工程管理", path: "/admin/processes", admin: true },
        { icon: Car, label: "車種管理", path: "/admin/vehicle-types", admin: true },
        { icon: CheckSquare, label: "チェック項目管理", path: "/admin/check-items", admin: true },
        { icon: Coffee, label: "休憩時間管理", path: "/admin/break-times", admin: true },
        { icon: CalendarDays, label: "スタッフ休み予定一覧（管理）", path: "/admin/staff-schedule", admin: true },
        { icon: Users, label: "ユーザー管理", path: "/admin/users", admin: true },
        { icon: Database, label: "バックアップ管理", path: "/admin/backup", admin: true },
    ];

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    return (
        <div className="min-h-screen bg-[hsl(var(--background))]">
            {/* ヘッダー */}
            <header className="sticky top-0 z-30 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="container mx-auto flex h-16 items-center justify-between px-2 sm:px-4 gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden flex-shrink-0"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </Button>
                        <Link href="/" className="min-w-0 flex-1">
                            <h1 className="text-base sm:text-xl font-bold truncate cursor-pointer hover:opacity-80 transition-opacity">
                                キャンピングカー架装時間管理
                            </h1>
                        </Link>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <span className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] truncate max-w-[80px] sm:max-w-none">
                            {user?.name || user?.username}さん
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
                            <LogOut className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">ログアウト</span>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* サイドバー */}
                <aside
                    className={`w-64 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] min-h-[calc(100vh-4rem)] md:sticky md:top-16 fixed top-16 left-0 bottom-0 z-20 transition-transform duration-300 overflow-y-auto ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                        }`}
                >
                    <nav className="p-4 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location === item.path;
                            return (
                                <Link key={item.path} href={item.path}>
                                    <div
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${isActive
                                            ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                                            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                                            }`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </div>
                                </Link>
                            );
                        })}

                        {user?.role === "admin" && (
                            <>
                                <div className="pt-4 mt-4 border-t border-[hsl(var(--border))]">
                                    <p className="px-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">
                                        管理者メニュー
                                    </p>
                                </div>
                                {adminMenuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location === item.path;
                                    return (
                                        <Link key={item.path} href={item.path}>
                                            <div
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${isActive
                                                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                                                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                                                    }`}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                <Icon className="h-5 w-5" />
                                                <span>{item.label}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                    </nav>
                </aside>

                {/* メインコンテンツ */}
                <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8">{children}</main>
            </div>

            {/* モバイルメニューのオーバーレイ */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-10 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}

