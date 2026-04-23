'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { InventoryMovement, Product, Sale } from '@/lib/types';

export type Period = 'today' | '7d' | '30d' | '90d';

export type ReportState = {
  summary: {
    totalSales: number;
    inventoryValue: number;
    totalUnits?: number;
    lowStockCount?: number;
  };
  topProducts: Array<{ productId: string; name: string; quantity: number; total: number }>;
  lowStockProducts: Array<{ id: string; name: string; currentStock: number; minStock: number }>;
  salesByDay: Array<{ date: string; value: number }>;
  salesByPeriod: Array<{ label: string; value: number }>;
};

export type ForecastItem = {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  soldLast30Days: number;
  projectedNeed: number;
  suggestedOrder: number;
  status: 'reorder' | 'ok';
};

type DashboardData = {
  products: Product[];
  sales: Sale[];
  movements: InventoryMovement[];
  reports: ReportState | null;
  forecast: ForecastItem[];
  isLoading: boolean;
  period: Period;
  setPeriod: (p: Period) => void;
  refresh: () => Promise<void>;
};

export function useDashboardData(accessToken: string | null): DashboardData {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [reports, setReports] = useState<ReportState | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('7d');

  const loadReports = useCallback(async (token: string, p: Period) => {
    try {
      const response = await fetch(`/api/reports?period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        console.error('loadReports failed', response.status);
        return;
      }
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('loadReports error', error);
    }
  }, []);

  const loadForecast = useCallback(async (token: string, p: Period) => {
    try {
      const response = await fetch(`/api/forecast?period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        console.error('loadForecast failed', response.status);
        return;
      }
      const data = await response.json();
      setForecast(Array.isArray(data.recommendations) ? data.recommendations : []);
    } catch (error) {
      console.error('loadForecast error', error);
    }
  }, []);

  const loadDashboard = useCallback(
    async (token: string) => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          toast.error('No se pudieron cargar los datos del panel.');
          return;
        }
        const data = await response.json();
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.sales)) setSales(data.sales);
        if (Array.isArray(data.movements)) setMovements(data.movements);
        await Promise.all([loadReports(token, period), loadForecast(token, period)]);
      } catch (error) {
        console.error('loadDashboard error', error);
        toast.error('Error de conexión al cargar el panel.');
      } finally {
        setIsLoading(false);
      }
    },
    [loadReports, loadForecast, period],
  );

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    await loadDashboard(accessToken);
  }, [accessToken, loadDashboard]);

  useEffect(() => {
    if (!accessToken) return;
    void loadDashboard(accessToken);
  }, [accessToken, loadDashboard]);

  useEffect(() => {
    if (!accessToken) return;
    void loadReports(accessToken, period);
    void loadForecast(accessToken, period);
  }, [period, accessToken, loadReports, loadForecast]);

  return {
    products,
    sales,
    movements,
    reports,
    forecast,
    isLoading,
    period,
    setPeriod,
    refresh,
  };
}
