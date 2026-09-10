import { useState, useEffect } from 'react';
import {
  Wrench,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Activity,
  X,
  AlertCircle,
  CalendarCheck
} from 'lucide-react';
import api from '../api/axios';
import useModal from '../hooks/useModal';

const RISK_STYLES = {
  Low: 'badge-green',
  Medium: 'badge-amber',
  High: 'badge-red',
};

const MaintenanceDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Scheduled Service',
    notes: '',
    usageHoursAtService: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/maintenance/dashboard');
      if (res.data.success) {
        setDashboard(res.data.dashboard);
      }
    } catch (err) {
      console.error('Error fetching maintenance dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load maintenance dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openRecordModal = (equipment) => {
    setSelectedEquipment(equipment);
    setMaintenanceForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Scheduled Service',
      notes: '',
      usageHoursAtService: equipment.usageHours ?? '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const { dialogProps: maintenanceDialogProps } = useModal({
    open: isModalOpen && !!selectedEquipment,
    onClose: () => setIsModalOpen(false),
    labelledBy: 'record-maintenance-modal-title',
  });

  const handleRecordMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return;

    try {
      setIsSubmitting(true);
      setFormError(null);
      await api.post('/maintenance', {
        equipmentId: selectedEquipment._id,
        date: maintenanceForm.date,
        type: maintenanceForm.type,
        notes: maintenanceForm.notes,
        usageHoursAtService: maintenanceForm.usageHoursAtService,
      });
      setIsModalOpen(false);
      setSelectedEquipment(null);
      fetchDashboard();
    } catch (err) {
      console.error('Record maintenance error:', err);
      setFormError(err.response?.data?.message || 'Failed to save maintenance record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (equipment) => {
    try {
      const nextStatus = equipment.status === 'Maintenance' ? 'Available' : 'Maintenance';
      await api.put(`/maintenance/equipment/${equipment._id}`, { status: nextStatus });
      fetchDashboard();
    } catch (err) {
      console.error('Toggle maintenance status error:', err);
      setError(err.response?.data?.message || 'Failed to update equipment status.');
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-container">
          <div className="state-block">
            <Loader2 className="state-icon animate-spin" />
            <p className="text-sm font-medium text-stone-600">Loading fleet maintenance data...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Fleet', value: dashboard?.totalEquipment ?? 0, icon: Activity, color: 'bg-stone-100 text-stone-600' },
    { label: 'Under Maintenance', value: dashboard?.underMaintenance ?? 0, icon: Wrench, color: 'bg-rose-50 text-rose-600' },
    { label: 'Due Within 3 Days', value: dashboard?.maintenanceDue ?? 0, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Overdue Service', value: dashboard?.maintenanceOverdue ?? 0, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600' },
    { label: 'Upcoming (14 days)', value: dashboard?.upcomingMaintenance ?? 0, icon: CalendarCheck, color: 'bg-sky-50 text-sky-600' },
    { label: 'Total Usage Hours', value: dashboard?.totalUsageHours ?? 0, icon: Activity, color: 'bg-forest-50 text-forest-700' },
  ];

  const renderEquipmentRow = (item) => {
    const risk = item.risk;
    return (
      <tr key={item._id} className="hover:bg-stone-50 transition-colors">
        <td className="table-td">
          <span className="font-bold text-stone-900 block text-xs">{item.name}</span>
          <span className="text-[11px] text-stone-400">{item.category} • {item.status}</span>
        </td>
        <td className="table-td text-xs font-mono text-stone-700">{item.usageHours ?? 0} hrs</td>
        <td className="table-td text-xs text-stone-600">{formatDate(item.nextMaintenanceDue)}</td>
        <td className="table-td text-xs text-stone-600">{item.daysToDue !== undefined ? `${item.daysToDue}d` : item.daysOverdue !== undefined ? `${item.daysOverdue}d overdue` : '--'}</td>
        <td className="table-td">
          <span className={RISK_STYLES[risk?.riskLevel] || RISK_STYLES.Low}>
            {risk?.riskLevel || 'Low'}
          </span>
        </td>
        <td className="table-td text-[11px] text-stone-500 max-w-[220px] truncate" title={risk?.summary}>
          {risk?.summary}
        </td>
        <td className="table-td">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => openRecordModal(item)}
              className="btn btn-primary btn-sm"
            >
              Record Service
            </button>
            <button
              onClick={() => handleToggleStatus(item)}
              className={`btn btn-sm border cursor-pointer ${item.status === 'Maintenance'
                  ? 'bg-forest-50 hover:bg-forest-100 text-forest-700 border-forest-200'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                }`}
            >
              {item.status === 'Maintenance' ? 'Mark Available' : 'Mark Under Maint.'}
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="page-shell">
      <div className="page-container">

        {/* Page Header */}
        <div className="page-header">
          <div className="flex items-center space-x-3">
            <div className="page-header-icon">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="page-title">Fleet Maintenance & Risk</h1>
              <p className="page-subtitle">
                Preventive service tracking, due/overdue alerts, and risk flags from real usage data.
              </p>
            </div>
          </div>
          <span className="badge badge-amber">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </span>
        </div>

        {error && (
          <div role="alert" className="alert-error p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} aria-label="Dismiss message" className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{s.label}</span>
                <div className={`p-2.5 ${s.color} rounded-xl`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
              <span className="text-3xl font-extrabold text-stone-900">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Equipment Needing Attention */}
        <div className="card overflow-hidden">
          <div className="card-body border-b border-stone-100 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Equipment Requiring Attention</h2>
                <p className="text-xs text-stone-500">Flagged by risk scoring (Medium/High) or currently under maintenance.</p>
              </div>
            </div>
            <span className="badge badge-amber">
              {dashboard?.equipmentRequiringAttention ?? 0} flagged
            </span>
          </div>

          {(!dashboard?.flagged || dashboard.flagged.length === 0) ? (
            <div className="p-10 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-forest-500 mx-auto" />
              <h3 className="font-bold text-stone-800">Fleet Is Healthy</h3>
              <p className="text-xs text-stone-500">No equipment currently requires maintenance attention.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="w-full text-left text-sm text-stone-600">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Equipment</th>
                    <th className="table-th">Usage Hours</th>
                    <th className="table-th">Next Due</th>
                    <th className="table-th">Due / Overdue</th>
                    <th className="table-th">Risk Level</th>
                    <th className="table-th">Risk Summary</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {dashboard.flagged.map(renderEquipmentRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Due Soon & Overdue lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card overflow-hidden">
            <div className="card-body border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Overdue Service</span>
              </h3>
              <span className="text-xs font-bold text-rose-600">{dashboard?.maintenanceOverdue ?? 0}</span>
            </div>
            <div className="divide-y divide-stone-100">
              {!dashboard?.overdue?.length && (
                <p className="p-4 text-xs text-stone-400">No overdue maintenance. All machines are within service windows.</p>
              )}
              {dashboard?.overdue?.map((o) => (
                <div key={o._id} className="p-4 flex justify-between items-center text-xs">
                  <span className="font-bold text-stone-800">{o.name}</span>
                  <div className="text-right">
                    <span className="text-rose-600 font-bold block">Overdue {o.daysOverdue}d</span>
                    <span className="text-stone-400">due {formatDate(o.nextMaintenanceDue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="card-body border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <CalendarCheck className="w-4 h-4 text-sky-600" />
                <span>Due Soon (3 days) & Upcoming (14 days)</span>
              </h3>
              <span className="text-xs font-bold text-sky-600">
                {(dashboard?.maintenanceDue ?? 0) + (dashboard?.upcomingMaintenance ?? 0)}
              </span>
            </div>
            <div className="divide-y divide-stone-100">
              {!dashboard?.dueSoon?.length && !dashboard?.upcoming?.length && (
                <p className="p-4 text-xs text-stone-400">No maintenance scheduled in the next two weeks.</p>
              )}
              {dashboard?.dueSoon?.map((d) => (
                <div key={d._id} className="p-4 flex justify-between items-center text-xs">
                  <span className="font-bold text-stone-800">{d.name}</span>
                  <span className="text-amber-600 font-bold">Due in {d.daysToDue}d</span>
                </div>
              ))}
              {dashboard?.upcoming?.map((u) => (
                <div key={u._id} className="p-4 flex justify-between items-center text-xs">
                  <span className="font-bold text-stone-800">{u.name}</span>
                  <span className="text-sky-600 font-bold">Due in {u.daysToDue}d</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Maintenance */}
        <div className="card overflow-hidden">
          <div className="card-body border-b border-stone-100">
            <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-forest-600" />
              <span>Recent Maintenance Records</span>
            </h3>
          </div>
          {!dashboard?.recentMaintenance?.length ? (
            <p className="p-4 text-xs text-stone-400">No maintenance has been recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="w-full text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Equipment</th>
                    <th className="table-th">Date</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {dashboard.recentMaintenance.map((h, idx) => (
                    <tr key={`${h.equipmentId}-${idx}`}>
                      <td className="table-td text-xs font-bold text-stone-800">{h.equipmentName}</td>
                      <td className="table-td text-xs text-stone-600">{formatDate(h.date)}</td>
                      <td className="table-td text-xs">
                        <span className="badge badge-green">{h.type}</span>
                      </td>
                      <td className="table-td text-xs text-stone-500 max-w-md truncate">{h.notes || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Record Maintenance Modal */}
      {isModalOpen && selectedEquipment && (
        <div {...maintenanceDialogProps} className={`${maintenanceDialogProps.className} fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 animate-fadeIn`}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 id="record-maintenance-modal-title" className="text-lg font-bold text-stone-900">Record Maintenance</h3>
              <button onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Recording service for <span className="font-bold text-stone-900">{selectedEquipment.name}</span>. This will update the last-service date, recompute the next due date, and clear the "under maintenance" flag.
            </p>

            {formError && (
              <div role="alert" className="alert-error p-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRecordMaintenance} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Service Date</label>
                  <input
                    type="date"
                    value={maintenanceForm.date}
                    onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Usage Hours at Service</label>
                  <input
                    type="number"
                    min="0"
                    value={maintenanceForm.usageHoursAtService}
                    onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, usageHoursAtService: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Maintenance Type</label>
                <select
                  value={maintenanceForm.type}
                  onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="input"
                >
                  <option>Scheduled Service</option>
                  <option>Repair</option>
                  <option>Safety Inspection</option>
                  <option>General</option>
                  <option>Hydraulics / Transmission</option>
                  <option>Engine Overhaul</option>
                </select>
              </div>

              <div>
                <label className="label">Service Notes</label>
                <textarea
                  rows="3"
                  value={maintenanceForm.notes}
                  onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Replaced oil filter, checked hydraulics, tightened belts..."
                  className="input"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceDashboard;
