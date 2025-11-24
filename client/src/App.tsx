import React from "react";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "sonner";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import MyAttendance from "./pages/MyAttendance";
import WorkRecords from "./pages/WorkRecords";
import Analytics from "./pages/Analytics";
import AttendanceManagement from "./pages/admin/AttendanceManagement";
import WorkRecordManagement from "./pages/admin/WorkRecordManagement";
import VehicleDetail from "./pages/VehicleDetail";
import CSVExport from "./pages/admin/CSVExport";
import ProcessManagement from "./pages/admin/ProcessManagement";
import VehicleTypeManagement from "./pages/admin/VehicleTypeManagement";
import UserManagement from "./pages/admin/UserManagement";
import CheckItemManagement from "./pages/admin/CheckItemManagement";
import AppLayout from "./components/AppLayout";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
    const { user, loading } = useAuth();
    const [, setLocation] = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div>読み込み中...</div>
            </div>
        );
    }

    if (!user) {
        setLocation("/login");
        return null;
    }

    return (
        <AppLayout>
            <Component />
        </AppLayout>
    );
}

export default function App() {
    return (
        <>
            <Switch>
                <Route path="/login" component={Login} />
                <Route path="/">
                    {() => <ProtectedRoute component={Dashboard} />}
                </Route>
                <Route path="/vehicles">
                    {() => <ProtectedRoute component={Vehicles} />}
                </Route>
                <Route path="/vehicles/:id">
                    {() => <ProtectedRoute component={VehicleDetail} />}
                </Route>
                <Route path="/my-attendance">
                    {() => <ProtectedRoute component={MyAttendance} />}
                </Route>
                <Route path="/work-records">
                    {() => <ProtectedRoute component={WorkRecords} />}
                </Route>
                <Route path="/analytics">
                    {() => <ProtectedRoute component={Analytics} />}
                </Route>
                <Route path="/admin/attendance">
                    {() => <ProtectedRoute component={AttendanceManagement} />}
                </Route>
                <Route path="/admin/work-records">
                    {() => <ProtectedRoute component={WorkRecordManagement} />}
                </Route>
                <Route path="/admin/csv-export">
                    {() => <ProtectedRoute component={CSVExport} />}
                </Route>
                <Route path="/admin/processes">
                    {() => <ProtectedRoute component={ProcessManagement} />}
                </Route>
                <Route path="/admin/vehicle-types">
                    {() => <ProtectedRoute component={VehicleTypeManagement} />}
                </Route>
                <Route path="/admin/users">
                    {() => <ProtectedRoute component={UserManagement} />}
                </Route>
                <Route path="/admin/check-items">
                    {() => <ProtectedRoute component={CheckItemManagement} />}
                </Route>
                <Route>
                    <div className="min-h-screen flex items-center justify-center">
                        <div>404 - ページが見つかりません</div>
                    </div>
                </Route>
            </Switch>
            <Toaster position="top-center" />
        </>
    );
}
