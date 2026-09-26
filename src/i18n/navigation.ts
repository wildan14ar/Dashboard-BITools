import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

// Locale-aware navigation primitives. Use these instead of
// next/link & next/navigation so URLs keep the /id|/en prefix.
export const { Link, usePathname, useRouter } = createNavigation(routing)
