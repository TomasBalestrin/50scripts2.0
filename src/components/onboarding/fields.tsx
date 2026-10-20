'use client';

import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const CONTROL_CLASS =
  'border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]';

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function FieldShell({ label, htmlFor, hint, error, children }: FieldShellProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm text-white">
        {label} <span className="text-red-400">*</span>
      </Label>
      {hint && <p className="text-xs text-[#94A3B8]">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TextFieldProps
  extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'id'> {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function TextField({ id, label, value, error, onChange, ...inputProps }: TextFieldProps) {
  return (
    <FieldShell label={label} htmlFor={id} error={error}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL_CLASS} ${error ? 'border-red-500' : ''}`}
        {...inputProps}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function TextAreaField({ id, label, value, placeholder, onChange }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} htmlFor={id}>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL_CLASS} min-h-[80px]`}
      />
    </FieldShell>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, placeholder, onChange }: SelectFieldProps) {
  return (
    <FieldShell label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={CONTROL_CLASS}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-[#131B35] bg-[#0A0F1E]">
          {options.map((option) => (
            <SelectItem key={option} value={option} className="text-white hover:bg-[#131B35]">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

interface CheckboxGroupFieldProps {
  label: string;
  hint?: string;
  options: readonly string[];
  value: readonly string[];
  onToggle: (option: string) => void;
}

export function CheckboxGroupField({ label, hint, options, value, onToggle }: CheckboxGroupFieldProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <div className="space-y-2.5">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-3 cursor-pointer group">
            <Checkbox
              checked={value.includes(option)}
              onCheckedChange={() => onToggle(option)}
              className="border-[#94A3B8]/30 data-[state=checked]:bg-[#1D4ED8] data-[state=checked]:border-[#1D4ED8]"
            />
            <span className="text-sm text-white group-hover:text-[#3B82F6] transition-colors">
              {option}
            </span>
          </label>
        ))}
      </div>
    </FieldShell>
  );
}

interface YesNoFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function YesNoField({ label, value, onChange }: YesNoFieldProps) {
  return (
    <FieldShell label={label}>
      <div className="flex gap-3">
        {[
          { text: 'Sim', answer: true },
          { text: 'Não', answer: false },
        ].map(({ text, answer }) => (
          <button
            key={text}
            type="button"
            onClick={() => onChange(answer)}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              value === answer
                ? 'border-[#1D4ED8] bg-[#1D4ED8]/10 text-[#3B82F6]'
                : 'border-[#131B35] bg-[#131B35] text-[#94A3B8] hover:border-[#94A3B8]/30'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}
