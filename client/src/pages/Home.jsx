import React from 'react';
import { Link } from 'react-router-dom';
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
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-850 text-white py-24 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left Hero Text */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-emerald-800/80 border border-emerald-700/60 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-300 shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Next-Gen Farming Equipment Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Smart Agricultural <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  Equipment Rental
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-emerald-100/90 max-w-2xl font-light leading-relaxed">
                Connecting farmers with top-tier agricultural machinery effortlessly while helping equipment owners streamline rentals, maximize uptime, and manage bookings efficiently.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 text-base"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/equipment"
                  className="w-full sm:w-auto bg-emerald-900/80 hover:bg-emerald-800 text-white font-medium px-8 py-3.5 rounded-xl border border-emerald-700/80 transition-all flex items-center justify-center space-x-2 text-base"
                >
                  <Tractor className="w-5 h-5 text-emerald-400" />
                  <span>Explore Equipment</span>
                </Link>
              </div>

              {/* Badges */}
              <div className="pt-6 border-t border-emerald-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-emerald-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Verified Machine Fleet</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Secure JWT Authentication</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Transparent Rental Pricing</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic Card */}
            <div className="lg:pl-8">
              <div className="relative rounded-2xl bg-emerald-900/40 p-6 border border-emerald-700/50 shadow-2xl backdrop-blur-md">
                <div className="bg-slate-900/90 rounded-xl p-6 border border-emerald-800/80 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                        <Tractor className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">John Deere 5075E Tractor</h3>
                        <p className="text-xs text-slate-400">75 HP • Heavy Duty Tillage & Harvesting</p>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
                      Available Now
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-xs text-slate-400 block">Daily Rate</span>
                      <span className="font-bold text-emerald-400 text-lg">$120 / day</span>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-xs text-slate-400 block">Location</span>
                      <span className="font-medium text-slate-200">Central Valley Farm Hub</span>
                    </div>
                  </div>

                  <div className="bg-emerald-950/60 p-4 rounded-xl border border-emerald-800/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-300 font-medium">Smart Dispatch Readiness</span>
                      <span className="text-emerald-400 font-bold">98% Match</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-emerald-400 h-2 rounded-full w-[98%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Built for Modern Agriculture
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-base">
            Engineered to streamline farm operations, optimize equipment deployment, and increase crop yields.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Tractor className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Easy Equipment Booking</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Browse a wide range of verified tractors, harvesters, seeders, and tillage tools with transparent rates.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Smart Scheduling</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Optimize rental durations to prevent double-booking and ensure timely dispatch during peak planting seasons.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <CloudSun className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Weather-Aware Planning</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Align field tasks with real-time weather forecasts to ensure optimal soil conditions before operating heavy machinery.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Maintenance Monitoring</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Track machine health metrics, service schedules, and inspection reports to keep rentals running safely.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl text-white">
              How It Works
            </h2>
            <p className="text-emerald-200 max-w-2xl mx-auto text-base">
              Four simple steps from finding the right machinery to completing field operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">

            {/* Step 1 */}
            <div className="bg-emerald-850 p-6 rounded-2xl border border-emerald-700/60 text-center space-y-4 relative">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-emerald-950 font-extrabold flex items-center justify-center mx-auto text-lg shadow-lg">
                1
              </div>
              <div className="flex justify-center text-emerald-300">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Browse Equipment</h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Filter by machinery type, horsepower, location, and daily rates to find the ideal match.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-emerald-850 p-6 rounded-2xl border border-emerald-700/60 text-center space-y-4 relative">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-emerald-950 font-extrabold flex items-center justify-center mx-auto text-lg shadow-lg">
                2
              </div>
              <div className="flex justify-center text-emerald-300">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Request Booking</h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Select start/end dates, specify delivery location, and submit your reservation request.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-emerald-850 p-6 rounded-2xl border border-emerald-700/60 text-center space-y-4 relative">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-emerald-950 font-extrabold flex items-center justify-center mx-auto text-lg shadow-lg">
                3
              </div>
              <div className="flex justify-center text-emerald-300">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Get Approval</h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Equipment owner reviews the request, confirms availability, and approves the booking.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-emerald-850 p-6 rounded-2xl border border-emerald-700/60 text-center space-y-4 relative">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-emerald-950 font-extrabold flex items-center justify-center mx-auto text-lg shadow-lg">
                4
              </div>
              <div className="flex justify-center text-emerald-300">
                <Tractor className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Use Equipment</h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Receive the equipment at your farm, execute operations, and complete your rental seamlessly.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Smart Agricultural Rental Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
