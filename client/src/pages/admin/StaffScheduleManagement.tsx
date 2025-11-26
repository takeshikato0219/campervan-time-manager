import React, { useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Edit, Save, X, User, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";

type ScheduleStatus = "work" | "rest" | "request" | "exhibition" | "other" | "morning" | "afternoon";

const STATUS_COLORS: Record<ScheduleStatus, string> = {
    work: "bg-blue-100", // 水色 = 出勤
    rest: "bg-pink-200", // ピンク = 休み
    request: "bg-pink-300", // ピンク = 希望休
    exhibition: "bg-green-100", // 薄緑 = 展示会
    other: "bg-green-50", // 薄緑 = その他業務
    morning: "bg-yellow-100", // 黄色 = 午前出
    afternoon: "bg-orange-100", // オレンジ = 午後出
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
    work: "出勤",
    rest: "休",
    request: "希望",
    exhibition: "展",
    other: "その他",
    morning: "午前出",
    afternoon: "午後出",
};

export default function StaffScheduleManagement() {
    const { user } = useAuth();

    if (user?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-lg font-semibold">アクセス権限がありません</p>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2">このページは管理者のみがアクセスできます</p>
                </div>
            </div>
        );
    }

    const [baseDate, setBaseDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [isBulkEditMode, setIsBulkEditMode] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<ScheduleStatus>("work");
    const [bulkComment, setBulkComment] = useState("");
    const [isEditOrderMode, setIsEditOrderMode] = useState(false);
    const [isEditNameMode, setIsEditNameMode] = useState(false);
    const [editingNameUserId, setEditingNameUserId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");
    // フィルタは一旦「全員表示」のみ（スタッフは独立管理のため）

    // 月移動用の関数
    const moveMonth = (months: number) => {
        const currentDate = parse(baseDate, "yyyy-MM-dd", new Date());
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + months, currentDate.getDate());
        setBaseDate(format(newDate, "yyyy-MM-dd"));
    };

    const { data: scheduleData, refetch, isLoading, error } = trpc.staffSchedule.getSchedule.useQuery({ baseDate });
    const { data: editLogs } = trpc.staffSchedule.getEditLogs.useQuery();
    const publishMutation = trpc.staffSchedule.publishSchedule.useMutation({
        onSuccess: () => {
            toast.success("スケジュールを公開しました");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "公開に失敗しました");
        },
    });

    const updateDisplayOrderMutation = trpc.staffSchedule.updateDisplayOrder.useMutation({
        onSuccess: () => {
            toast.success("表示順序を更新しました");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "表示順序の更新に失敗しました");
        },
    });

    const updateDisplayNameMutation = trpc.staffSchedule.updateDisplayName.useMutation({
        onSuccess: () => {
            toast.success("表示名を更新しました");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "表示名の更新に失敗しました");
        },
    });

    const updateMutation = trpc.staffSchedule.updateSchedule.useMutation({
        onSuccess: () => {
            // 成功時は静かに更新（toastは表示しない）
            refetch();
            setSelectedCells(new Set());
        },
        onError: (error) => {
            toast.error(error.message || "スケジュールの更新に失敗しました");
            // エラー時は再取得して元に戻す
            refetch();
        },
    });

    const bulkUpdateMutation = trpc.staffSchedule.bulkUpdateSchedule.useMutation({
        onSuccess: () => {
            toast.success("スケジュールを一括更新しました");
            refetch();
            setSelectedCells(new Set());
            setIsBulkEditMode(false);
        },
        onError: (error) => {
            toast.error(error.message || "スケジュールの一括更新に失敗しました");
        },
    });

    const handleStatusChange = (userId: number, date: string, status: ScheduleStatus) => {
        const entry = filteredScheduleData
            .find((d) => d.date === date)
            ?.userEntries.find((e) => e.userId === userId);

        updateMutation.mutate({
            userId,
            date,
            status,
            comment: entry?.comment || null,
        });
    };

    const handleCellClick = (userId: number, date: string) => {
        if (!isBulkEditMode) {
            // 一括編集モードでない場合は、セルクリックは無視（Selectで処理）
            return;
        } else {
            // 一括編集モード：セルを選択/解除
            const cellKey = `${userId}_${date}`;
            const newSelected = new Set(selectedCells);
            if (newSelected.has(cellKey)) {
                newSelected.delete(cellKey);
            } else {
                newSelected.add(cellKey);
            }
            setSelectedCells(newSelected);
        }
    };

    const handleBulkSave = () => {
        if (selectedCells.size === 0) {
            toast.error("セルを選択してください");
            return;
        }

        const updates = Array.from(selectedCells).map((cellKey) => {
            const [userIdStr, date] = cellKey.split("_");
            return {
                userId: parseInt(userIdStr),
                date,
                status: bulkStatus,
                comment: bulkComment || null,
            };
        });

        bulkUpdateMutation.mutate({ updates });
    };

    const handleDateStatusChange = (date: string, status: ScheduleStatus) => {
        // その日の全スタッフのステータスを一括変更
        if (!scheduleData) return;

        const updates = filteredUsers.map((user) => ({
            userId: user.id,
            date,
            status,
            comment: null,
        }));

        bulkUpdateMutation.mutate({ updates });
    };

    const handleCellDoubleClick = (userId: number, date: string) => {
        // ダブルクリックでコメント編集ダイアログを開く（今後実装）
        const entry = scheduleData?.scheduleData
            .find((d) => d.date === date)
            ?.userEntries.find((e) => e.userId === userId);
        if (entry) {
            const comment = prompt("コメントを入力してください（支払日、買い付け、外出など）:", entry.comment || "");
            if (comment !== null) {
                updateMutation.mutate({
                    userId,
                    date,
                    status: entry.status as ScheduleStatus,
                    comment: comment || null,
                });
            }
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">読み込み中...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">エラーが発生しました: {error.message}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
                    データベースのテーブルが作成されていない可能性があります。マイグレーションを実行してください。
                </p>
            </div>
        );
    }

    if (!scheduleData) {
        return <div className="text-center py-8">データがありません</div>;
    }

    // フィルタリングされたユーザーリスト（現状は全員）
    const filteredUsers = useMemo(() => scheduleData.users, [scheduleData]);

    // フィルタリングされたスケジュールデータ（useMemoで再計算を最小限に）
    const filteredScheduleData = useMemo(
        () =>
            scheduleData.scheduleData.map((day) => ({
                ...day,
                userEntries: day.userEntries.filter((entry) =>
                    filteredUsers.some((u) => u.id === entry.userId)
                ),
            })),
        [scheduleData, filteredUsers]
    );

    // フィルタリングされた集計データ（useMemoで再計算を最小限に）
    const filteredSummary = useMemo(
        () =>
            scheduleData.summary.filter((s) =>
                filteredUsers.some((u) => u.id === s.userId)
            ),
        [scheduleData, filteredUsers]
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">スタッフ休み予定一覧（管理）</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2">
                        期間: {format(parse(scheduleData.period.start, "yyyy-MM-dd", new Date()), "yyyy年MM月dd日")} ～{" "}
                        {format(parse(scheduleData.period.end, "yyyy-MM-dd", new Date()), "yyyy年MM月dd日")}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => moveMonth(-1)} title="前の月">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        前の月
                    </Button>
                    <Button variant="outline" onClick={() => moveMonth(1)} title="次の月">
                        次の月
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button
                        variant={isBulkEditMode ? "default" : "outline"}
                        onClick={() => {
                            setIsBulkEditMode(!isBulkEditMode);
                            setSelectedCells(new Set());
                        }}
                    >
                        {isBulkEditMode ? "一括編集モード" : "通常モード"}
                    </Button>
                    <Button
                        variant={isEditOrderMode ? "default" : "outline"}
                        onClick={() => {
                            setIsEditOrderMode(!isEditOrderMode);
                        }}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        スタッフ順序変更
                    </Button>
                    <Button
                        variant={isEditNameMode ? "default" : "outline"}
                        onClick={() => {
                            setIsEditNameMode(!isEditNameMode);
                            setEditingNameUserId(null);
                            setEditingName("");
                        }}
                    >
                        <User className="h-4 w-4 mr-2" />
                        {isEditNameMode ? "名前編集モード" : "名前編集"}
                    </Button>
                    <Button
                        variant="default"
                        onClick={() => {
                            if (!scheduleData) return;
                            publishMutation.mutate({
                                periodStart: scheduleData.period.start,
                                periodEnd: scheduleData.period.end,
                            });
                        }}
                        disabled={publishMutation.isPending}
                    >
                        <Globe className="h-4 w-4 mr-2" />
                        公開
                    </Button>
                </div>
            </div>

            {/* 一括編集パネル */}
            {isBulkEditMode && (
                <Card>
                    <CardHeader>
                        <CardTitle>一括編集</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">選択されたセル: {selectedCells.size}個</label>
                        </div>
                        <div>
                            <label className="text-sm font-medium">状態</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                value={bulkStatus}
                                onChange={(e) => setBulkStatus(e.target.value as ScheduleStatus)}
                            >
                                <option value="work">出勤</option>
                                <option value="rest">休み</option>
                                <option value="request">希望休</option>
                                <option value="exhibition">展示会</option>
                                <option value="other">その他業務</option>
                                <option value="morning">午前出</option>
                                <option value="afternoon">午後出</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">コメント（任意）</label>
                            <Input
                                value={bulkComment}
                                onChange={(e) => setBulkComment(e.target.value)}
                                placeholder="支払日、買い付け、外出など"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleBulkSave} disabled={bulkUpdateMutation.isPending}>
                                <Save className="h-4 w-4 mr-2" />
                                一括保存
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedCells(new Set());
                                    setIsBulkEditMode(false);
                                }}
                            >
                                <X className="h-4 w-4 mr-2" />
                                キャンセル
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 凡例 */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.work}`}></div>
                            <span>出勤</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.rest}`}></div>
                            <span>休み</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.request}`}></div>
                            <span>希望休</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.exhibition}`}></div>
                            <span>展示会</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.other}`}></div>
                            <span>その他業務</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.morning}`}></div>
                            <span>午前出</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.afternoon}`}></div>
                            <span>午後出</span>
                        </div>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                        ※ セルをクリックで状態変更、ダブルクリックでコメント編集
                    </p>
                </CardContent>
            </Card>

            {/* スケジュール表 */}
            <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse border border-[hsl(var(--border))] text-xs table-fixed" style={{ tableLayout: "fixed" }}>
                    <thead>
                        <tr>
                            <th className="border border-[hsl(var(--border))] p-1 bg-[hsl(var(--muted))] w-[50px]">
                                日付
                            </th>
                            {filteredUsers.map((u, index) => (
                                <th
                                    key={u.id}
                                    className="border border-[hsl(var(--border))] p-1 bg-[hsl(var(--muted))] w-[50px] relative text-left"
                                >
                                    <div className="flex items-center justify-start gap-0.5">
                                        {isEditNameMode && editingNameUserId === u.id ? (
                                            <Input
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onBlur={() => {
                                                    if (editingName.trim()) {
                                                        updateDisplayNameMutation.mutate({
                                                            userId: u.id,
                                                            displayName: editingName.trim(),
                                                        });
                                                    }
                                                    setEditingNameUserId(null);
                                                    setEditingName("");
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        if (editingName.trim()) {
                                                            updateDisplayNameMutation.mutate({
                                                                userId: u.id,
                                                                displayName: editingName.trim(),
                                                            });
                                                        }
                                                        setEditingNameUserId(null);
                                                        setEditingName("");
                                                    } else if (e.key === "Escape") {
                                                        setEditingNameUserId(null);
                                                        setEditingName("");
                                                    }
                                                }}
                                                className="h-6 text-[18px] p-1"
                                                autoFocus
                                            />
                                        ) : (
                                            <span
                                                className="text-[18px] truncate leading-tight cursor-pointer hover:underline"
                                                onClick={() => {
                                                    if (isEditNameMode) {
                                                        setEditingNameUserId(u.id);
                                                        setEditingName(u.name || "");
                                                    }
                                                }}
                                            >
                                                {u.name || "不明"}
                                            </span>
                                        )}
                                        {isEditOrderMode && (
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    className="text-[10px] px-0.5 py-0 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (index > 0) {
                                                            const prevUser = filteredUsers[index - 1];
                                                            updateDisplayOrderMutation.mutate({
                                                                userId: u.id,
                                                                displayOrder: prevUser.displayOrder,
                                                            });
                                                            updateDisplayOrderMutation.mutate({
                                                                userId: prevUser.id,
                                                                displayOrder: u.displayOrder,
                                                            });
                                                        }
                                                    }}
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    className="text-[10px] px-0.5 py-0 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (index < filteredUsers.length - 1) {
                                                            const nextUser = filteredUsers[index + 1];
                                                            updateDisplayOrderMutation.mutate({
                                                                userId: u.id,
                                                                displayOrder: nextUser.displayOrder,
                                                            });
                                                            updateDisplayOrderMutation.mutate({
                                                                userId: nextUser.id,
                                                                displayOrder: u.displayOrder,
                                                            });
                                                        }
                                                    }}
                                                >
                                                    ↓
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredScheduleData.map((day) => (
                            <tr key={day.date}>
                                <td
                                    className={`border border-[hsl(var(--border))] p-0.5 ${day.isWeekend ? "bg-pink-100" : "bg-white"
                                        }`}
                                >
                                    <div className="mb-0.5 leading-tight text-[16px] font-medium">{format(day.dateObj, "MM/dd", { locale: ja })}</div>
                                    <div className="text-[12px] text-[hsl(var(--muted-foreground))] mb-0.5 leading-tight">
                                        {format(day.dateObj, "E", { locale: ja })}
                                    </div>
                                    <Select
                                        onValueChange={(value) => {
                                            handleDateStatusChange(day.date, value as ScheduleStatus);
                                        }}
                                        disabled={bulkUpdateMutation.isPending}
                                    >
                                        <SelectTrigger className="h-5 text-[8px] p-0.5 border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--muted))] focus:ring-0 shadow-none w-full">
                                            <SelectValue placeholder="変更">
                                                <span className="text-[8px]">変更</span>
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="work">出勤</SelectItem>
                                            <SelectItem value="rest">休</SelectItem>
                                            <SelectItem value="request">希望</SelectItem>
                                            <SelectItem value="exhibition">展</SelectItem>
                                            <SelectItem value="other">その他</SelectItem>
                                            <SelectItem value="morning">午前出</SelectItem>
                                            <SelectItem value="afternoon">午後出</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                {day.userEntries.map((entry) => {
                                    const cellKey = `${entry.userId}_${day.date}`;
                                    const isSelected = selectedCells.has(cellKey);
                                    return (
                                        <td
                                            key={entry.userId}
                                            className={`border border-[hsl(var(--border))] p-1 text-center relative w-[50px] ${STATUS_COLORS[entry.status as ScheduleStatus]
                                                } ${isSelected ? "ring-2 ring-blue-500" : ""} ${isBulkEditMode ? "cursor-pointer" : ""}`}
                                            onClick={isBulkEditMode ? () => handleCellClick(entry.userId, day.date) : undefined}
                                            onDoubleClick={() => handleCellDoubleClick(entry.userId, day.date)}
                                        >
                                            {!isBulkEditMode ? (
                                                <Select
                                                    value={entry.status}
                                                    onValueChange={(value) => {
                                                        handleStatusChange(entry.userId, day.date, value as ScheduleStatus);
                                                    }}
                                                    disabled={updateMutation.isPending}
                                                >
                                                    <SelectTrigger className="h-6 text-[14px] p-0.5 border-0 bg-transparent hover:bg-transparent focus:ring-0 shadow-none w-full">
                                                        <SelectValue>
                                                            <span className="text-[14px] font-medium">
                                                                {STATUS_LABELS[entry.status as ScheduleStatus]}
                                                            </span>
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="work">出勤</SelectItem>
                                                        <SelectItem value="rest">休</SelectItem>
                                                        <SelectItem value="request">希望</SelectItem>
                                                        <SelectItem value="exhibition">展</SelectItem>
                                                        <SelectItem value="other">その他</SelectItem>
                                                        <SelectItem value="morning">午前出</SelectItem>
                                                        <SelectItem value="afternoon">午後出</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="text-[14px] font-medium">
                                                    {STATUS_LABELS[entry.status as ScheduleStatus]}
                                                </div>
                                            )}
                                            {entry.comment && (
                                                <div className="text-[8px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                                                    {entry.comment}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    {/* 集計行 */}
                    <tfoot>
                        <tr className="bg-yellow-50">
                            <td className="border border-[hsl(var(--border))] p-1 text-[16px] font-bold">
                                休みの数
                            </td>
                            {filteredSummary.map((s) => (
                                <td key={s.userId} className="border border-[hsl(var(--border))] p-1 text-[16px] text-center font-bold">
                                    {s.restDays || 0}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-gray-50">
                            <td className="border border-[hsl(var(--border))] p-1 text-[16px] font-bold">
                                勤務日数
                            </td>
                            {filteredSummary.map((s) => (
                                <td key={s.userId} className="border border-[hsl(var(--border))] p-1 text-[16px] text-center font-bold">
                                    {typeof s.workDays === 'number' && s.workDays % 1 !== 0
                                        ? s.workDays.toFixed(1)
                                        : s.workDays}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-gray-50">
                            <td className="border border-[hsl(var(--border))] p-1 text-[16px] font-bold">
                                公休
                            </td>
                            {filteredSummary.map((s) => (
                                <td key={s.userId} className="border border-[hsl(var(--border))] p-1 text-[16px] text-center font-bold">
                                    {s.publicHolidays}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-gray-50">
                            <td className="border border-[hsl(var(--border))] p-1 text-[16px] font-bold">
                                有休
                            </td>
                            {filteredSummary.map((s) => (
                                <td key={s.userId} className="border border-[hsl(var(--border))] p-1 text-[16px] text-center font-bold">
                                    {s.paidLeave}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-gray-50">
                            <td className="border border-[hsl(var(--border))] p-1 text-[16px] font-bold">
                                合計
                            </td>
                            {filteredSummary.map((s) => (
                                <td key={s.userId} className="border border-[hsl(var(--border))] p-1 text-[16px] text-center font-bold">
                                    {s.totalRest}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* 編集履歴 */}
            {editLogs && editLogs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>編集履歴</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {editLogs.map((log) => (
                                <div key={log.id} className="text-sm border-b pb-2">
                                    <div>
                                        {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm")} - {log.editorName}が
                                        {log.userName}の{log.fieldName}を変更
                                    </div>
                                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                                        {log.oldValue || "(なし)"} → {log.newValue || "(なし)"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

