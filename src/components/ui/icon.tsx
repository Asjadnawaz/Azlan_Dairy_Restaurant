/**
 * Material Symbols Outlined icon — uses the Google font ligature.
 * Font is loaded globally in app/layout.tsx via <link>.
 *
 * Usage: <Icon name="shopping_cart" size={22} className="text-primary" />
 */
export function Icon({
  name,
  size = 24,
  fill = false,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={{
        fontSize: size,
        lineHeight: 1,
        verticalAlign: "middle",
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${Math.min(Math.max(size, 20), 48)}`,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
