type ClassInput = string | null | undefined | false;

export function cn(...inputs: ClassInput[]) {
  return inputs.filter(Boolean).join(" ");
}
