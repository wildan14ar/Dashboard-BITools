"use client"

import { Check, ChevronDown, Globe } from "lucide-react"
import { useLocale } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

type Locale = (typeof routing.locales)[number]
type ButtonLanguageMode = "dropdown" | "flow"

const localeNames: Record<Locale, string> = {
  id: "Indonesia",
  en: "English",
}

interface ButtonLanguageProps {
  mode?: ButtonLanguageMode
  /** true = ikon + nama bahasa; false = ikon saja. */
  showLabel?: boolean
}

export default function ButtonLanguage({
  mode = "dropdown",
  showLabel = true,
}: ButtonLanguageProps) {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLanguageChange = (newLocale: Locale) => {
    // Keep the cookie in sync for edge locale detection, then switch prefix
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; samesite=lax`
    setIsOpen(false)
    router.replace(pathname, { locale: newLocale })
  }

  const currentLocaleName = localeNames[locale]

  const optionClass = (loc: Locale) =>
    `w-full text-left px-4 py-2 text-sm transition-colors ${
      locale === loc ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
    }`

  const dropdownContent = (
    <div className="w-40 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
      {routing.locales.map((loc) => (
        <button
          type="button"
          key={loc}
          onClick={() => handleLanguageChange(loc)}
          className={optionClass(loc)}
        >
          <div className="flex items-center space-x-2">
            {locale === loc && <Check className="h-4 w-4" />}
            <span>{localeNames[loc]}</span>
          </div>
        </button>
      ))}
    </div>
  )

  const flowContent = (
    <div className="w-full overflow-hidden animate-in fade-in-0 duration-150">
      <div className="w-full bg-muted/50 border border-border rounded-lg overflow-hidden">
        {routing.locales.map((loc) => (
          <button
            type="button"
            key={loc}
            onClick={() => handleLanguageChange(loc)}
            className={`${optionClass(loc)} flex items-center`}
          >
            {locale === loc && <Check className="mr-2 h-4 w-4" />}
            <span className={locale === loc ? "ml-0" : "ml-6"}>{localeNames[loc]}</span>
          </button>
        ))}
      </div>
    </div>
  )

  if (mode === "flow") {
    return (
      <div className="w-full" ref={buttonRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-foreground hover:bg-accent rounded-lg px-4 py-3 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span className="font-medium">{currentLocaleName}</span>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && flowContent}
      </div>
    )
  }

  return (
    <div className="relative inline-block" ref={buttonRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-foreground hover:text-foreground focus:outline-none cursor-pointer hover:bg-accent rounded-lg px-3 py-2"
        aria-label="Change language"
        title={currentLocaleName}
        aria-expanded={isOpen}
      >
        <Globe className="h-5 w-5" />
        {showLabel && (
          <>
            <span className="text-sm font-medium">{currentLocaleName}</span>
            <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {isOpen && <div className="absolute left-0 top-full mt-1 z-50">{dropdownContent}</div>}
    </div>
  )
}
