import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { DatePicker, type DatePickerProps } from './DatePicker'

type FormDatePickerProps<T extends FieldValues> = Omit<DatePickerProps, 'value' | 'onChange' | 'name' | 'onBlur'> & {
  control: Control<T>
  name: FieldPath<T>
}

/** DatePicker integrado ao React Hook Form via Controller (valor 'YYYY-MM-DD' ou ''). */
export function FormDatePicker<T extends FieldValues>({ control, name, ...props }: FormDatePickerProps<T>) {
  return <Controller
    control={control}
    name={name}
    render={({ field }) => <DatePicker {...props} value={(field.value as string | null | undefined) ?? ''} onBlur={field.onBlur} onChange={field.onChange} />}
  />
}
