import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type GenderValue = "MALE" | "FEMALE" | "none"

export const GENDER_OPTIONS: { value: Exclude<GenderValue, "">; label: string }[] = [
  { value: "MALE", label: "Laki-laki" },
  { value: "FEMALE", label: "Perempuan" },
]

export function GenderSelect({
  id = "gender",
  label = "Jenis Kelamin",
  value,
  onChange,
  placeholder = "Pilih...",
}: {
  id?: string
  label?: string
  value: GenderValue
  onChange: (value: GenderValue) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as GenderValue)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Kosongkan</SelectItem>
          {GENDER_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
