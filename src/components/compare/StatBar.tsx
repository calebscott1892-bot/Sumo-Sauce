type Props = {
  labelA: string;
  valueA: number;
  labelB: string;
  valueB: number;
  colorA?: string;
  colorB?: string;
};

export default function StatBar({
  labelA,
  valueA,
  labelB,
  valueB,
  colorA = 'bg-red-500',
  colorB = 'bg-blue-500',
}: Props) {
  const total = valueA + valueB;
  const pctA = total > 0 ? (valueA / total) * 100 : 50;
  const pctB = total > 0 ? (valueB / total) * 100 : 50;

  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center justify-between text-zinc-300">
        <span>
          {labelA}: <span className="font-semibold text-zinc-100">{valueA}</span>
        </span>
        <span>
          {labelB}: <span className="font-semibold text-zinc-100">{valueB}</span>
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
        {total > 0 ? (
          <>
            <div
              className={`${colorA} transition-all duration-500`}
              style={{ width: `${pctA}%` }}
            />
            <div
              className={`${colorB} transition-all duration-500`}
              style={{ width: `${pctB}%` }}
            />
          </>
        ) : (
          <>
            <div className="bg-zinc-700" style={{ width: '50%' }} />
            <div className="bg-zinc-600" style={{ width: '50%' }} />
          </>
        )}
      </div>
    </div>
  );
}
