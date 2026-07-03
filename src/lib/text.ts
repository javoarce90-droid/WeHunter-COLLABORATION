export function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("es-AR") + word.slice(1).toLocaleLowerCase("es-AR"))
    .join(" ");
}

export function normalizeIfUncapitalized(value: string): string {
  const isAllLower = value === value.toLowerCase();
  const isAllUpper = value === value.toUpperCase();
  return isAllLower || isAllUpper ? toTitleCase(value) : value;
}
