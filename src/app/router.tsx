import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { AppProvider, useApp } from "@/app/store";
import { SignupProvider } from "@/screens/signup/signup-context";

import { SplashScreen } from "@/screens/auth/splash";
import { LoginScreen } from "@/screens/auth/login";
import { ForgotScreen } from "@/screens/auth/forgot";
import { ChangePasswordScreen } from "@/screens/auth/change-password";

import { Step1Screen } from "@/screens/signup/step1";
import { Step2Screen } from "@/screens/signup/step2";
import { Step3Screen } from "@/screens/signup/step3";
import { ApprovalScreen } from "@/screens/signup/approval";
import { SuccessScreen } from "@/screens/signup/success";

import { HomeScreen } from "@/screens/attendance/home";
import { LocatingScreen } from "@/screens/attendance/locating";
import { CheckReadyScreen } from "@/screens/attendance/ready";
import { FaceScanScreen } from "@/screens/attendance/face-scan";
import {
  CheckSuccessScreen,
  OutOfRangeScreen,
  GpsOffScreen,
} from "@/screens/attendance/result";
import { HistoryScreen } from "@/screens/attendance/history";
import { CalendarScreen } from "@/screens/attendance/calendar";
import { ProfileScreen } from "@/screens/attendance/profile";

import { RequestHubScreen } from "@/screens/requests/hub";
import { AdminPanelScreen } from "@/screens/admin/panel";
import {
  LeaveFormScreen,
  SickLeaveScreen,
  LeaveSentScreen,
} from "@/screens/requests/leave";
import {
  TripFormScreen,
  TripAllowanceScreen,
  TripSentScreen,
} from "@/screens/requests/trip";
import {
  OvertimeFormScreen,
  OvertimeSentScreen,
} from "@/screens/requests/overtime";

function Shell() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}

function SignupShell() {
  return (
    <SignupProvider>
      <Outlet />
    </SignupProvider>
  );
}

/** Employee-only screens (attendance, requests, history, profile) —
 *  admins have their own homepage at /admin. */
function RequireEmployee() {
  const { ready, authed, user } = useApp();
  if (!ready) return null;
  if (!authed) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/** Admin-only screens; non-admins are bounced to the dashboard. */
function RequireAdmin() {
  const { ready, authed, user } = useApp();
  if (!ready) return null;
  if (!authed) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role !== "admin") return <Navigate to="/home" replace />;
  return <Outlet />;
}

/** Any signed-in user (employee or admin) — e.g. the change-password screen. */
function RequireUser() {
  const { ready, authed } = useApp();
  if (!ready) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <SplashScreen /> },
      { path: "/login", element: <LoginScreen /> },
      { path: "/forgot", element: <ForgotScreen /> },
      {
        element: <RequireUser />,
        children: [{ path: "/change-password", element: <ChangePasswordScreen /> }],
      },
      {
        element: <SignupShell />,
        children: [
          { path: "/signup/step-1", element: <Step1Screen /> },
          { path: "/signup/step-2", element: <Step2Screen /> },
          { path: "/signup/step-3", element: <Step3Screen /> },
          { path: "/signup/approval", element: <ApprovalScreen /> },
          { path: "/signup/success", element: <SuccessScreen /> },
        ],
      },
      {
        element: <RequireEmployee />,
        children: [
          { path: "/home", element: <HomeScreen /> },

          { path: "/checkin/locating", element: <LocatingScreen mode="in" /> },
          { path: "/checkin/ready", element: <CheckReadyScreen mode="in" /> },
          { path: "/checkin/face", element: <FaceScanScreen mode="in" /> },
          { path: "/checkin/success", element: <CheckSuccessScreen mode="in" /> },
          { path: "/checkin/out-of-range", element: <OutOfRangeScreen mode="in" /> },
          { path: "/checkin/gps-off", element: <GpsOffScreen mode="in" /> },

          { path: "/checkout/locating", element: <LocatingScreen mode="out" /> },
          { path: "/checkout/ready", element: <CheckReadyScreen mode="out" /> },
          { path: "/checkout/face", element: <FaceScanScreen mode="out" /> },
          { path: "/checkout/success", element: <CheckSuccessScreen mode="out" /> },
          { path: "/checkout/out-of-range", element: <OutOfRangeScreen mode="out" /> },
          { path: "/checkout/gps-off", element: <GpsOffScreen mode="out" /> },

          { path: "/requests", element: <RequestHubScreen /> },
          { path: "/requests/leave", element: <LeaveFormScreen /> },
          { path: "/requests/leave/sick", element: <SickLeaveScreen /> },
          { path: "/requests/leave/sent", element: <LeaveSentScreen /> },
          { path: "/requests/trip", element: <TripFormScreen /> },
          { path: "/requests/trip/allowance", element: <TripAllowanceScreen /> },
          { path: "/requests/trip/sent", element: <TripSentScreen /> },
          { path: "/requests/overtime", element: <OvertimeFormScreen /> },
          { path: "/requests/overtime/sent", element: <OvertimeSentScreen /> },

          { path: "/history", element: <HistoryScreen /> },
          { path: "/calendar", element: <CalendarScreen /> },
          { path: "/profile", element: <ProfileScreen /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [{ path: "/admin", element: <AdminPanelScreen /> }],
      },
    ],
  },
]);

export function AppRouter() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
