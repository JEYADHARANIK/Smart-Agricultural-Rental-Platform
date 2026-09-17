import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  Tractor,
  Calendar,
  CloudSun,
  Wrench,
  ArrowRight,
  Search,
  FileCheck,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

const Home = () => {
  const [heroEquipment, setHeroEquipment] = useState(null);

  // Pull a real, currently-available machine for the hero graphic.
  useEffect(() => {
    let cancelled = false;
    const loadHeroEquipment = async () => {
      try {
        const res = await api.get('/equipment', { params: { status: 'Available' } });
        const list = res.data.equipment || [];
        if (!cancelled) setHeroEquipment(list[0] || null);
      } catch {
        if (!cancelled) setHeroEquipment(null);
      }
    };
    loadHeroEquipment();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-shell">
      {/* Hero Section */}
      <section className="bg-forest-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left Hero Text */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-xs font-semibold text-forest-100">
                <Sparkles className="w-4 h-4 text-forest-300" />
                <span>Smart Farming Equipment Rental</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Rent the right machinery for your farm
              </h1>

              <p className="text-lg text-forest-100 max-w-2xl leading-relaxed">
                Browse verified tractors, harvesters, and tillage equipment. Request bookings, get weather-aware scheduling, and manage everything from one place.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  to="/equipment"
                  className="w-full sm:w-auto bg-forest-600 hover:bg-forest-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors flex items-center justify-center space-x-2 text-base"
                >
                  <Tractor className="w-5 h-5" />
                  <span>Find Equipment</span>
                </Link>
                <Link
                  to="/register"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-3.5 rounded-xl border border-white/20 transition-colors flex items-center justify-center space-x-2 text-base"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              {/* Badges */}
              <div className="pt-6 border-t border-forest-800 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-forest-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-300" />
                  <span>Verified Equipment Fleet</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-forest-300" />
                  <span>Secure Booking & Payment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-forest-300" />
                  <span>Transparent Daily Pricing</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic Card (live fleet data) */}
            <div className="lg:pl-8 hidden lg:block">
              <div className="rounded-2xl bg-white/5 border border-white/15 p-6">
                {heroEquipment ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-white/10 text-forest-200 rounded-xl">
                          <Tractor className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{heroEquipment.name}</h3>
                          <p className="text-xs text-forest-200">{heroEquipment.category}</p>
                        </div>
                      </div>
                      <span className="bg-forest-500/20 text-forest-100 text-xs font-semibold px-3 py-1 rounded-full border border-forest-400/30">
                        {heroEquipment.status === 'Available' ? 'Available Now' : heroEquipment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <span className="text-xs text-forest-200 block">Daily Rate</span>
                        <span className="font-bold text-forest-100 text-lg">₹{heroEquipment.dailyRate} / day</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <span className="text-xs text-forest-200 block">Location</span>
                        <span className="font-medium text-white">{heroEquipment.location || 'Farm equipment hub'}</span>
                      </div>
                    </div>

                    <div className="bg-forest-950/60 p-4 rounded-xl border border-forest-700/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-forest-100 font-medium">Owner-set daily pricing</span>
                        <span className="text-forest-200 font-bold">Live from fleet</span>
                      </div>
                      <p className="text-[11px] text-forest-300">
                        Book a weather-aware slot and complete your payment online. Rates shown are set by the equipment owner.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center py-8">
                    <div className="p-3 bg-white/10 text-forest-200 rounded-xl inline-flex">
                      <Tractor className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-forest-200">Loading the latest fleet availability…</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl">
            Built for Modern Agriculture
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto text-base">
            Streamlined farm operations, dependable scheduling, and equipment that's ready when you need it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Feature 1 */}
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center">
              <Tractor className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Easy Equipment Booking</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Browse verified tractors, harvesters, seeders, and tillage tools with transparent daily rates.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-700 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Smart Scheduling</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Plan rental windows that avoid double-booking so machinery is ready when you need it.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <CloudSun className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Weather-Aware Planning</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              See expected field conditions so you can time work around the weather before it starts.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Maintenance Monitoring</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Track machine health, service schedules, and risk flags to keep rentals running safely.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-forest-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl text-white">
              How It Works
            </h2>
            <p className="text-forest-100 max-w-2xl mx-auto text-base">
              Four simple steps from finding the right machinery to completing field operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

            {/* Step 1 */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-forest-500 text-white font-extrabold flex items-center justify-center mx-auto text-lg">
                1
              </div>
              <div className="flex justify-center text-forest-200">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Browse Equipment</h3>
              <p className="text-xs text-forest-100 leading-relaxed">
                Filter by machinery type, location, and daily rates to find the right match.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-forest-500 text-white font-extrabold flex items-center justify-center mx-auto text-lg">
                2
              </div>
              <div className="flex justify-center text-forest-200">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Request Booking</h3>
              <p className="text-xs text-forest-100 leading-relaxed">
                Pick your dates, note the delivery location, and submit your request.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-forest-500 text-white font-extrabold flex items-center justify-center mx-auto text-lg">
                3
              </div>
              <div className="flex justify-center text-forest-200">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Get Approval</h3>
              <p className="text-xs text-forest-100 leading-relaxed">
                Your request is reviewed, confirmed for availability, and approved.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-forest-500 text-white font-extrabold flex items-center justify-center mx-auto text-lg">
                4
              </div>
              <div className="flex justify-center text-forest-200">
                <Tractor className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Use the Equipment</h3>
              <p className="text-xs text-forest-100 leading-relaxed">
                Receive the equipment at your farm, complete the work, and finish your rental.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest-950 text-forest-200 py-10 border-t border-forest-800 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Smart Agricultural Rental Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;