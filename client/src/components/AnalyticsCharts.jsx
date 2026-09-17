import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = ['#2f6746', '#90bd9f', '#629d77', '#bcd8c4', '#d97706', '#78716c'];

const emptyState = (text) => (
  <div className="h-48 flex items-center justify-center text-xs text-stone-400">{text}</div>
);

const AnalyticsCharts = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm space-y-4">
        <Loader2 className="w-10 h-10 text-forest-600 animate-spin mx-auto" />
        <p className="text-sm font-medium text-stone-600">Computing analytics from live data...</p>
      </div>
    );
  }

  if (!analytics) return null;

  const {
    monthlyRevenue = [],
    bookingTrends = [],
    mostRented = [],
    equipmentStatusDistribution = [],
    usageHoursByCategory = [],
    equipmentUtilization = [],
  } = analytics;

  return (
    <div className="space-y-6">
      {/* Revenue & Bookings trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-stone-900 text-sm mb-4">Monthly Revenue (last 6 months)</h3>
          {monthlyRevenue.length === 0 ? (
            emptyState('No paid transactions yet — revenue will appear here.')
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#2f6746" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-stone-900 text-sm mb-4">Booking Trends (last 6 months)</h3>
          {bookingTrends.length === 0 ? (
            emptyState('No bookings yet — booking trends will appear here.')
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={bookingTrends} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip formatter={(value) => [`${value}`, 'Bookings']} />
                <Line type="monotone" dataKey="count" stroke="#41805a" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status donut & usage by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-stone-900 text-sm mb-4">Equipment Status Distribution</h3>
          {equipmentStatusDistribution.every?.((d) => d.value === 0) || equipmentStatusDistribution.length === 0 ? (
            emptyState('No equipment registered yet.')
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={equipmentStatusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {equipmentStatusDistribution.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} units`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-stone-900 text-sm mb-4">Total Usage Hours by Category</h3>
          {usageHoursByCategory.length === 0 ? (
            emptyState('No usage data recorded yet.')
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={usageHoursByCategory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} width={110} />
                <Tooltip formatter={(value) => [`${value} hrs`, 'Usage']} />
                <Bar dataKey="hours" fill="#629d77" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Most rented & utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-stone-900 text-sm mb-4">Most Rented Equipment</h3>
          {mostRented.length === 0 ? (
            emptyState('Rental activity will appear here.')
          ) : (
            <div className="space-y-3">
              {mostRented.map((m, i) => (
                <div key={m._id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`w-6 h-6 rounded-xl flex items-center justify-center font-bold text-[11px] ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="font-bold text-stone-800 truncate">{m.name}</span>
                    <span className="text-stone-400 text-[11px]">{m.category}</span>
                  </div>
                  <span className="font-extrabold text-forest-600 shrink-0">{m.rentals} rental{m.rentals === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-stone-900 text-sm mb-4">Equipment Utilization (30-day)</h3>
          {equipmentUtilization.length === 0 ? (
            emptyState('No equipment data available.')
          ) : (
            <div className="space-y-3">
              {equipmentUtilization.slice(0, 8).map((u) => (
                <div key={u._id} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 truncate mr-3">{u.name}</span>
                  <div className="flex items-center space-x-2 flex-1">
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${u.utilization >= 70 ? 'bg-forest-500' : u.utilization >= 40 ? 'bg-amber-500' : 'bg-sky-500'}`}
                        style={{ width: `${u.utilization}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-stone-800 w-12 text-right">{u.utilization}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
