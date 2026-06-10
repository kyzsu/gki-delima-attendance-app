import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { AppProvider, useApp } from "@/app/store";
import { SignupProvider } from "@/screens/signup/signup-context";

import { SplashScreen } from "@/screens/auth/splash";
import { LoginScreen } from "@/screens/auth/login";

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
import { ProfileScreen } from "@/screens/attendance/profile";

import { RequestHubScreen } from "@/screens/requests/hub";
import { AdminPanelScreen } from "@/screens/admin/panel";
import {
  CutiFormScreen,
  CutiSakitScreen,
  CutiSentScreen,
} from "@/screens/requests/cuti";
import {
  DinasFormScreen,
  DinasAllowanceScreen,
  DinasSentScreen,
} from "@/screens/requests/dinas";
import {
  LemburFormScreen,
  LemburSentScreen,
} from "@/screens/requests/lembur";

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

/** Gates the app screens behind a valid session. */
function RequireAuth() {
  const { ready, authed } = useApp();
  if (!ready) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Admin-only screens; non-admins are bounced to the dashboard. */
function RequireAdmin() {
  const { ready, authed, user } = useApp();
  if (!ready) return null;
  if (!authed) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/home" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <SplashScreen /> },
      { path: "/login", element: <LoginScreen /> },
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
        element: <RequireAuth />,
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
          { path: "/requests/cuti", element: <CutiFormScreen /> },
          { path: "/requests/cuti/sakit", element: <CutiSakitScreen /> },
          { path: "/requests/cuti/sent", element: <CutiSentScreen /> },
          { path: "/requests/dinas", element: <DinasFormScreen /> },
          { path: "/requests/dinas/allowance", element: <DinasAllowanceScreen /> },
          { path: "/requests/dinas/sent", element: <DinasSentScreen /> },
          { path: "/requests/lembur", element: <LemburFormScreen /> },
          { path: "/requests/lembur/sent", element: <LemburSentScreen /> },

          { path: "/history", element: <HistoryScreen /> },
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
