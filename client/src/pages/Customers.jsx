import React from 'react';
import { Users, Mail, Phone, MapPin, ShieldCheck, Clock } from 'lucide-react';

const Customers = () => {
  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Customer Management Directory</h1>
            <p className="text-sm text-slate-500">View registered farmers, contact parameters, and rental account status.</p>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Restricted View</span>
          </span>
        </div>

        {/* Directory Table Mockup */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg">Registered Farmers</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Account Role</th>
                  <th className="px-6 py-3.5">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                
                <tr className="hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-bold text-slate-900 flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Robert Farmstead</span>
                  </td>
                  <td className="px-6 py-4 flex items-center space-x-1.5 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>robert@farm.org</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-700">+1 (555) 234-5678</td>
                  <td className="px-6 py-4 text-xs text-slate-700">Springfield, Valley District</td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                      customer
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">Jul 30, 2026</td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Full customer search and account administration tools will be implemented in Phase 2.</span>
        </div>

      </div>
    </div>
  );
};

export default Customers;
