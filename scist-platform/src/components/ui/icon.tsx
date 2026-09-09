import {
  Binary,
  Bug,
  Code2,
  Globe,
  Hammer,
  KeyRound,
  Puzzle,
  Radio,
  Stethoscope,
  Terminal,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Binary,
  Bug,
  Code2,
  Globe,
  Hammer,
  KeyRound,
  Puzzle,
  Radio,
  Stethoscope,
  Terminal,
  Trophy,
};

/** Renders a lucide icon by the string name stored in data files. */
export function Icon({
  name,
  size = 18,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Cmp = MAP[name] ?? Puzzle;
  return <Cmp size={size} className={className} style={style} />;
}
