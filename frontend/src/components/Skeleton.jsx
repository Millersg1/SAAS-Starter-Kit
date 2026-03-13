/**
 * Reusable skeleton loading primitives.
 * Usage:
 *   <Skeleton.Card />          — full card placeholder
 *   <Skeleton.StatCard />      — stat card (icon + number + label)
 *   <Skeleton.Row />           — table/list row
 *   <Skeleton.Text w="w-32" /> — single text line
 */

const pulse = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

const Text = ({ w = 'w-24', h = 'h-4', className = '' }) => (
  <div className={`${pulse} ${w} ${h} ${className}`} />
);

const StatCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3">
    <div className="flex items-center justify-between">
      <div className={`${pulse} w-10 h-10 rounded-lg`} />
    </div>
    <Text w="w-20" h="h-3" />
    <Text w="w-16" h="h-7" />
    <Text w="w-24" h="h-3" />
  </div>
);

const Card = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Text w="w-36" h="h-5" />
        <Text w="w-24" h="h-3" />
      </div>
      <Text w="w-16" h="h-6" />
    </div>
    <div className="space-y-2">
      <Text w="w-48" h="h-3" />
      <Text w="w-32" h="h-3" />
    </div>
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className={`${pulse} w-full h-9 rounded`} />
    </div>
  </div>
);

const Row = () => (
  <div className="flex items-center gap-3 px-6 py-3">
    <div className={`${pulse} w-2.5 h-2.5 rounded-full flex-shrink-0`} />
    <div className="flex-1 space-y-1.5">
      <Text w="w-40" h="h-4" />
      <Text w="w-24" h="h-3" />
    </div>
    <Text w="w-16" h="h-4" />
  </div>
);

const Column = () => (
  <div className="space-y-2">
    <div className={`${pulse} w-full h-10 rounded-t-lg`} />
    <div className="space-y-2 p-2">
      {[1, 2, 3].map(i => (
        <div key={i} className={`${pulse} w-full h-20 rounded`} />
      ))}
    </div>
  </div>
);

const Skeleton = { Text, StatCard, Card, Row, Column };
export default Skeleton;
