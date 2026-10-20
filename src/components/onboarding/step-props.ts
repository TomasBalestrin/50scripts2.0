import type {
  OnboardingField,
  OnboardingFieldErrors,
  OnboardingFormData,
} from '@/lib/onboarding/form';

export interface StepProps {
  data: OnboardingFormData;
  errors: OnboardingFieldErrors;
  onChange: (fields: Partial<OnboardingFormData>) => void;
  onBlur: (field: OnboardingField) => void;
}
