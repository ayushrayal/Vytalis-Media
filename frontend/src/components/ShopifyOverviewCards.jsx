import React from 'react';
import { DollarSign, ShoppingBag, CreditCard, Users, UserCheck, Package, AlertCircle } from 'lucide-react';
import MetricCard from './MetricCard';
import ShopifyOverviewCardsSkeleton from './skeletons/ShopifyOverviewCardsSkeleton';
import { formatShopifyCurrency, formatCompact } from '../utils/formatter';

const ShopifyOverviewCards = ({ data, isLoading, isError, error }) => {
  if (isLoading) {
    return <ShopifyOverviewCardsSkeleton />;
  }

  if (isError) {
    return (
      <div
        className="card"
        style={{
          padding: '1.25rem',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <AlertCircle size={18} />
        <span>Failed to load KPI Cards: {error?.response?.data?.message || error?.message || 'Unknown error'}</span>
      </div>
    );
  }

  const overview = data?.data || {};
  const currency = overview.currency || 'USD';

  const cards = [
    {
      title: 'Total Revenue',
      value: formatShopifyCurrency(overview.totalRevenue, currency),
      icon: DollarSign,
      key: 'totalRevenue'
    },
    {
      title: 'Total Orders',
      value: formatCompact(overview.totalOrders || 0),
      icon: ShoppingBag,
      key: 'totalOrders'
    },
    {
      title: 'Average Order Value',
      value: formatShopifyCurrency(overview.averageOrderValue, currency),
      icon: CreditCard,
      key: 'averageOrderValue'
    },
    {
      title: 'Total Customers',
      value: formatCompact(overview.totalCustomers || 0),
      icon: Users,
      key: 'totalCustomers'
    },
    {
      title: 'Returning Customers',
      value: formatCompact(overview.returningCustomers || 0),
      icon: UserCheck,
      key: 'returningCustomers'
    },
    {
      title: 'Products Sold',
      value: formatCompact(overview.productsSold || 0),
      icon: Package,
      key: 'productsSold'
    }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        width: '100%'
      }}
    >
      {cards.map((card) => (
        <MetricCard
          key={card.key}
          title={card.title}
          value={card.value}
          icon={card.icon}
        />
      ))}
    </div>
  );
};

export default React.memo(ShopifyOverviewCards);
