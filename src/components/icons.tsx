// Line icons ported 1:1 from the design handoff (stroke = currentColor).
import type { ReactNode } from "react";

const s = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const Ic: Record<string, ReactNode> = {
  user: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>,
  id: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.5" cy="11" r="2"/><path d="M14 9h4M14 13h4M5.5 16c.5-1.5 1.6-2 3-2s2.5.5 3 2"/></svg>,
  mail: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M5 4h4l2 5-3 2c1 2 3 4 5 5l2-3 5 2v4c0 1-1 2-2 2C10 21 3 14 3 6c0-1 1-2 2-2z"/></svg>,
  lock: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>,
  eye: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0112 6c6 0 10 6 10 6a16 16 0 01-3.3 3.8M6.2 6.4A16 16 0 002 12s4 6 10 6a9.6 9.6 0 004.1-.9"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth="3"><path d="M4 12l5 5L20 6"/></svg>,
  chevL: <svg width="20" height="20" viewBox="0 0 24 24" {...s} strokeWidth="2.4"><path d="M15 5l-7 7 7 7"/></svg>,
  clock: <svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  camera: <svg width="26" height="26" viewBox="0 0 24 24" {...s} strokeWidth="1.8"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/></svg>,
  shield: <svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>,
  finger: <svg width="40" height="40" viewBox="0 0 24 24" {...s} strokeWidth="1.5"><path d="M12 11v4M8.5 8a5 5 0 017 0M6 10.5a8 8 0 0112 0M9.5 13c0 3 .5 5 1.5 7M14.5 12.5c.5 3 0 6-1 8.5M7 16c.5 2 1 3 2 4.5"/></svg>,
  pin: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>,
  nav: <svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>,
  x: <svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2.6"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  refresh: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M21 12a9 9 0 11-2.6-6.4M21 4v5h-5"/></svg>,
  calendar: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  alert: <svg width="24" height="24" viewBox="0 0 24 24" {...s} strokeWidth="2.2"><path d="M12 8v5M12 16.5v.5"/><path d="M10.3 3.8L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.8a2 2 0 00-3.4 0z"/></svg>,
  gpsOff: <svg width="24" height="24" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M3 3l18 18M12 8a4 4 0 013.6 5.7M9.2 9.2A4 4 0 0012 16"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>,
  arrowR: <svg width="20" height="20" viewBox="0 0 24 24" {...s} strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  login: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>,
};

export const RIc: Record<string, ReactNode> = {
  plane: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  hourglass: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2"/></svg>,
  calX: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 10h18M10 14l4 4M14 14l-4 4"/></svg>,
  heart: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/><path d="M3.2 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.3"/></svg>,
  siren: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1zM19 21a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1zM21 12h1M18.5 4.5 18 5M2 12h1M6 4.5 6.5 5"/></svg>,
  dot: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>,
  wallet: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3a2 2 0 0 1 0-4h4"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>,
  car: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>,
  food: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>,
  bed: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>,
  route: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  chevR: <svg width="20" height="20" viewBox="0 0 24 24" {...s} strokeWidth="2.2"><path d="M9 5l7 7-7 7"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2.4"><path d="M5 12h14M12 5v14"/></svg>,
  minus: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2.4"><path d="M5 12h14"/></svg>,
  file: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/></svg>,
  building: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>,
  sun: <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.4 1.4M17.6 17.6 19 19M2 12h2M20 12h2M5 19l1.4-1.4M17.6 6.4 19 5"/></svg>,
};

export const bigCheck = (
  <svg width="34" height="34" viewBox="0 0 24 24" {...s} strokeWidth="3"><path d="M4 12l5 5L20 6"/></svg>
);
export const bigClock = (
  <svg width="32" height="32" viewBox="0 0 24 24" {...s} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
);

export const TabIcon: Record<string, ReactNode> = {
  beranda: <svg width="23" height="23" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5"/><path d="M9.5 21v-6h5v6"/></svg>,
  pengajuan: <svg width="23" height="23" viewBox="0 0 24 24" {...s} strokeWidth="2"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 4.5V5a1 1 0 01-1 1h-4a1 1 0 01-1-1z"/><path d="M9 11h6M9 15h4"/></svg>,
  riwayat: <svg width="23" height="23" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M3 12a9 9 0 109-9 9 9 0 00-7.5 4M3 3v4h4"/><path d="M12 8v4l3 2"/></svg>,
  profil: <svg width="23" height="23" viewBox="0 0 24 24" {...s} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>,
};
