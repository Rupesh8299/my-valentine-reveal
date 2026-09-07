import type { CSSProperties } from "react";

interface MobileBackgroundProps {
  colors: string[];
}

export default function MobileBackground({ colors }: MobileBackgroundProps) {
  const style = {
    "--ambient-primary": colors[0],
    "--ambient-secondary": colors[1],
    "--ambient-tertiary": colors[2] ?? colors[0],
  } as CSSProperties;

  return <div className="mobile-ambient-background" style={style} aria-hidden="true" />;
}
