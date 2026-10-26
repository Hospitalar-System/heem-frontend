import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Select, type SelectProps } from './Select'

type FormSelectProps<T extends FieldValues> = Omit<SelectProps, 'value' | 'onChange' | 'name' | 'onBlur'> & {
  control: Control<T>
  name: FieldPath<T>
  /** Efeito colateral após a mudança (ex.: limpar mensagem de aviso). */
  onValueChange?: (value: string) => void
}

/**
 * Select integrado ao React Hook Form via Controller:
 * `<FormSelect control={form.control} name="role" options={...} />`.
 */
export function FormSelect<T extends FieldValues>({ control, name, onValueChange, ...props }: FormSelectProps<T>) {
  return <Controller
    control={control}
    name={name}
    render={({ field }) => <Select {...props} value={(field.value as string | undefined) ?? ''} onBlur={field.onBlur} onChange={(value) => { field.onChange(value); onValueChange?.(value) }} />}
  />
}
