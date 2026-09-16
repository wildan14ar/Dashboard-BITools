"use client"

import { Check, ChevronDown, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useRoles } from "@/hooks/use-roles"
import { cn } from "@/lib/utils"

export interface SelectOption {
  id: string
  name: string
}

export interface RoleProps {
  selected: string[]
  onChange: (selected: string[]) => void
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function InputRole({
  selected,
  onChange,
  label,
  placeholder = "Pilih role",
  className,
  disabled = false,
}: RoleProps) {
  const { data } = useRoles({ page: 1, limit: 100 })
  const roles = data?.items || []
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const options: SelectOption[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
  }))

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (optionId: string) => {
    if (disabled) return
    if (!selected.includes(optionId)) {
      onChange([...selected, optionId])
    }
    setIsOpen(false)
  }

  const handleRemove = (optionId: string) => {
    if (disabled) return
    onChange(selected.filter((item) => item !== optionId))
  }

  return (
    <div className={cn("space-y-2", className)} ref={dropdownRef}>
      {label && (
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span
            className={selected.length > 0 ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}
          >
            {selected.length > 0 ? `${selected.length} role dipilih` : placeholder}
          </span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-300 rounded-lg shadow-lg dark:bg-zinc-800 dark:border-zinc-600 max-h-60 overflow-auto">
            {options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700",
                    selected.includes(option.id) &&
                      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                  )}
                >
                  {option.name}
                  {selected.includes(option.id) && <Check className="w-4 h-4" />}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-zinc-500">Tidak ada opsi tersedia</p>
            )}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((itemId) => {
            const option = options.find((o) => o.id === itemId)
            return (
              <span
                key={itemId}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {option?.name || itemId}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(itemId)}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Roles({
  roleIds,
  roles,
}: {
  roleIds: string[]
  roles?: Array<{ id: string; name: string }>
}) {
  const { data } = useRoles({ page: 1, limit: 100 })
  const availableRoles = roles || data?.items || []

  return (
    <div className="flex flex-wrap items-center gap-2">
      {roleIds.map((roleId) => {
        const role = availableRoles.find((r) => r.id === roleId)
        return (
          <span
            key={roleId}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          >
            {role?.name || roleId}
          </span>
        )
      })}
    </div>
  )
}
