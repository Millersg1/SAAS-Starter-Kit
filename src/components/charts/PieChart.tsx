// Charts use React JSX

interface PieChartData {
    label: string;
    value: number;
    percentage?: number;
}

interface PieChartProps {
    data: PieChartData[];
    size?: number;
}

const COLORS = [
    '#3B82F6', // blue
    '#10B981', // green  
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
];

export function PieChart({ data, size = 180 }: PieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
                <div
                    className="rounded-full border-8 border-slate-200 flex items-center justify-center"
                    style={{ width: size, height: size }}
                >
                    <span className="text-slate-400 text-sm">No data</span>
                </div>
            </div>
        );
    }

    // Calculate segments
    let cumulativePercent = 0;
    const segments = data.map((item, index) => {
        const percent = (item.value / total) * 100;
        const startPercent = cumulativePercent;
        cumulativePercent += percent;

        return {
            ...item,
            percent,
            startPercent,
            color: COLORS[index % COLORS.length],
        };
    });

    // Create conic gradient
    const gradientStops = segments.map((seg, _i) => {
        const start = seg.startPercent;
        const end = seg.startPercent + seg.percent;
        return `${seg.color} ${start}% ${end}%`;
    }).join(', ');

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Pie */}
            <div
                className="rounded-full relative"
                style={{
                    width: size,
                    height: size,
                    background: `conic-gradient(${gradientStops})`,
                }}
            >
                {/* Center hole for donut effect */}
                <div
                    className="absolute bg-white rounded-full"
                    style={{
                        width: size * 0.6,
                        height: size * 0.6,
                        top: size * 0.2,
                        left: size * 0.2,
                    }}
                />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 text-sm">
                {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: seg.color }}
                        />
                        <span className="text-slate-600">
                            {seg.label} ({seg.value})
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
