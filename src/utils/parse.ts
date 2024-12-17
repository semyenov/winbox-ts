export function parse(
  num: number | string,
  base: number,
  center?: number
): number {
  if (typeof num === "string") {
    if (num === "center") {
      num = ((base - center!) / 2) | 0;
    } else if (num === "right" || num === "bottom") {
      num = base - center!;
    } else {
      const value = parseFloat(num);
      const unit = "" + value !== num && num.substring(("" + value).length);
      if (unit === "%") {
        num = ((base / 100) * value) | 0;
      } else {
        num = value;
      }
    }
  }
  return num as number;
}
