/** Join truthy class names. The one sanctioned way to combine CSS-Module classes. */
export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
