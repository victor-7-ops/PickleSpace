type Status = 'active' | 'pending' | 'inactive' | 'confirmed' | 'cancelled' | 'completed' | 'available' | 'held' | 'booked'

const styles: Record<Status, string> = {
  active:    'bg-green-100 text-green-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  booked:    'bg-blue-100 text-blue-800',
  pending:   'bg-yellow-100 text-yellow-800',
  held:      'bg-yellow-100 text-yellow-800',
  available: 'bg-gray-100 text-gray-700',
  inactive:  'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}
