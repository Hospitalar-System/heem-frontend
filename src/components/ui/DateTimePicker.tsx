import { useState } from 'react'
import { DatePicker } from './DatePicker'
import { parseDate } from './civil-date'
import { Select } from './Select'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((value) => ({ value, label: value }))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((value) => ({ value, label: value }))

export type DateTimePickerProps = {
  /** 'YYYY-MM-DDTHH:mm' (mesmo formato do input datetime-local) ou ''. */
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  required?: boolean
  label: string
  'aria-invalid'?: boolean
}

/** Data (DatePicker) + hora e minuto (Selects). Emite o mesmo formato do datetime-local. */
export function DateTimePicker({ value, onChange, min, max, disabled, required, label, 'aria-invalid': invalid }: DateTimePickerProps) {
  const [date, time = ''] = value.split('T')
  const [hh = '', mm = ''] = time.split(':')
  const [draft, setDraft] = useState({ hh: hh || '08', mm: mm || '00' })
  const hour = hh || draft.hh
  const minute = mm || draft.mm
  const emit = (nextDate: string, nextHour: string, nextMinute: string) => onChange(parseDate(nextDate) ? `${nextDate}T${nextHour}:${nextMinute}` : '')

  return <div className="grid grid-cols-[1fr_auto_auto] gap-2">
    <DatePicker aria-label={label} value={date} min={min} max={max} disabled={disabled} required={required} aria-invalid={invalid} onChange={(next) => emit(next, hour, minute)} />
    <div className="w-[72px]"><Select aria-label={`${label}, hora`} value={hour} disabled={disabled} onChange={(next) => { setDraft((d) => ({ ...d, hh: next })); emit(date, next, minute) }} options={HOURS} /></div>
    <div className="w-[72px]"><Select aria-label={`${label}, minuto`} value={minute} disabled={disabled} onChange={(next) => { setDraft((d) => ({ ...d, mm: next })); emit(date, hour, next) }} options={MINUTES} /></div>
  </div>
}
