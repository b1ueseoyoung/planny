"use client";

// 앱 데이터(예산·거래·일정)를 브라우저 localStorage에 저장하고 모든 화면에 나눠주는 곳.
// TODO: 여러 기기에서 쓰려면 나중에 서버 DB로 옮기기

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AppData, CalendarEvent, EventPrediction, ISODate, PredictionSource } from "./types";
import { createMockData } from "./mock-data";
import { todayISO } from "./date";

const STORAGE_KEY = "calendar-ai:data:v1";

interface AppDataContextValue {
  data: AppData;
  today: ISODate;
  addEvent: (prediction: EventPrediction, source: PredictionSource) => CalendarEvent;
  removeEvent: (id: string) => void;
  setBudget: (budget: number) => void;
  setUserName: (name: string) => void;
  /** 저장된 데이터를 지우고 샘플 데이터로 다시 시작 */
  resetToMock: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function loadData(today: ISODate): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppData;
  } catch {
    // 저장소를 못 쓰는 환경(시크릿 모드 등)이면 샘플 데이터로 시작
  }
  return createMockData(today);
}

const noopSubscribe = () => () => {};

/** 서버 렌더링 중엔 false, 브라우저에 마운트된 뒤엔 true */
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * localStorage와 오늘 날짜는 브라우저에서만 알 수 있어서, 데이터는 브라우저에서만 만든다.
 * 서버에서는 children만 그리고, 데이터가 필요한 화면은 <ClientOnly>로 감싸서 브라우저에서만 그린다.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return <>{children}</>;
  return <ClientAppDataProvider>{children}</ClientAppDataProvider>;
}

function ClientAppDataProvider({ children }: { children: ReactNode }) {
  const [today] = useState(() => todayISO());
  const [data, setData] = useState<AppData>(() => loadData(today));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 저장 실패는 무시 (화면은 계속 동작)
    }
  }, [data]);

  const addEvent = useCallback((prediction: EventPrediction, source: PredictionSource) => {
    const event: CalendarEvent = {
      id: `evt_${crypto.randomUUID().slice(0, 8)}`,
      title: prediction.title,
      startDate: prediction.startDate,
      endDate: prediction.endDate,
      eventType: prediction.eventType,
      location: prediction.location,
      people: prediction.people ?? [],
      prediction,
      source,
    };
    setData((prev) => ({ ...prev, events: [...prev.events, event] }));
    return event;
  }, []);

  const removeEvent = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
      transactions: prev.transactions.map((t) => (t.eventId === id ? { ...t, eventId: undefined } : t)),
    }));
  }, []);

  const setBudget = useCallback((budget: number) => setData((prev) => ({ ...prev, budget })), []);
  const setUserName = useCallback((userName: string) => setData((prev) => ({ ...prev, userName })), []);
  const resetToMock = useCallback(() => setData(createMockData(today)), [today]);

  const value = useMemo(
    () => ({ data, today, addEvent, removeEvent, setBudget, setUserName, resetToMock }),
    [data, today, addEvent, removeEvent, setBudget, setUserName, resetToMock],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData는 AppDataProvider 안에서만 쓸 수 있어요");
  return ctx;
}
