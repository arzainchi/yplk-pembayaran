export interface YColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  width?: string
  hideOnMobile?: boolean
}

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'switch' | 'multiselect'
  options?: Array<{ label: string; value: string | number }>
  required?: boolean
  help?: string
  placeholder?: string
  colSpan?: 1 | 2
}
