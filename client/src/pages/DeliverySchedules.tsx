import React, { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Edit, Plus, Trash2, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";

const OPTION_PRESETS = [
    "家庭用クーラー",
    "ワンクール",
    "クールスター",
    "インバーター1500",
    "リチウムイオン200",
    "リチウムイオン300",
    "リチウムイオン400",
    "FFヒーター",
    "ベンチレーター",
    "ソーラー",
    "ルーフクーラー",
];

export default function DeliverySchedules() {
    const { user } = useAuth();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [isCalendarMode, setIsCalendarMode] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [otherOption, setOtherOption] = useState("");
    const [specFile, setSpecFile] = useState<File | null>(null);

    const { data, refetch, isLoading } = trpc.deliverySchedules.list.useQuery({ year, month });

    const createMutation = trpc.deliverySchedules.create.useMutation({
        onSuccess: () => {
            toast.success("納車スケジュールを追加しました");
            setIsEditDialogOpen(false);
            setEditing(null);
            refetch();
        },
        onError: (e) => toast.error(e.message || "追加に失敗しました"),
    });

    const updateMutation = trpc.deliverySchedules.update.useMutation({
        onSuccess: () => {
            toast.success("納車スケジュールを更新しました");
            setIsEditDialogOpen(false);
            setEditing(null);
            refetch();
        },
        onError: (e) => toast.error(e.message || "更新に失敗しました"),
    });

    const deleteMutation = trpc.deliverySchedules.delete.useMutation({
        onSuccess: () => {
            toast.success("納車スケジュールを削除しました");
            refetch();
        },
        onError: (e) => toast.error(e.message || "削除に失敗しました"),
    });

    const confirmPickupMutation = trpc.deliverySchedules.confirmPickup.useMutation({
        onSuccess: () => {
            toast.success("引き取り予定日を更新しました");
            refetch();
        },
        onError: (e) => toast.error(e.message || "更新に失敗しました"),
    });

    const uploadSpecSheetMutation = trpc.deliverySchedules.uploadSpecSheet.useMutation({
        onSuccess: () => {
            toast.success("仕様書をアップしました");
            setSpecFile(null);
            refetch();
        },
        onError: (e) => toast.error(e.message || "仕様書のアップに失敗しました"),
    });

    const canEdit = user && (user.role === "admin" || user.role === "sub_admin");

    const handlePrevMonth = () => {
        if (month === 1) {
            setYear((y) => y - 1);
            setMonth(12);
        } else {
            setMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setYear((y) => y + 1);
            setMonth(1);
        } else {
            setMonth((m) => m + 1);
        }
    };

    const groupedByDay = useMemo(() => {
        const map = new Map<string, DeliverySchedule[]>();
        (data || []).forEach((item: any) => {
            const d = item.deliveryPlannedDate ? new Date(item.deliveryPlannedDate) : null;
            const key = d ? format(d, "yyyy-MM-dd") : "未設定";
            const list = map.get(key) || [];
            list.push(item);
            map.set(key, list);
        });
        return Array.from(map.entries()).sort(([a], [b]) => (a === "未設定" ? 1 : b === "未設定" ? -1 : a.localeCompare(b)));
    }, [data]);

    const openNewDialog = () => {
        if (!canEdit) return;
        setEditing({
            vehicleName: "",
            vehicleType: "",
            customerName: "",
            optionName: "",
            optionCategory: "",
            prefecture: "",
            baseCarReady: "",
            furnitureReady: "",
            inCharge: "",
            dueDate: "",
            incomingPlannedDate: "",
            shippingPlannedDate: "",
            deliveryPlannedDate: "",
            comment: "",
            claimComment: "",
            oemComment: "",
        });
        setSelectedOptions([]);
        setOtherOption("");
        setSpecFile(null);
        setIsEditDialogOpen(true);
    };

    const handleSave = () => {
        if (!editing) return;
        if (!editing.vehicleName) {
            toast.error("車両の名前を入力してください");
            return;
        }

        const allOptions = [...selectedOptions];
        if (otherOption.trim()) {
            allOptions.push(otherOption.trim());
        }

        const payload = {
            vehicleName: editing.vehicleName,
            vehicleType: editing.vehicleType || undefined,
            customerName: editing.customerName || undefined,
            optionName: allOptions.length > 0 ? allOptions.join(" / ") : undefined,
            optionCategory: undefined,
            prefecture: editing.prefecture || undefined,
            baseCarReady: editing.baseCarReady || undefined,
            furnitureReady: editing.furnitureReady || undefined,
            inCharge: editing.inCharge || undefined,
            dueDate: editing.dueDate || undefined,
            incomingPlannedDate: editing.incomingPlannedDate || undefined,
            shippingPlannedDate: editing.shippingPlannedDate || undefined,
            deliveryPlannedDate: editing.deliveryPlannedDate || undefined,
            comment: editing.comment || undefined,
            claimComment: editing.claimComment || undefined,
            photosJson: undefined,
            oemComment: editing.oemComment || undefined,
        };

        const afterMutation = (id: number | null) => {
            if (specFile && id) {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result as string;
                    const fileType = specFile.type;
                    if (
                        fileType === "image/jpeg" ||
                        fileType === "image/jpg" ||
                        fileType === "application/pdf"
                    ) {
                        uploadSpecSheetMutation.mutate({
                            id,
                            fileData: base64,
                            fileName: specFile.name,
                            fileType: fileType as "image/jpeg" | "image/jpg" | "application/pdf",
                        });
                    } else {
                        toast.error("PDFまたはJPGファイルを選択してください");
                    }
                };
                reader.readAsDataURL(specFile);
            }
        };

        if (editing.id) {
            updateMutation.mutate(
                { id: editing.id, ...payload },
                {
                    onSuccess: () => {
                        toast.success("納車スケジュールを更新しました");
                        setIsEditDialogOpen(false);
                        setEditing(null);
                        afterMutation(editing.id);
                        refetch();
                    },
                } as any
            );
        } else {
            createMutation.mutate(payload as any, {
                onSuccess: () => {
                    toast.success("納車スケジュールを追加しました");
                    setIsEditDialogOpen(false);
                    setEditing(null);
                    setSpecFile(null);
                    refetch();
                },
            } as any);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">ワングラム様製造スケジュール</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-1 sm:mt-2 text-sm sm:text-base">
                        ワングラムデザインさんと共有する製造・納車スケジュールです（スマホ表示対応）。
                        オプション・注意事項・仕様書もまとめて管理できます。
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[7rem] text-center font-semibold">
                            {year}年{month}月
                        </span>
                        <Button variant="outline" size="icon" onClick={handleNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCalendarMode((v) => !v)}
                        className="flex items-center gap-1 text-xs sm:text-sm"
                    >
                        <CalendarDays className="h-4 w-4" />
                        {isCalendarMode ? "カード表示" : "一覧ビューモード"}
                    </Button>
                    {canEdit && (
                        <Button size="sm" onClick={openNewDialog} className="flex items-center gap-1 text-xs sm:text-sm">
                            <Plus className="h-4 w-4" />
                            追加
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        {isCalendarMode ? (
                            <>
                                <CalendarDays className="h-4 w-4" />
                                一覧ビューモード
                            </>
                        ) : (
                            <>今月のワングラム様製造スケジュール</>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {isLoading ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">読み込み中...</p>
                    ) : !data || data.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">この月の納車スケジュールはありません</p>
                    ) : isCalendarMode ? (
                        <div className="space-y-3">
                            {groupedByDay.map(([day, items]) => (
                                <div key={day} className="border border-[hsl(var(--border))] rounded-lg">
                                    <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[hsl(var(--muted))] text-xs sm:text-sm font-semibold flex items-center justify-between">
                                        <span>{day === "未設定" ? "日付未設定" : format(new Date(day), "M月d日")}</span>
                                        <span className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))]">
                                            {items.length}件
                                        </span>
                                    </div>
                                    <div className="divide-y divide-[hsl(var(--border))]">
                                        {items.map((item: any) => (
                                            <div key={item.id} className="p-2 sm:p-3 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-sm sm:text-base break-words">
                                                            {item.vehicleName}
                                                        </p>
                                                        <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] break-words">
                                                            {item.vehicleType || "車種未設定"} ／{" "}
                                                            {item.customerName || "お客様名未設定"}
                                                        </p>
                                                        {(item.optionName || item.optionCategory) && (
                                                            <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] break-words">
                                                                オプション: {item.optionName || "-"}{" "}
                                                                {item.optionCategory && `（${item.optionCategory}）`}
                                                            </p>
                                                        )}
                                                    </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                        {item.prefecture && (
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] sm:text-xs">
                                                                納車県: {item.prefecture}
                                                            </span>
                                                        )}
                                                        {item.delayDays > 0 && (
                                                            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] sm:text-xs">
                                                                {item.delayDays}日遅れ
                                                            </span>
                                                        )}
                                                        {canEdit && (
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-7 w-7"
                                                                    onClick={() => {
                                                                        setEditing({
                                                                            ...item,
                                                                            dueDate: item.dueDate
                                                                                ? format(new Date(item.dueDate), "yyyy-MM-dd")
                                                                                : "",
                                                                            incomingPlannedDate: item.incomingPlannedDate
                                                                                ? format(new Date(item.incomingPlannedDate), "yyyy-MM-dd")
                                                                                : "",
                                                                            shippingPlannedDate: item.shippingPlannedDate
                                                                                ? format(new Date(item.shippingPlannedDate), "yyyy-MM-dd")
                                                                                : "",
                                                                            deliveryPlannedDate: item.deliveryPlannedDate
                                                                                ? format(new Date(item.deliveryPlannedDate), "yyyy-MM-dd")
                                                                                : "",
                                                                        });
                                                                        setIsEditDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Edit className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="destructive"
                                                                    className="h-7 w-7"
                                                                    onClick={() => {
                                                                        if (
                                                                            window.confirm(
                                                                                "この納車スケジュールを削除しますか？"
                                                                            )
                                                                        ) {
                                                                            deleteMutation.mutate({ id: item.id });
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {(item.comment || item.claimComment) && (
                                                    <div className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
                                                        {item.comment && <p>メモ: {item.comment}</p>}
                                                        {item.claimComment && <p>クレーム・傷: {item.claimComment}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {(data || []).map((item: any) => (
                                <div
                                    key={item.id}
                                    className="border border-[hsl(var(--border))] rounded-lg p-2 sm:p-3 md:p-4 flex flex-col gap-1.5"
                                >
                                        <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-sm sm:text-base md:text-lg break-words">
                                                {item.vehicleName}
                                            </p>
                                            <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] break-words">
                                                {item.vehicleType || "車種未設定"} ／{" "}
                                                {item.customerName || "お客様名未設定"}
                                            </p>
                                            {item.optionName && (
                                                <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] break-words">
                                                    オプション: {item.optionName}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-1 mt-1">
                                                {item.prefecture && (
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] sm:text-xs">
                                                        納車県: {item.prefecture}
                                                    </span>
                                                )}
                                                {item.baseCarReady && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs">
                                                        ベース車: {item.baseCarReady === "yes" ? "◯" : "✕"}
                                                    </span>
                                                )}
                                                {item.furnitureReady && (
                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs">
                                                        家具: {item.furnitureReady === "yes" ? "◯" : "✕"}
                                                    </span>
                                                )}
                                                {item.inCharge && (
                                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] sm:text-xs">
                                                        担当: {item.inCharge}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            {item.dueDate && (
                                                <span className="text-[11px] sm:text-xs">
                                                    ワングラム入庫予定: {format(new Date(item.dueDate), "M月d日")}
                                                </span>
                                            )}
                                            {item.incomingPlannedDate && (
                                                <span className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))]">
                                                    ワングラム完成予定:{" "}
                                                    {format(new Date(item.incomingPlannedDate), "M月d日")}
                                                </span>
                                            )}
                                            <div className="flex flex-col items-end gap-0.5">
                                                {item.shippingPlannedDate && (
                                                <span className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))]">
                                                        引き取り予定日:{" "}
                                                        {format(new Date(item.shippingPlannedDate), "M月d日")}
                                                </span>
                                                )}
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs border ${
                                                            item.pickupConfirmed === "true"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : "bg-white text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]"
                                                        }`}
                                                        onClick={() =>
                                                            confirmPickupMutation.mutate({
                                                                id: item.id,
                                                                confirmed: item.pickupConfirmed !== "true",
                                                            })
                                                        }
                                                    >
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        {item.pickupConfirmed === "true" ? "確定済み" : "引き取り日を確定"}
                                                    </button>
                                                )}
                                            </div>
                                            {item.deliveryPlannedDate && (
                                                <span className="text-[11px] sm:text-xs font-semibold">
                                                    katomotor完成予定:{" "}
                                                    {format(new Date(item.deliveryPlannedDate), "M月d日")}
                                                </span>
                                            )}
                                            {item.delayDays > 0 && (
                                                <span className="mt-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] sm:text-xs">
                                                    {item.delayDays}日遅れ
                                                </span>
                                            )}
                                            {item.specSheetUrl && (
                                                <a
                                                    href={item.specSheetUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 underline"
                                                >
                                                    <FileText className="h-3 w-3" />
                                                    製造注意仕様書を表示
                                                </a>
                                            )}
                                            {canEdit && (
                                                <div className="flex gap-1 mt-1">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7"
                                                        onClick={() => {
                                                            setEditing({
                                                                ...item,
                                                                dueDate: item.dueDate
                                                                    ? format(new Date(item.dueDate), "yyyy-MM-dd")
                                                                    : "",
                                                                incomingPlannedDate: item.incomingPlannedDate
                                                                    ? format(
                                                                          new Date(item.incomingPlannedDate),
                                                                          "yyyy-MM-dd"
                                                                      )
                                                                    : "",
                                                                shippingPlannedDate: item.shippingPlannedDate
                                                                    ? format(
                                                                          new Date(item.shippingPlannedDate),
                                                                          "yyyy-MM-dd"
                                                                      )
                                                                    : "",
                                                                deliveryPlannedDate: item.deliveryPlannedDate
                                                                    ? format(
                                                                          new Date(item.deliveryPlannedDate),
                                                                          "yyyy-MM-dd"
                                                                      )
                                                                    : "",
                                                            });
                                                            const existingOptions =
                                                                item.optionName && typeof item.optionName === "string"
                                                                    ? String(item.optionName).split("/").map((s: string) =>
                                                                          s.trim()
                                                                      )
                                                                    : [];
                                                            const preset = existingOptions.filter((opt: string) =>
                                                                OPTION_PRESETS.includes(opt)
                                                            );
                                                            const others = existingOptions.filter(
                                                                (opt: string) => !OPTION_PRESETS.includes(opt)
                                                            );
                                                            setSelectedOptions(preset);
                                                            setOtherOption(others.join(" / "));
                                                            setSpecFile(null);
                                                            setIsEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        className="h-7 w-7"
                                                        onClick={() => {
                                                            if (
                                                                window.confirm(
                                                                    "この納車スケジュールを削除しますか？"
                                                                )
                                                            ) {
                                                                deleteMutation.mutate({ id: item.id });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {(item.comment || item.claimComment) && (
                                        <div className="mt-1 text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
                                            {item.comment && <p>メモ: {item.comment}</p>}
                                            {item.claimComment && <p>クレーム・傷: {item.claimComment}</p>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 追加・編集ダイアログ */}
            {isEditDialogOpen && editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4">
                            <CardTitle className="text-base sm:text-lg">
                                {editing.id ? "納車スケジュールを編集" : "納車スケジュールを追加"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 space-y-3 text-sm">
                            <div>
                                <label className="text-xs font-medium block mb-1">車両の名前 *</label>
                                <Input
                                    value={editing.vehicleName}
                                    onChange={(e) => setEditing({ ...editing, vehicleName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">車両の種類</label>
                                <Input
                                    value={editing.vehicleType}
                                    onChange={(e) => setEditing({ ...editing, vehicleType: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">お客様名</label>
                                <Input
                                    value={editing.customerName}
                                    onChange={(e) => setEditing({ ...editing, customerName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">オプション</label>
                                <div className="flex flex-wrap gap-1.5 mb-1">
                                    {OPTION_PRESETS.map((opt) => {
                                        const checked = selectedOptions.includes(opt);
                                        return (
                                            <button
                                                key={opt}
                                                type="button"
                                                className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs border ${
                                                    checked
                                                        ? "bg-blue-600 text-white border-blue-600"
                                                        : "bg-white text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]"
                                                }`}
                                                onClick={() => {
                                                    setSelectedOptions((prev) =>
                                                        checked
                                                            ? prev.filter((v) => v !== opt)
                                                            : [...prev, opt]
                                                    );
                                                }}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                                <Input
                                    placeholder="その他オプション（自由入力）"
                                    value={otherOption}
                                    onChange={(e) => setOtherOption(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">納車県</label>
                                <Input
                                    value={editing.prefecture}
                                    onChange={(e) => setEditing({ ...editing, prefecture: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-medium block mb-1">ベース車</label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
                                        value={editing.baseCarReady || ""}
                                        onChange={(e) =>
                                            setEditing({ ...editing, baseCarReady: e.target.value || "" })
                                        }
                                    >
                                        <option value="">未設定</option>
                                        <option value="yes">◯</option>
                                        <option value="no">✕</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1">家具</label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
                                        value={editing.furnitureReady || ""}
                                        onChange={(e) =>
                                            setEditing({ ...editing, furnitureReady: e.target.value || "" })
                                        }
                                    >
                                        <option value="">未設定</option>
                                        <option value="yes">◯</option>
                                        <option value="no">✕</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">担当</label>
                                <Input
                                    value={editing.inCharge}
                                    onChange={(e) => setEditing({ ...editing, inCharge: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-medium block mb-1">ワングラム入庫予定</label>
                                    <Input
                                        type="date"
                                        value={editing.dueDate}
                                        onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1">ワングラム完成予定</label>
                                    <Input
                                        type="date"
                                        value={editing.incomingPlannedDate}
                                        onChange={(e) =>
                                            setEditing({ ...editing, incomingPlannedDate: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-medium block mb-1">引き取り予定日</label>
                                    <Input
                                        type="date"
                                        value={editing.shippingPlannedDate}
                                        onChange={(e) =>
                                            setEditing({ ...editing, shippingPlannedDate: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium block mb-1">katomotor完成予定</label>
                                    <Input
                                        type="date"
                                        value={editing.deliveryPlannedDate}
                                        onChange={(e) =>
                                            setEditing({ ...editing, deliveryPlannedDate: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">注意事項・メモ</label>
                                <Input
                                    value={editing.comment}
                                    onChange={(e) => setEditing({ ...editing, comment: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">クレーム・傷など</label>
                                <Input
                                    value={editing.claimComment}
                                    onChange={(e) => setEditing({ ...editing, claimComment: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">ワングラム側メモ（任意）</label>
                                <Input
                                    value={editing.oemComment}
                                    onChange={(e) => setEditing({ ...editing, oemComment: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">
                                    製造注意仕様書（PDF / JPG）
                                </label>
                                <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setSpecFile(file);
                                    }}
                                />
                                {editing.specSheetUrl && (
                                    <a
                                        href={editing.specSheetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 underline"
                                    >
                                        <FileText className="h-3 w-3" />
                                        既存の仕様書を表示
                                    </a>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleSave}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    保存
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setEditing(null);
                                    }}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}


