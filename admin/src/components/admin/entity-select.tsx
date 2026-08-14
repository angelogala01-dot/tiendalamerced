import { getBrandLabel, getCategoryLabel } from '@/lib/catalog/normalize';import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SelectEntity = { id: string; name: string };

type EntitySelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: SelectEntity[];
  placeholder: string;
  emptyLabel: string;
  error?: string;
  required?: boolean;
};

export function EntitySelect({
  label,
  value,
  onChange,
  items,
  placeholder,
  emptyLabel,
  error,
  required,
}: EntitySelectProps) {
  const selected = items.find((item) => item.id === value);
  const displayLabel = selected?.name?.trim() || emptyLabel;

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Select
        value={value || 'none'}
        onValueChange={(v) => onChange(v === 'none' ? '' : v ?? '')}
      >
        <SelectTrigger className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder}>{displayLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{emptyLabel}</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export { getBrandLabel, getCategoryLabel };
