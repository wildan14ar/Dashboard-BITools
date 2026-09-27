"use client"

import { createContext, useContext, useState } from "react"

type FilterValues = Record<string, string>

const Ctx = createContext<{ values: FilterValues; setValue: (key: string, val: string) => void }>({
  values: {},
  setValue: () => {},
})

export function DashboardFilterProvider({ children }: { children: React.ReactNode }) {
  const [values, setValues] = useState<FilterValues>({})
  const setValue = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }))
  return <Ctx.Provider value={{ values, setValue }}>{children}</Ctx.Provider>
}

export function useDashboardFilters() {
  return useContext(Ctx)
}
