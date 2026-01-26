// Charts use React JSX

interface LineChartData {
    label: string;
    value: number;
}

interface LineChartProps {
    data: LineChartData[];
    formatValue?: (value: number) => string;
    color?: string;
    height?: number;
}

export function LineChart({
    data,
    formatValue = (v) => v.toString(),
    color = '#3B82F6',
    height = 200
}: LineChartProps) {
    if (data.length === 0) {
        return (
            <div
                className="flex items-center justify-center text-slate-400"
                style={{ height }}
            >
                No data available
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;

    // Calculate points for the line
    const points = data.map((item, index) => {
        const x = (index / (data.length - 1 || 1)) * 100;
        const y = 100 - ((item.value - minValue) / range) * 100;
        return { x, y, ...item };
    });

    // Create SVG path
    const pathD = points.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    // Create area path (for gradient fill)
    const areaD = pathD + ` L 100 100 L 0 100 Z`;

    return (
        <div style={{ height }} className="relative">
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                {/* Gradient fill */}
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                    </linearGradient>
                </defs>

                {/* Area fill */}
                <path
                    d={areaD}
                    fill="url(#lineGradient)"
                />

                {/* Line */}
                <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Data points */}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill="white"
                        stroke={color}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        className="hover:r-4 cursor-pointer"
                    />
                ))}
            </svg>

            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500 px-1">
                {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((item, i) => (
                    <span key={i}>{item.label}</span>
                ))}
            </div>

            {/* Y-axis labels */}
            <div className="absolute top-0 left-0 bottom-8 flex flex-col justify-between text-xs text-slate-500">
                <span>{formatValue(maxValue)}</span>
                <span>{formatValue(minValue)}</span>
            </div>
        </div>
    );
}
