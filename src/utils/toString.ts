export const str = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string")
    return value[0] as string;
  return "";
};
