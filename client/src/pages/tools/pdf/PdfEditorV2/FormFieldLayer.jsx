// Pure render of one page's detected AcroForm fields (useFormFields.js) as
// native inputs positioned over the PDF canvas. Renders above
// AnnotationLayer so a field is always clickable — see docs/batches/
// batch-36-plan.md's Phase 1 for the detection side.

function TextFieldInput({ field, value, onChange }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full h-full bg-cobalt-tint outline-none px-1 text-sm border border-dashed border-cobalt"
      style={{ pointerEvents: 'auto' }}
    />
  )
}

function CheckboxFieldInput({ field, value, onChange }) {
  return (
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e) => onChange(field.name, e.target.checked)}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full h-full accent-cobalt cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    />
  )
}

// Every widget sharing this field's name renders its own radio input here
// (one per on-page location); `field.widgetValue` is this specific widget's
// export value, so only the widget matching the current selection shows
// checked — the browser's native `name` grouping only works within a single
// page's DOM anyway, so cross-page mutual exclusivity is enforced by all of
// them sharing the same `values[field.name]` state instead.
function RadioFieldInput({ field, value, onChange }) {
  return (
    <input
      type="radio"
      checked={value === field.widgetValue}
      onChange={() => onChange(field.name, field.widgetValue)}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full h-full accent-cobalt cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    />
  )
}

function DropdownFieldInput({ field, value, onChange }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full h-full bg-cobalt-tint outline-none text-sm border border-dashed border-cobalt"
      style={{ pointerEvents: 'auto' }}
    >
      <option value="" disabled hidden />
      {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  )
}

const INPUTS = {
  text: TextFieldInput,
  checkbox: CheckboxFieldInput,
  radio: RadioFieldInput,
  dropdown: DropdownFieldInput,
}

export default function FormFieldLayer({ fields, values, onChange }) {
  if (!fields.length) return null
  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      {fields.map((field) => {
        const Input = INPUTS[field.type]
        if (!Input) return null
        return (
          <div
            key={field.id}
            className="absolute"
            style={{ left: field.x, top: field.y, width: field.w, height: field.h }}
          >
            <Input field={field} value={values[field.name]} onChange={onChange} />
          </div>
        )
      })}
    </div>
  )
}
