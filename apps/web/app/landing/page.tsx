'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  BarChart3, Zap, Shield, Package, TrendingUp, Clock,
  Users, CheckCircle2, ArrowRight, Star, ChevronDown,
  MessageCircle, Tag, Activity, Wallet
} from 'lucide-react';
import { useState, useEffect } from 'react';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 300], [0, -50]);

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setNavScrolled(v > 20));
    return () => unsub();
  }, [scrollY]);

  const features = [
    { icon: BarChart3, title: 'Advanced Analytics', desc: 'Real-time dashboards with sales trends, conversion rates, and revenue breakdowns.', color: '#006d43' },
    { icon: Package, title: 'Bulk Management', desc: 'Manage thousands of listings at once. CSV imports, bulk edits, and smart scheduling.', color: '#00a86b' },
    { icon: MessageCircle, title: 'Smart Messaging', desc: 'Automated buyer communication with AI-powered responses and follow-ups.', color: '#005232' },
    { icon: Tag, title: 'Discount Engine', desc: 'Create coupons, flash sales, and loyalty discounts — all on autopilot.', color: '#006d43' },
    { icon: Activity, title: 'Automation', desc: 'Set triggers and actions to handle repetitive tasks while you sleep.', color: '#00a86b' },
    { icon: Shield, title: 'Policy Compliance', desc: 'Built-in Etsy policy checker keeps your listings safe from violations.', color: '#005232' },
  ];

  const stats = [
    { value: 12400, suffix: '+', label: 'Active Sellers' },
    { value: 98, suffix: '%', label: 'Uptime SLA' },
    { value: 3200000, suffix: '+', label: 'Orders Synced' },
    { value: 4, suffix: 'x', label: 'Avg. Revenue Growth' },
  ];

  return (
    <div className="min-h-screen bg-[#0a1a10] text-white relative overflow-hidden">

      {/* Animated background grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,109,67,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,109,67,0.25) 0%, transparent 70%)' }}
          animate={{ x: [0, 80, 0], y: [0, 60, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-100px] right-[-100px] w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,168,107,0.2) 0%, transparent 70%)' }}
          animate={{ x: [0, -80, 0], y: [0, -60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Navbar */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${navScrolled ? 'bg-[#0a1a10]/90 backdrop-blur-md border-b border-white/10' : ''}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden p-1">
            <img src="/logo-icon.png" alt="Profix" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xl text-white">Profix</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-white/70 hover:text-white transition-colors text-sm">Features</a>
          <a href="#stats" className="text-white/70 hover:text-white transition-colors text-sm">Results</a>
          <a href="#pricing" className="text-white/70 hover:text-white transition-colors text-sm">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/login')} className="px-4 py-2 text-white/80 hover:text-white transition-colors text-sm">
            Sign In
          </button>
          <button
            onClick={() => router.push('/register')}
            className="px-5 py-2.5 bg-[#006d43] hover:bg-[#00a86b] text-white rounded-lg font-semibold text-sm transition-all hover:shadow-lg hover:shadow-green-900/50"
          >
            Get Started
          </button>
        </div>
      </motion.nav>

      {/* Hero */}
      <motion.section
        className="relative z-10 pt-40 pb-24 px-8"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#006d43]/20 border border-[#006d43]/40 rounded-full text-[#00e87a] text-sm font-medium mb-8"
          >
            <Zap className="w-4 h-4" />
            The #1 Platform for Etsy Sellers
          </motion.div>

          <motion.h1
            className="text-6xl md:text-8xl font-black mb-6 leading-[1.05] tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Sell More.
            <br />
            <span style={{ background: 'linear-gradient(135deg, #00e87a, #006d43)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Work Less.
            </span>
          </motion.h1>

          <motion.p
            className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Automate your Etsy shop with smart tools — analytics, messaging, discounts, and order management. All in one dashboard.
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-4 mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <button
              onClick={() => router.push('/register')}
              className="px-8 py-4 bg-[#006d43] hover:bg-[#00a86b] text-white rounded-xl font-bold text-lg transition-all hover:shadow-2xl hover:shadow-green-900/60 hover:scale-105 flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Sign In
            </button>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            className="relative max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {/* Glow behind mockup */}
            <div className="absolute inset-0 bg-[#006d43]/20 blur-3xl rounded-3xl" />

            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="relative rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0d2016 0%, #0a1a10 100%)' }}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="text-xs text-white/30 font-medium">Profix Dashboard</div>
                <div className="w-16" />
              </div>

              {/* KPI Cards */}
              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Revenue', value: '₪45,280', change: '+24%' },
                    { label: 'Orders', value: '1,234', change: '+18%' },
                    { label: 'Customers', value: '890', change: '+15%' },
                    { label: 'Shop Views', value: '7,691', change: '+31%' },
                  ].map((kpi, i) => (
                    <motion.div
                      key={i}
                      className="p-4 rounded-xl border border-white/5"
                      style={{ background: 'rgba(0,109,67,0.1)' }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                    >
                      <div className="text-xs text-white/40 mb-1">{kpi.label}</div>
                      <div className="text-xl font-bold text-white">{kpi.value}</div>
                      <div className="text-xs text-[#00e87a] font-semibold mt-1">{kpi.change}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Chart */}
                <div className="rounded-xl border border-white/5 p-4" style={{ background: 'rgba(0,109,67,0.05)' }}>
                  <div className="text-xs text-white/30 mb-3">Sales Trend — Last 30 Days</div>
                  <svg className="w-full" height="80" viewBox="0 0 600 80">
                    <defs>
                      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#006d43" />
                        <stop offset="100%" stopColor="#00e87a" />
                      </linearGradient>
                      <linearGradient id="fillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#006d43" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#006d43" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M0 65 C50 55, 80 45, 120 40 S200 20, 240 18 S330 30, 370 22 S470 8, 600 5"
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 2, delay: 1 }}
                    />
                    <motion.path
                      d="M0 65 C50 55, 80 45, 120 40 S200 20, 240 18 S330 30, 370 22 S470 8, 600 5 L600 80 L0 80 Z"
                      fill="url(#fillGrad)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 2, delay: 1.2 }}
                    />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Floating badges */}
            <motion.div
              className="absolute -top-5 -right-5 flex items-center gap-2 px-4 py-3 bg-[#006d43] rounded-xl shadow-2xl shadow-green-900/50"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-sm">+24% Revenue</span>
            </motion.div>
            <motion.div
              className="absolute -bottom-5 -left-5 flex items-center gap-2 px-4 py-3 bg-[#0d2016] border border-[#006d43]/40 rounded-xl shadow-2xl"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <Zap className="w-5 h-5 text-[#00e87a]" />
              <span className="text-white font-semibold text-sm">Auto-sync active</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Counter */}
      <section id="stats" className="relative z-10 py-24 px-8 border-y border-white/5" style={{ background: 'rgba(0,109,67,0.05)' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
          >
            {stats.map((s, i) => (
              <motion.div key={i} variants={fadeInUp} className="text-center">
                <div className="text-5xl font-black text-white mb-2">
                  <Counter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-white/50 text-sm font-medium">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <h2 className="text-5xl font-black mb-4">
              Everything You Need to
              <span style={{ background: 'linear-gradient(135deg, #00e87a, #006d43)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> Dominate Etsy</span>
            </h2>
            <p className="text-white/50 text-xl max-w-2xl mx-auto">
              Powerful tools built for serious Etsy sellers who want to grow faster.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group p-6 rounded-2xl border border-white/5 hover:border-[#006d43]/50 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0d2016 0%, #0a1a10 100%)' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}
                >
                  <f.icon className="w-6 h-6" style={{ color: '#00e87a' }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Use Cases — Two Column */}
      <section className="relative z-10 py-24 px-8" style={{ background: 'rgba(0,109,67,0.04)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#006d43]/20 border border-[#006d43]/30 rounded-full text-[#00e87a] text-sm font-medium mb-6">
                <Users className="w-4 h-4" />
                Multi-Shop Support
              </div>
              <h2 className="text-4xl font-black text-white mb-6 leading-tight">
                One Platform.<br />All Your Shops.
              </h2>
              <p className="text-white/50 text-lg mb-8 leading-relaxed">
                Whether you manage one Etsy shop or twenty, Profix scales with your business. Invite your team, assign roles, and keep everything organized.
              </p>
              <ul className="space-y-3">
                {[
                  'Unified analytics across all your shops',
                  'Role-based team access (Owner, Admin, Employee)',
                  'Real-time Etsy order sync',
                  'Cross-shop financial reporting'
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#006d43]/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00e87a]" />
                    </div>
                    <span className="text-white/70 text-sm">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-3"
            >
              {[
                { name: 'FigurineeHaven', orders: 342, revenue: '₪4,471', status: 'active' },
                { name: 'CoreBags', orders: 89, revenue: '₪655', status: 'active' },
                { name: 'New Shop', orders: 0, revenue: '₪0', status: 'connecting' },
              ].map((shop, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/5"
                  style={{ background: 'linear-gradient(135deg, #0d2016 0%, #0a1a10 100%)' }}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#006d43]/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-[#00e87a]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">{shop.name}</div>
                    <div className="text-white/40 text-xs">{shop.orders} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#00e87a] font-bold text-sm">{shop.revenue}</div>
                    <div className={`text-xs font-medium ${shop.status === 'active' ? 'text-[#00e87a]' : 'text-yellow-400'}`}>
                      {shop.status}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <h2 className="text-4xl font-black text-white mb-4">Trusted by Etsy Sellers</h2>
            <p className="text-white/50">Real results from real sellers</p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { quote: "Profix saved me 10+ hours a week. The automation is insane — my messages are handled, discounts run themselves.", author: "Sarah J.", role: "Jewelry Shop Owner", rating: 5 },
              { quote: "Managing 3 Etsy shops was a nightmare before. Now I see everything in one dashboard and my revenue is up 40%.", author: "Michael C.", role: "Print-on-Demand Seller", rating: 5 },
              { quote: "The analytics alone are worth it. I finally understand which products drive profit and which don't.", author: "Emma R.", role: "Handmade Crafts", rating: 5 }
            ].map((t, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
                className="p-6 rounded-2xl border border-white/5"
                style={{ background: 'linear-gradient(135deg, #0d2016 0%, #0a1a10 100%)' }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#00e87a] text-[#00e87a]" />
                  ))}
                </div>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#006d43] flex items-center justify-center text-white font-bold text-sm">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.author}</div>
                    <div className="text-white/40 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-24 px-8" style={{ background: 'rgba(0,109,67,0.04)' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <h2 className="text-5xl font-black text-white mb-4">Simple Pricing</h2>
            <p className="text-white/50 text-xl">Start free. Scale as you grow.</p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-4 gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { name: 'Starter', price: 'Free', period: 'forever', features: ['1 Etsy Shop', '50 Products', 'Basic Analytics', 'Email Support'], hot: false },
              { name: 'Pro', price: '$29', period: '/month', features: ['3 Shops', '500 Products', 'Team Access', 'Advanced Analytics', 'Priority Support'], hot: false },
              { name: 'Business', price: '$79', period: '/month', features: ['10 Shops', 'Unlimited Products', 'Full Automation', 'White-label', '24/7 Support'], hot: true },
              { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Shops', 'Custom Integrations', 'Dedicated Manager', 'SLA Guarantee'], hot: false },
            ].map((plan, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -10, scale: 1.02 }}
                className={`relative p-7 rounded-2xl border transition-all ${
                  plan.hot
                    ? 'border-[#006d43] shadow-2xl shadow-green-900/40'
                    : 'border-white/5 hover:border-[#006d43]/30'
                }`}
                style={{
                  background: plan.hot
                    ? 'linear-gradient(135deg, #006d43 0%, #004d2e 100%)'
                    : 'linear-gradient(135deg, #0d2016 0%, #0a1a10 100%)'
                }}
              >
                {plan.hot && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#00e87a] text-[#003d25] text-xs font-black rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-black text-white mb-1">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className={`text-sm ${plan.hot ? 'text-white/70' : 'text-white/40'}`}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.hot ? 'text-[#00e87a]' : 'text-[#006d43]'}`} />
                      <span className={plan.hot ? 'text-white/80' : 'text-white/50'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/register')}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.hot
                      ? 'bg-white text-[#006d43] hover:bg-white/90'
                      : 'bg-[#006d43]/20 hover:bg-[#006d43]/40 text-white border border-[#006d43]/30'
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-3xl mx-auto">
          <motion.h2 className="text-4xl font-black text-white mb-12 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            FAQ
          </motion.h2>
          <div className="space-y-3">
            {[
              { q: 'Can I manage multiple Etsy shops?', a: 'Yes! Connect unlimited shops and manage them all from one dashboard with unified analytics and team access.' },
              { q: 'Is my Etsy data secure?', a: 'We use AES-256 encryption for all OAuth tokens. Your credentials are never stored in plain text.' },
              { q: 'Do I need a credit card to start?', a: 'No. The Starter plan is free forever. Upgrade only when you\'re ready.' },
            ].map((faq, i) => (
              <motion.div
                key={i}
                className="rounded-xl border border-white/5 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0d2016 0%, #0a1a10 100%)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-white text-sm">{faq.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? 'auto' : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 text-white/50 text-sm leading-relaxed">{faq.a}</div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-32 px-8">
        <motion.div
          className="max-w-4xl mx-auto text-center p-16 rounded-3xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #006d43 0%, #004d2e 100%)' }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
              backgroundSize: '30px 30px'
            }}
          />
          <div className="relative z-10">
            <h2 className="text-5xl font-black text-white mb-6">
              Ready to Scale?
            </h2>
            <p className="text-white/70 text-xl mb-10 max-w-xl mx-auto">
              Join thousands of Etsy sellers using Profix to automate, analyze, and grow.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => router.push('/register')}
                className="px-8 py-4 bg-white text-[#006d43] rounded-xl font-black text-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden p-0.5">
                  <img src="/logo-icon.png" alt="Profix" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-white">Profix</span>
              </div>
              <p className="text-white/40 text-sm">Smart automation for modern Etsy sellers.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm">Support</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="mailto:support@profix-ai.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 text-center text-sm text-white/20">
            © 2026 Profix. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
