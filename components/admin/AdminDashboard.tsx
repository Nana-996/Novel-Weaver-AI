import React, { useState, useEffect, useMemo } from 'react';
import type { UserProfile } from '../../services/authService';
import {
  isSessionAdminUnlocked,
  unlockAdminSession,
  lockAdminSession,
  getAdminPasscode,
  setCustomAdminPasscode,
} from '../../services/authService';
import {
  getAdminMetrics,
  getAdminSystemHealth,
  getRevenueTrends,
  getAdminTransactions,
  getAdminUsers,
  updateUserTier,
  grantUserBonusMessages,
  updateUserRole,
  createPromotion,
  togglePromotionStatus,
  togglePromotionBanner,
  deletePromotion,
} from '../../services/adminService';
import type {
  AdminMetrics,
  AdminSystemHealth,
  AdminTransaction,
  AdminUserRecord,
  RevenueTrendPoint,
} from '../../services/adminService';
import type { Promotion, DiscountType } from '../../services/promotionService';
import { getStoredLocalPromotions } from '../../services/promotionService';
import {
  XIcon,
  CrownIcon,
  ChartBarIcon,
  BanknotesIcon,
  UsersGroupIcon,
  TagIcon,
  SlidersIcon,
  DatabaseIcon,
  CpuChipIcon,
  CreditCardIcon,
  MegaphoneIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  LightningBoltIcon,
  DiamondIcon,
  BookStackIcon,
  RefreshIcon,
  TrashIcon,
  PlusIcon,
  LockClosedIcon,
  LockOpenIcon,
  ShieldCrownIcon,
} from '../Icons';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

type TabType = 'overview' | 'earnings' | 'users' | 'promotions' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, currentUser }) => {
  // Security Gate State
  const [isUnlocked, setIsUnlocked] = useState(isSessionAdminUnlocked());
  const [passcodeAttempt, setPasscodeAttempt] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);

  // Tabs & Data State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [trends, setTrends] = useState<RevenueTrendPoint[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<7 | 30>(7);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userTierFilter, setUserTierFilter] = useState<string>('all');
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');

  // Modals inside Admin
  const [isCreatePromoOpen, setIsCreatePromoOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUserRecord | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New promo form state
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoTitle, setNewPromoTitle] = useState('');
  const [newPromoDesc, setNewPromoDesc] = useState('');
  const [newPromoType, setNewPromoType] = useState<DiscountType>('percentage');
  const [newPromoValue, setNewPromoValue] = useState<number>(20);
  const [newPromoAppliesTo, setNewPromoAppliesTo] = useState<'all' | 'writer' | 'novelist' | 'topup'>('all');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<string>('');
  const [newPromoDaysValid, setNewPromoDaysValid] = useState<number>(30);
  const [newPromoBannerActive, setNewPromoBannerActive] = useState(false);
  const [newPromoBannerText, setNewPromoBannerText] = useState('');

  // User edit form state
  const [editTier, setEditTier] = useState<'free' | 'writer' | 'novelist'>('free');
  const [editBonusAdd, setEditBonusAdd] = useState<number>(50);
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');

  // Change master passcode in settings
  const [newPasscodeSetting, setNewPasscodeSetting] = useState('');
  const [passcodeUpdateMsg, setPasscodeUpdateMsg] = useState<string | null>(null);

  // Global escape key listener to cleanly exit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync unlock status when opened
  useEffect(() => {
    if (isOpen) {
      setIsUnlocked(isSessionAdminUnlocked());
      setPasscodeAttempt('');
      setPasscodeError(null);
    }
  }, [isOpen]);

  const refreshData = async () => {
    if (!isSessionAdminUnlocked()) return;
    setIsLoading(true);
    try {
      const [m, h, txs, uList, pList] = await Promise.all([
        getAdminMetrics(),
        getAdminSystemHealth(),
        getAdminTransactions(),
        getAdminUsers(),
        Promise.resolve(getStoredLocalPromotions()),
      ]);
      setMetrics(m);
      setHealth(h);
      setTransactions(txs);
      setUsers(uList);
      setPromotions(pList);
      setTrends(getRevenueTrends(timeframe));
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isUnlocked) {
      refreshData();
    }
  }, [isOpen, isUnlocked, timeframe]);

  // Flash message timeout
  useEffect(() => {
    if (actionSuccessMsg) {
      const timer = setTimeout(() => setActionSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMsg]);

  // Handle Security Gate Passcode Submit
  const handlePasscodeUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);

    const success = unlockAdminSession(passcodeAttempt);
    if (success) {
      setPasscodeSuccess(true);
      setTimeout(() => {
        setIsUnlocked(true);
        setPasscodeSuccess(false);
        refreshData();
      }, 300);
    } else {
      setPasscodeError('Invalid Admin Passcode. Access denied.');
    }
  };

  const handleLockAndExit = () => {
    lockAdminSession();
    setIsUnlocked(false);
    onClose();
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.displayName.toLowerCase().includes(userSearch.toLowerCase());
      const matchesTier = userTierFilter === 'all' || u.tier === userTierFilter;
      return matchesSearch && matchesTier;
    });
  }, [users, userSearch, userTierFilter]);

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch =
        t.reference.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.userEmail.toLowerCase().includes(txSearch.toLowerCase()) ||
        (t.promoCode && t.promoCode.toLowerCase().includes(txSearch.toLowerCase()));
      const matchesType = txTypeFilter === 'all' || t.type === txTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, txSearch, txTypeFilter]);

  if (!isOpen) return null;

  // Handle create promo submit
  const handleCreatePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode || !newPromoTitle) return;

    const expiry = new Date(Date.now() + newPromoDaysValid * 86400000).toISOString();
    await createPromotion({
      code: newPromoCode,
      title: newPromoTitle,
      description: newPromoDesc,
      discountType: newPromoType,
      discountValue: Number(newPromoValue),
      appliesTo: newPromoAppliesTo,
      maxUses: newPromoMaxUses ? Number(newPromoMaxUses) : null,
      validFrom: new Date().toISOString(),
      validUntil: expiry,
      isActive: true,
      bannerActive: newPromoBannerActive,
      bannerText: newPromoBannerText || (newPromoBannerActive ? `Special Offer: Use code ${newPromoCode.toUpperCase()} for a discount!` : ''),
    });

    setIsCreatePromoOpen(false);
    setNewPromoCode('');
    setNewPromoTitle('');
    setNewPromoDesc('');
    setNewPromoBannerText('');
    setNewPromoBannerActive(false);
    setActionSuccessMsg(`Promotion code "${newPromoCode.toUpperCase()}" created successfully.`);
    refreshData();
  };

  // Handle user edit submit
  const handleSaveUserEdit = async () => {
    if (!selectedUserForEdit) return;

    if (editTier !== selectedUserForEdit.tier) {
      await updateUserTier(selectedUserForEdit.id, editTier);
    }
    if (editBonusAdd > 0) {
      await grantUserBonusMessages(selectedUserForEdit.id, editBonusAdd);
    }
    if (editRole !== selectedUserForEdit.role) {
      await updateUserRole(selectedUserForEdit.id, editRole);
    }

    setSelectedUserForEdit(null);
    setActionSuccessMsg(`Author profile for ${selectedUserForEdit.email} updated.`);
    refreshData();
  };

  // Export transactions to CSV
  const handleExportCSV = () => {
    if (filteredTxs.length === 0) return;
    const headers = ['ID', 'User Email', 'Reference', 'Amount (GHS)', 'Plan', 'Type', 'Promo Code', 'Discount (GHS)', 'Status', 'Date'];
    const rows = filteredTxs.map(t => [
      t.id,
      t.userEmail,
      t.reference,
      t.amount,
      t.tier,
      t.type,
      t.promoCode || 'None',
      t.discountAmount || 0,
      t.status,
      new Date(t.createdAt).toLocaleString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `novel_weaver_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========================================================
  // SECURITY GATE LOCK SCREEN (When Passcode is Required)
  // ========================================================
  if (!isUnlocked) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="bg-ink w-full max-w-md rounded-2xl border border-warm/30 shadow-2xl p-6 sm:p-8 relative overlay-content-enter font-sans"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Exit Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-parchment-faint hover:text-parchment hover:bg-ink-200/60 rounded-xl transition-colors"
            title="Exit (Esc)"
          >
            <XIcon className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-warm/10 border border-warm/30 flex items-center justify-center mx-auto mb-3 text-warm">
              <ShieldCrownIcon className="w-7 h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-parchment tracking-tight">
              Admin Security Verification
            </h2>
            <p className="text-xs text-parchment-faint mt-1">
              Restricted Area • Enter Master Passcode to Access
            </p>
          </div>

          <form onSubmit={handlePasscodeUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-parchment mb-1.5">
                Admin Master Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  required
                  placeholder="Enter passcode..."
                  value={passcodeAttempt}
                  onChange={e => setPasscodeAttempt(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-ink-100 border border-ink-400/25 text-parchment placeholder:text-parchment-faint/40 focus:outline-none focus:border-warm tracking-wider"
                />
                <span className="absolute right-3 top-2.5 text-parchment-faint text-xs">
                  <LockClosedIcon className="w-4 h-4" />
                </span>
              </div>
            </div>

            {passcodeError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-1.5 animate-shake">
                <span>✕</span> {passcodeError}
              </div>
            )}

            {passcodeSuccess && (
              <div className="p-2.5 rounded-xl bg-sage/10 border border-sage/20 text-sage text-xs font-medium flex items-center gap-1.5 animate-fade-in">
                <CheckCircleIcon className="w-4 h-4" /> Access Granted. Unlocking...
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-ink-200 hover:bg-ink-300 text-parchment-dim text-xs font-semibold transition-colors"
              >
                Exit / Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-warm hover:bg-warm-light text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <LockOpenIcon className="w-3.5 h-3.5" />
                <span>Authenticate</span>
              </button>
            </div>
          </form>

          <p className="text-[10px] text-center text-parchment-faint mt-4">
            Default Passcode: <code className="text-warm font-mono">weaver@admin2026</code> (Can be customized in Settings)
          </p>
        </div>
      </div>
    );
  }

  // ========================================================
  // AUTHENTICATED ADMIN DASHBOARD
  // ========================================================
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div 
        className="relative w-full max-w-6xl h-[94vh] flex flex-col bg-ink rounded-2xl border border-ink-400/20 shadow-2xl overflow-hidden overlay-content-enter"
        onClick={e => e.stopPropagation()}
      >
        
        {/* ===== TOP HEADER ===== */}
        <header className="px-5 py-3.5 border-b border-ink-400/10 bg-ink-50/70 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-warm/10 border border-warm/30 flex items-center justify-center text-warm">
              <CrownIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-display font-semibold text-parchment">
                  Admin Intelligence & Operations
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sage/10 text-sage border border-sage/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
                  Authenticated Session
                </span>
              </div>
              <p className="text-[11px] text-parchment-faint hidden sm:block">
                Novel Weaver AI • Real-time Application, Revenue & Promotions Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshData}
              disabled={isLoading}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs text-parchment-dim hover:text-parchment hover:bg-ink-200/50 rounded-xl transition-colors flex items-center gap-1.5 border border-ink-400/10"
              title="Refresh Data"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Lock Session Button */}
            <button
              type="button"
              onClick={handleLockAndExit}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-ink-200/60 hover:bg-red-500/15 text-parchment-dim hover:text-red-500 border border-ink-400/15 transition-all flex items-center gap-1.5"
              title="Lock Admin Session & Exit"
            >
              <LockClosedIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock & Exit</span>
            </button>

            {/* Exit Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-white bg-warm hover:bg-warm-light rounded-xl transition-all flex items-center gap-1 shadow-sm"
              title="Close Admin Panel (Esc)"
            >
              <XIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </header>

        {/* Success Alert Banner */}
        {actionSuccessMsg && (
          <div className="bg-sage/10 border-b border-sage/20 px-4 py-2 flex items-center justify-between animate-fade-in text-xs text-sage font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-sage" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button type="button" onClick={() => setActionSuccessMsg(null)} className="text-sage/70 hover:text-sage">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ===== NAVIGATION TABS ===== */}
        <nav 
          aria-label="Admin tabs"
          className="flex items-center gap-1 px-4 sm:px-6 border-b border-ink-400/10 bg-ink-100/40 overflow-x-auto no-scrollbar flex-shrink-0"
        >
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-warm text-warm bg-warm/[0.04]'
                : 'border-transparent text-parchment-faint hover:text-parchment hover:border-ink-400/20'
            }`}
          >
            <ChartBarIcon className="w-4 h-4" /> Pulse & Health
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('earnings')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'earnings'
                ? 'border-warm text-warm bg-warm/[0.04]'
                : 'border-transparent text-parchment-faint hover:text-parchment hover:border-ink-400/20'
            }`}
          >
            <BanknotesIcon className="w-4 h-4" /> Earnings & Revenue
            {metrics && metrics.totalGrossRevenueGHS > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-warm/10 text-warm font-semibold">
                GHS {metrics.totalGrossRevenueGHS}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-warm text-warm bg-warm/[0.04]'
                : 'border-transparent text-parchment-faint hover:text-parchment hover:border-ink-400/20'
            }`}
          >
            <UsersGroupIcon className="w-4 h-4" /> Authors & Usage
            {users.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-ink-200 text-parchment-dim font-medium">
                {users.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('promotions')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'promotions'
                ? 'border-warm text-warm bg-warm/[0.04]'
                : 'border-transparent text-parchment-faint hover:text-parchment hover:border-ink-400/20'
            }`}
          >
            <TagIcon className="w-4 h-4" /> Special Promotions
            {promotions.filter(p => p.isActive).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-700 font-semibold">
                {promotions.filter(p => p.isActive).length} active
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-warm text-warm bg-warm/[0.04]'
                : 'border-transparent text-parchment-faint hover:text-parchment hover:border-ink-400/20'
            }`}
          >
            <SlidersIcon className="w-4 h-4" /> System & Security
          </button>
        </nav>

        {/* ===== TAB CONTENT CONTAINER ===== */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW / PULSE */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Primary KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-ink-100/60 rounded-xl p-4 border border-ink-400/15 relative overflow-hidden group hover:border-warm/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-parchment-faint uppercase tracking-wider">Gross Revenue</span>
                    <BanknotesIcon className="w-5 h-5 text-warm/70" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-display text-parchment">
                    GHS {metrics?.totalGrossRevenueGHS.toLocaleString() || '0'}
                  </div>
                  <div className="text-[11px] text-sage font-medium mt-1 flex items-center gap-1">
                    <span>MRR: GHS {metrics?.monthlyRecurringRevenueGHS || 0}/mo</span>
                  </div>
                </div>

                <div className="bg-ink-100/60 rounded-xl p-4 border border-ink-400/15 relative overflow-hidden group hover:border-warm/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-parchment-faint uppercase tracking-wider">Paid Subscribers</span>
                    <DiamondIcon className="w-5 h-5 text-amber-600/70" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-display text-parchment">
                    {metrics?.activeSubscribers || 0}
                  </div>
                  <div className="text-[11px] text-parchment-dim mt-1">
                    {metrics?.novelistSubscribers || 0} Novelist • {metrics?.writerSubscribers || 0} Writer
                  </div>
                </div>

                <div className="bg-ink-100/60 rounded-xl p-4 border border-ink-400/15 relative overflow-hidden group hover:border-warm/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-parchment-faint uppercase tracking-wider">Total Words Written</span>
                    <BookStackIcon className="w-5 h-5 text-parchment-dim/70" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-display text-parchment">
                    {(metrics?.totalWordsWritten || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-parchment-dim mt-1">
                    Across {metrics?.totalProjects || 0} active stories
                  </div>
                </div>

                <div className="bg-ink-100/60 rounded-xl p-4 border border-ink-400/15 relative overflow-hidden group hover:border-warm/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-parchment-faint uppercase tracking-wider">Messages Today</span>
                    <LightningBoltIcon className="w-5 h-5 text-warm/70" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-display text-warm">
                    {metrics?.messagesTodayTotal || 0}
                  </div>
                  <div className="text-[11px] text-parchment-dim mt-1">
                    {metrics?.totalUsers || 0} registered authors
                  </div>
                </div>
              </div>

              {/* Chart & Health Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Growth Trend Chart */}
                <div className="lg:col-span-2 bg-ink-100/40 rounded-2xl p-5 border border-ink-400/15">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-parchment">Revenue & Growth Velocity</h3>
                      <p className="text-xs text-parchment-faint">Daily earnings run-rate</p>
                    </div>
                    <div className="flex items-center gap-1 bg-ink-200/50 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTimeframe(7)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                          timeframe === 7 ? 'bg-warm text-white shadow-sm' : 'text-parchment-faint hover:text-parchment'
                        }`}
                      >
                        7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeframe(30)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                          timeframe === 30 ? 'bg-warm text-white shadow-sm' : 'text-parchment-faint hover:text-parchment'
                        }`}
                      >
                        30 Days
                      </button>
                    </div>
                  </div>

                  <div className="h-44 w-full flex items-end gap-2 pt-6 pb-2 px-2 border-b border-ink-400/10">
                    {trends.map((t, idx) => {
                      const maxVal = Math.max(...trends.map(x => x.revenue), 100);
                      const heightPercent = Math.max(15, Math.round((t.revenue / maxVal) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 bg-ink-400 text-white text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            GHS {t.revenue} • {t.messages} msgs
                          </div>
                          <div
                            className="w-full bg-gradient-to-t from-warm to-warm-light rounded-t-md transition-all group-hover:brightness-110"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-[10px] text-parchment-faint truncate max-w-full">{t.date.split(' ')[1] || t.date}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-parchment-faint mt-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-warm" /> Daily Revenue (GHS)
                    </span>
                    <span>Average Daily Run-rate: GHS {Math.round((metrics?.totalGrossRevenueGHS || 0) / (timeframe === 7 ? 7 : 30))}</span>
                  </div>
                </div>

                {/* System Health Monitor */}
                <div className="bg-ink-100/40 rounded-2xl p-5 border border-ink-400/15 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-parchment mb-1">System Health Status</h3>
                    <p className="text-xs text-parchment-faint mb-4">Core services operational checks</p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-ink-200/40 border border-ink-400/10">
                        <div className="flex items-center gap-2.5">
                          <DatabaseIcon className="w-5 h-5 text-parchment-dim" />
                          <div>
                            <p className="text-xs font-medium text-parchment">Database (Supabase)</p>
                            <p className="text-[10px] text-parchment-faint">User profiles, stories, usage</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          health?.database === 'healthy' ? 'bg-sage/10 text-sage' : 'bg-amber-500/10 text-amber-700'
                        }`}>
                          {health?.database === 'healthy' ? 'Operational' : 'Simulated'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-ink-200/40 border border-ink-400/10">
                        <div className="flex items-center gap-2.5">
                          <CpuChipIcon className="w-5 h-5 text-warm" />
                          <div>
                            <p className="text-xs font-medium text-parchment">AI Router Gateway</p>
                            <p className="text-[10px] text-parchment-faint">Opus 4.8 / Claude 3.7 / GPT-4o</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage/10 text-sage">
                          Operational
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-ink-200/40 border border-ink-400/10">
                        <div className="flex items-center gap-2.5">
                          <CreditCardIcon className="w-5 h-5 text-parchment-dim" />
                          <div>
                            <p className="text-xs font-medium text-parchment">Paystack Checkout</p>
                            <p className="text-[10px] text-parchment-faint">GHS Pesewas Gateway</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage/10 text-sage">
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-ink-400/10 mt-4 flex items-center justify-between text-[11px] text-parchment-faint">
                    <span>Uptime: {health?.uptimePercent}%</span>
                    <span>Status: Verified</span>
                  </div>
                </div>
              </div>

              {/* Promotions Engine Overview */}
              <div className="bg-gradient-to-r from-warm/[0.08] to-amber-500/[0.05] rounded-2xl p-5 border border-warm/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-parchment flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-warm" />
                    Special Promotion Engine
                  </h4>
                  <p className="text-xs text-parchment-dim mt-0.5">
                    {metrics?.activePromotionsCount || 0} promotions active. {metrics?.totalPromoRedemptions || 0} customer redemptions giving GHS {metrics?.totalPromoDiscountsGivenGHS || 0} in discount value.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setActiveTab('promotions'); setIsCreatePromoOpen(true); }}
                  className="whitespace-nowrap px-4 py-2 rounded-xl bg-warm hover:bg-warm-light text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Create Promotion</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: EARNINGS & FINANCIALS */}
          {/* ======================================================== */}
          {activeTab === 'earnings' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-ink-100/60 p-4 rounded-xl border border-ink-400/15">
                  <span className="text-xs text-parchment-faint uppercase font-medium">Novelist Tier (GHS 50/mo)</span>
                  <div className="text-xl font-bold font-display text-parchment mt-1">
                    GHS {((metrics?.novelistSubscribers || 0) * 50).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-parchment-dim mt-0.5">{metrics?.novelistSubscribers || 0} active subscriptions</p>
                </div>

                <div className="bg-ink-100/60 p-4 rounded-xl border border-ink-400/15">
                  <span className="text-xs text-parchment-faint uppercase font-medium">Writer Tier (GHS 20/mo)</span>
                  <div className="text-xl font-bold font-display text-parchment mt-1">
                    GHS {((metrics?.writerSubscribers || 0) * 20).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-parchment-dim mt-0.5">{metrics?.writerSubscribers || 0} active subscriptions</p>
                </div>

                <div className="bg-ink-100/60 p-4 rounded-xl border border-ink-400/15">
                  <span className="text-xs text-parchment-faint uppercase font-medium">Message Boost Top-Ups</span>
                  <div className="text-xl font-bold font-display text-parchment mt-1">
                    GHS {(metrics?.topupRevenueGHS || 0).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-parchment-dim mt-0.5">One-off 50-message boosts (GHS 10)</p>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="bg-ink-100/40 rounded-2xl border border-ink-400/15 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-parchment">Transaction History & Ledger</h3>
                    <p className="text-xs text-parchment-faint">Real-time payment records and promo attribution</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search email, ref, promo..."
                      value={txSearch}
                      onChange={e => setTxSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-ink-200/50 border border-ink-400/15 text-parchment placeholder:text-parchment-faint focus:outline-none focus:border-warm/50"
                    />
                    <select
                      value={txTypeFilter}
                      onChange={e => setTxTypeFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-ink-200/50 border border-ink-400/15 text-parchment focus:outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="subscription">Subscriptions</option>
                      <option value="topup">Top-Ups</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={filteredTxs.length === 0}
                      className="px-3 py-1.5 text-xs rounded-xl bg-ink-200 hover:bg-ink-300 text-parchment font-medium transition-colors whitespace-nowrap border border-ink-400/15 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink-400/10 text-parchment-faint text-[11px]">
                        <th className="pb-2 font-medium">Reference</th>
                        <th className="pb-2 font-medium">Customer Email</th>
                        <th className="pb-2 font-medium">Plan / Item</th>
                        <th className="pb-2 font-medium">Amount</th>
                        <th className="pb-2 font-medium">Promo Code</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-400/5 text-parchment-dim">
                      {filteredTxs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-parchment-faint">
                            <p className="text-sm font-medium text-parchment-dim">No transactions recorded yet</p>
                            <p className="text-xs text-parchment-faint mt-1">
                              Transactions will automatically appear here as soon as payments are completed via Paystack.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredTxs.map(t => (
                          <tr key={t.id} className="hover:bg-ink-200/30 transition-colors">
                            <td className="py-2.5 font-mono text-[11px] text-parchment font-medium">{t.reference}</td>
                            <td className="py-2.5">{t.userEmail}</td>
                            <td className="py-2.5 capitalize">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-ink-200 border border-ink-400/10 font-medium">
                                {t.tier}
                              </span>
                            </td>
                            <td className="py-2.5 font-semibold text-parchment">GHS {t.amount}</td>
                            <td className="py-2.5">
                              {t.promoCode ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 font-bold">
                                  {t.promoCode} (-GHS {t.discountAmount})
                                </span>
                              ) : (
                                <span className="text-parchment-faint/50">—</span>
                              )}
                            </td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sage/10 text-sage font-medium flex items-center gap-1 w-fit">
                                <CheckCircleIcon className="w-3 h-3" />
                                <span>{t.status}</span>
                              </span>
                            </td>
                            <td className="py-2.5 text-parchment-faint text-[11px]">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: USER MANAGEMENT & MONITORING */}
          {/* ======================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-ink-100/40 rounded-2xl border border-ink-400/15 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-parchment">Author Directory & Usage Monitor</h3>
                    <p className="text-xs text-parchment-faint">Inspect author activity, adjust tiers, grant bonus message packs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search by email or name..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-ink-200/50 border border-ink-400/15 text-parchment placeholder:text-parchment-faint focus:outline-none"
                    />
                    <select
                      value={userTierFilter}
                      onChange={e => setUserTierFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-ink-200/50 border border-ink-400/15 text-parchment focus:outline-none"
                    >
                      <option value="all">All Tiers</option>
                      <option value="free">Free Authors</option>
                      <option value="writer">Writer</option>
                      <option value="novelist">Novelist</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink-400/10 text-parchment-faint text-[11px]">
                        <th className="pb-2 font-medium">Author</th>
                        <th className="pb-2 font-medium">Tier & Role</th>
                        <th className="pb-2 font-medium">Today's Usage</th>
                        <th className="pb-2 font-medium">Bonus Credits</th>
                        <th className="pb-2 font-medium">Stories</th>
                        <th className="pb-2 font-medium">Words</th>
                        <th className="pb-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-400/5 text-parchment-dim">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-parchment-faint">
                            <p className="text-sm font-medium text-parchment-dim">No users found</p>
                            <p className="text-xs text-parchment-faint mt-1">
                              Registered user accounts from your database will be listed here.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-ink-200/30 transition-colors">
                            <td className="py-3">
                              <p className="font-medium text-parchment">{u.displayName}</p>
                              <p className="text-[11px] text-parchment-faint">{u.email}</p>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  u.tier === 'novelist' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' :
                                  u.tier === 'writer' ? 'bg-warm/10 text-warm border-warm/20' :
                                  'bg-ink-200 text-parchment-dim border-ink-400/10'
                                }`}>
                                  {u.tier.toUpperCase()}
                                </span>
                                {u.role === 'admin' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-500/10 text-red-600 font-bold border border-red-500/20">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="font-medium">{u.messagesUsedToday}</span> msgs
                            </td>
                            <td className="py-3">
                              {u.bonusMessages > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sage/10 text-sage font-semibold">
                                  +{u.bonusMessages}
                                </span>
                              ) : (
                                <span className="text-parchment-faint/50">0</span>
                              )}
                            </td>
                            <td className="py-3">{u.projectsCount}</td>
                            <td className="py-3">{u.totalWordCount.toLocaleString()}</td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForEdit(u);
                                  setEditTier(u.tier);
                                  setEditRole(u.role);
                                  setEditBonusAdd(50);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-ink-200 hover:bg-warm hover:text-white text-[11px] font-medium transition-all"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SPECIAL PROMOTIONS & CUSTOMER OFFERS */}
          {/* ======================================================== */}
          {activeTab === 'promotions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-parchment">Customer Promotions & Discount Codes</h3>
                  <p className="text-xs text-parchment-faint">Manage coupon codes, free message grants, and customer announcement banners</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatePromoOpen(true)}
                  className="px-4 py-2 rounded-xl bg-warm hover:bg-warm-light text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Promotion</span>
                </button>
              </div>

              {/* Promotions Table */}
              <div className="bg-ink-100/40 rounded-2xl border border-ink-400/15 p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink-400/10 text-parchment-faint text-[11px]">
                        <th className="pb-2 font-medium">Promo Code</th>
                        <th className="pb-2 font-medium">Offer Title</th>
                        <th className="pb-2 font-medium">Discount / Reward</th>
                        <th className="pb-2 font-medium">Applies To</th>
                        <th className="pb-2 font-medium">Usage & Limit</th>
                        <th className="pb-2 font-medium">Banner Broadcast</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-400/5 text-parchment-dim">
                      {promotions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-parchment-faint">
                            <p className="text-sm font-medium text-parchment-dim">No promotion campaigns active</p>
                            <p className="text-xs text-parchment-faint mt-1">
                              Click "+ Create Promotion" above to launch discount codes or free message boosts for authors.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        promotions.map(p => (
                          <tr key={p.id} className="hover:bg-ink-200/30 transition-colors">
                            <td className="py-3">
                              <span className="font-mono px-2.5 py-1 rounded-lg bg-warm/10 text-warm font-bold border border-warm/20 text-xs">
                                {p.code}
                              </span>
                            </td>
                            <td className="py-3">
                              <p className="font-medium text-parchment">{p.title}</p>
                              {p.description && <p className="text-[10px] text-parchment-faint line-clamp-1">{p.description}</p>}
                            </td>
                            <td className="py-3 font-semibold text-parchment">
                              {p.discountType === 'percentage' && `${p.discountValue}% OFF`}
                              {p.discountType === 'fixed_amount' && `GHS ${p.discountValue} OFF`}
                              {p.discountType === 'free_bonus_messages' && `+${p.discountValue} Free Messages`}
                              {p.discountType === 'free_tier_days' && `${p.discountValue} Days Free Tier`}
                            </td>
                            <td className="py-3 capitalize">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-ink-200 text-parchment-dim font-medium">
                                {p.appliesTo}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="font-medium text-parchment">{p.currentUses}</span>
                              <span className="text-parchment-faint"> / {p.maxUses === null ? '∞' : p.maxUses}</span>
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  await togglePromotionBanner(p.id, !p.bannerActive, p.bannerText);
                                  refreshData();
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                                  p.bannerActive
                                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                    : 'bg-ink-200/50 text-parchment-faint border-ink-400/10 hover:border-ink-400/30'
                                }`}
                              >
                                <MegaphoneIcon className="w-3 h-3" />
                                <span>{p.bannerActive ? 'Showing Banner' : 'Banner Off'}</span>
                              </button>
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  await togglePromotionStatus(p.id, !p.isActive);
                                  refreshData();
                                }}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                                  p.isActive
                                    ? 'bg-sage/10 text-sage border-sage/30'
                                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                                }`}
                              >
                                {p.isActive ? 'Active' : 'Disabled'}
                              </button>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Delete promotion code "${p.code}"?`)) {
                                    await deletePromotion(p.id);
                                    setActionSuccessMsg(`Promotion "${p.code}" deleted.`);
                                    refreshData();
                                  }
                                }}
                                className="p-1.5 text-parchment-faint hover:text-red-500 rounded transition-colors"
                                title="Delete Promotion"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: SYSTEM & SECURITY SETTINGS */}
          {/* ======================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in max-w-3xl">
              {/* Security Passcode Management */}
              <div className="bg-ink-100/40 rounded-2xl border border-warm/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-parchment flex items-center gap-2">
                      <ShieldCrownIcon className="w-4 h-4 text-warm" />
                      <span>Admin Master Passcode Security</span>
                    </h3>
                    <p className="text-xs text-parchment-faint">Change the password required to unlock this dashboard</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sage/10 text-sage border border-sage/20">
                    PROTECTED
                  </span>
                </div>

                <div className="p-3 bg-ink-200/50 rounded-xl border border-ink-400/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-parchment-dim">Active Passcode:</span>
                    <code className="text-warm font-mono bg-ink-300 px-2 py-0.5 rounded">{getAdminPasscode()}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter new master passcode..."
                      value={newPasscodeSetting}
                      onChange={e => setNewPasscodeSetting(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none focus:border-warm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newPasscodeSetting.trim()) return;
                        setCustomAdminPasscode(newPasscodeSetting.trim());
                        setNewPasscodeSetting('');
                        setPasscodeUpdateMsg('Master Passcode successfully updated.');
                        setTimeout(() => setPasscodeUpdateMsg(null), 4000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-warm hover:bg-warm-light text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      Update Passcode
                    </button>
                  </div>
                  {passcodeUpdateMsg && (
                    <p className="text-xs text-sage font-medium">{passcodeUpdateMsg}</p>
                  )}
                </div>
              </div>

              {/* Paystack Gateway Configuration & Webhook Assistant */}
              <div className="bg-ink-100/40 rounded-2xl border border-ink-400/15 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-parchment flex items-center gap-2">
                      <CreditCardIcon className="w-4 h-4 text-warm" />
                      <span>Paystack Payment Gateway Configuration</span>
                    </h3>
                    <p className="text-xs text-parchment-faint">Ghana Cedis (GHS) • MTN MoMo, Telecel Cash, Visa/Mastercard</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sage/10 text-sage border border-sage/20">
                    GHS Pesewas (x100)
                  </span>
                </div>

                <div className="space-y-2 text-xs text-parchment-dim">
                  <div className="p-3 bg-ink-200/50 rounded-xl border border-ink-400/10 space-y-1.5">
                    <p className="font-semibold text-parchment">1. Active Paystack Keys in <code className="text-warm font-mono">.env.local</code> / Vercel</p>
                    <pre className="bg-ink-300/40 p-2 rounded-lg text-[11px] font-mono text-parchment overflow-x-auto">
{`# Frontend (.env.local)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_eb9230a86dffed577210355ad3d80205f5cad9b6

# Backend (Vercel Environment Variables)
PAYSTACK_SECRET_KEY=sk_test_c834a17ddae48cbeecf79e4f82ebe3758bd38539`}
                    </pre>
                  </div>

                  <div className="p-3 bg-ink-200/50 rounded-xl border border-ink-400/10 space-y-1">
                    <p className="font-semibold text-parchment">2. Webhook URL (for Vercel deployment)</p>
                    <p className="text-[11px] text-parchment-faint">In your Paystack Dashboard → Settings → API & Webhooks, set Webhook URL to:</p>
                    <code className="block bg-ink-300/40 px-2 py-1 rounded font-mono text-[11px] text-warm select-all">
                      https://your-deployed-domain.app/api/paystack-webhook
                    </code>
                  </div>
                </div>
              </div>

              {/* Pricing Overview */}
              <div className="bg-ink-100/40 rounded-2xl border border-ink-400/15 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-parchment">Subscription Tier Pricing Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-ink-200/40 rounded-xl border border-ink-400/10">
                    <p className="text-xs font-semibold text-parchment">Free Tier</p>
                    <p className="text-lg font-bold text-parchment mt-1">GHS 0</p>
                    <p className="text-[10px] text-parchment-faint">15 msgs/day • 2 projects</p>
                  </div>
                  <div className="p-3 bg-ink-200/40 rounded-xl border border-warm/20">
                    <p className="text-xs font-semibold text-warm">Writer Tier</p>
                    <p className="text-lg font-bold text-parchment mt-1">GHS 20<span className="text-xs text-parchment-faint font-normal">/mo</span></p>
                    <p className="text-[10px] text-parchment-faint">100 msgs/day • 10 projects</p>
                  </div>
                  <div className="p-3 bg-ink-200/40 rounded-xl border border-amber-500/20">
                    <p className="text-xs font-semibold text-amber-700">Novelist Tier</p>
                    <p className="text-lg font-bold text-parchment mt-1">GHS 50<span className="text-xs text-parchment-faint font-normal">/mo</span></p>
                    <p className="text-[10px] text-parchment-faint">Unlimited msgs • Unlimited projects</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* MODAL: CREATE PROMOTION */}
        {/* ======================================================== */}
        {isCreatePromoOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCreatePromoOpen(false)}
          >
            <div 
              className="bg-ink w-full max-w-lg rounded-2xl border border-ink-400/20 shadow-2xl p-6 relative overlay-content-enter max-h-[90vh] overflow-y-auto scrollbar-thin"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsCreatePromoOpen(false)}
                className="absolute top-4 right-4 text-parchment-faint hover:text-parchment p-1 rounded-lg"
              >
                <XIcon className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-display font-bold text-parchment mb-1">Create Special Promotion</h2>
              <p className="text-xs text-parchment-faint mb-5">Configure coupon codes, discount rates, and customer announcement banners</p>

              <form onSubmit={handleCreatePromoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-parchment mb-1">Promo Code</label>
                  <input
                    type="text"
                    required
                    value={newPromoCode}
                    onChange={e => setNewPromoCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-ink-100 border border-ink-400/20 text-parchment font-mono focus:outline-none focus:border-warm uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-parchment mb-1">Title / Headline</label>
                  <input
                    type="text"
                    required
                    value={newPromoTitle}
                    onChange={e => setNewPromoTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none focus:border-warm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-parchment mb-1">Discount Type</label>
                    <select
                      value={newPromoType}
                      onChange={e => setNewPromoType(e.target.value as DiscountType)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none"
                    >
                      <option value="percentage">Percentage Off (%)</option>
                      <option value="fixed_amount">Fixed Amount (GHS)</option>
                      <option value="free_bonus_messages">Free AI Messages Boost</option>
                      <option value="free_tier_days">Free Tier Trial Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-parchment mb-1">
                      {newPromoType === 'percentage' ? 'Percentage' :
                       newPromoType === 'fixed_amount' ? 'Amount in GHS' :
                       newPromoType === 'free_bonus_messages' ? 'Number of Messages' :
                       'Days of Trial'}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newPromoValue}
                      onChange={e => setNewPromoValue(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none focus:border-warm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-parchment mb-1">Applies To</label>
                    <select
                      value={newPromoAppliesTo}
                      onChange={e => setNewPromoAppliesTo(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none"
                    >
                      <option value="all">All Plans & Top-ups</option>
                      <option value="writer">Writer Plan Only</option>
                      <option value="novelist">Novelist Plan Only</option>
                      <option value="topup">Top-Up Boost Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-parchment mb-1">Max Redemptions</label>
                    <input
                      type="number"
                      value={newPromoMaxUses}
                      onChange={e => setNewPromoMaxUses(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none"
                    />
                  </div>
                </div>

                {/* Banner Broadcast Toggle */}
                <div className="p-3.5 rounded-xl bg-ink-100/70 border border-ink-400/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-parchment">In-App Customer Announcement Banner</label>
                    <input
                      type="checkbox"
                      checked={newPromoBannerActive}
                      onChange={e => setNewPromoBannerActive(e.target.checked)}
                      className="w-4 h-4 rounded text-warm focus:ring-warm"
                    />
                  </div>
                  {newPromoBannerActive && (
                    <input
                      type="text"
                      value={newPromoBannerText}
                      onChange={e => setNewPromoBannerText(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-ink-50 border border-ink-400/20 text-parchment focus:outline-none mt-1"
                    />
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatePromoOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-parchment-dim hover:text-parchment hover:bg-ink-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-warm hover:bg-warm-light text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    Create Promotion
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: MANAGE USER */}
        {/* ======================================================== */}
        {selectedUserForEdit && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedUserForEdit(null)}
          >
            <div 
              className="bg-ink w-full max-w-md rounded-2xl border border-ink-400/20 shadow-2xl p-6 relative overlay-content-enter"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className="absolute top-4 right-4 text-parchment-faint hover:text-parchment p-1 rounded-lg"
              >
                <XIcon className="w-5 h-5" />
              </button>

              <h2 className="text-base font-display font-bold text-parchment mb-1">Manage Author Account</h2>
              <p className="text-xs text-parchment-faint mb-4">{selectedUserForEdit.email}</p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-parchment mb-1">Subscription Tier</label>
                  <select
                    value={editTier}
                    onChange={e => setEditTier(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none"
                  >
                    <option value="free">Free Plan (15 msgs/day)</option>
                    <option value="writer">Writer Plan (100 msgs/day)</option>
                    <option value="novelist">Novelist Plan (Unlimited)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-parchment mb-1">Grant Bonus Message Credits</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={editBonusAdd}
                      onChange={e => setEditBonusAdd(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none"
                    />
                    <span className="text-parchment-faint whitespace-nowrap">Current: +{selectedUserForEdit.bonusMessages}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-parchment mb-1">Account Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-ink-100 border border-ink-400/20 text-parchment focus:outline-none"
                  >
                    <option value="user">Standard Author (User)</option>
                    <option value="admin">Administrator (Admin)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink-400/10">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForEdit(null)}
                    className="px-4 py-2 rounded-xl font-medium text-parchment-dim hover:text-parchment hover:bg-ink-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUserEdit}
                    className="px-5 py-2 rounded-xl bg-warm hover:bg-warm-light text-white font-semibold shadow-sm transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
