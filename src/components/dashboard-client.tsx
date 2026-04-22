'use client';

import type { FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Barcode, Boxes, LineChart, PackagePlus, ReceiptText, ScanBarcode, TriangleAlert } from 'lucide-react';
import { BarcodeScanner } from './barcode-scanner';
import { initialMovements, initialProducts, initialSales } from '@/lib/mock-data';
import type { InventoryMovement, Product, Sale, TrendPoint } from '@/lib/types';
import { money, toDateLabel } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

type ProductFormState = {
  barcode: string;
  name: string;
  description: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStock: string;
};

type SaleFormState = {
  barcode: string;
  quantity: string;
  discount: string;
  channel: string;
};

type InventoryFormState = {
  barcode: string;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: string;
  reason: string;
  adjustmentDirection: 'increase' | 'decrease';
};

type LoginFormState = {
  email: string;
  password: string;
};

type CurrentUser = {
  id: string;
  email: string | null;
  name: string;
  role: string;
};

type ReportState = {
  summary: {
    totalSales: number;
    inventoryValue: number;
  };
  topProducts: Array<{ productId: string; name: string; quantity: number; total: number }>;
  lowStockProducts: Array<{ id: string; name: string; currentStock: number; minStock: number }>;
  salesByDay: Array<{ date: string; value: number }>;
  salesByPeriod: Array<{ label: string; value: number }>;
};

type ForecastItem = {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  soldLast30Days: number;
  projectedNeed: number;
  suggestedOrder: number;
  status: 'reorder' | 'ok';
};

const emptyProductForm: ProductFormState = {
  barcode: '',
  name: '',
  description: '',
  category: '',
  unitPrice: '',
  currentStock: '',
  minStock: '',
};

const emptySaleForm: SaleFormState = {
  barcode: '',
  quantity: '1',
  discount: '0',
  channel: 'Mostrador',
};

const emptyInventoryForm: InventoryFormState = {
  barcode: '',
  type: 'entry',
  quantity: '1',
  reason: '',
  adjustmentDirection: 'increase',
};

const emptyLoginForm: LoginFormState = {
  email: '',
  password: '',
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildTrendPoints(sales: Sale[]): TrendPoint[] {
  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });

  const amounts = labels.map((label) => {
    const dayTotal = sales
      .filter((sale) => sale.soldAt.slice(0, 10) === label)
      .reduce((sum, sale) => sum + sale.total, 0);

    return {
      label: toDateLabel(label),
      value: dayTotal,
    };
  });

  return amounts;
}

function buildTrendPointsFromReport(salesByPeriod: Array<{ label: string; value: number }>): TrendPoint[] {
  return salesByPeriod.map((item) => ({
    label: toDateLabel(item.label),
    value: item.value,
  }));
}

function linePath(points: TrendPoint[]) {
  if (points.length < 2) {
    return '';
  }

  const max = Math.max(...points.map((point) => point.value), 1);
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - (point.value / max) * 70 - 15;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function DashboardClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [movements, setMovements] = useState<InventoryMovement[]>(initialMovements);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [saleForm, setSaleForm] = useState<SaleFormState>(emptySaleForm);
  const [inventoryForm, setInventoryForm] = useState<InventoryFormState>(emptyInventoryForm);
  const [loginForm, setLoginForm] = useState<LoginFormState>(emptyLoginForm);
  const [notice, setNotice] = useState('');
  const [reports, setReports] = useState<ReportState | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [screen, setScreen] = useState<'overview' | 'operations'>('overview');
  const [operationTab, setOperationTab] = useState<'sale' | 'inventory' | 'activity' | 'admin' | 'analytics'>('sale');

  const loadCurrentUser = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setCurrentUser(data.user ?? null);
    } catch {
      return;
    }
  }, []);

  const loadReports = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch(`/api/reports?period=${period}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setReports(data);
    } catch {
      return;
    }
  }, [period]);

  const loadForecast = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch(`/api/forecast?period=${period}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setForecast(Array.isArray(data.recommendations) ? data.recommendations : []);
    } catch {
      return;
    }
  }, [period]);

  const loadDashboard = useCallback(async (accessToken?: string) => {
    try {
      const response = await fetch('/api/dashboard', {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.products)) {
        setProducts(data.products);
      }
      if (Array.isArray(data.sales)) {
        setSales(data.sales);
      }
      if (Array.isArray(data.movements)) {
        setMovements(data.movements);
      }
      if (accessToken) {
        await loadReports(accessToken);
        await loadForecast(accessToken);
      }
    } catch {
      return;
    }
  }, [loadForecast, loadReports]);

  const loadSession = useCallback(async () => {
    const result = await supabase?.auth.getSession();
    setSession(result?.data.session ?? null);
    if (result?.data.session?.access_token) {
      await loadCurrentUser(result.data.session.access_token);
      await loadDashboard(result.data.session.access_token);
    }
  }, [loadCurrentUser, loadDashboard]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
    const { data } = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.access_token) {
        void loadCurrentUser(nextSession.access_token);
        void loadDashboard(nextSession.access_token);
      }
    }) ?? { data: null };

    return () => {
      data?.subscription.unsubscribe();
    };
  }, [loadCurrentUser, loadDashboard, loadSession]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReports(session.access_token);
    void loadForecast(session.access_token);
  }, [loadForecast, loadReports, period, session?.access_token]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setNotice('Falta configurar Supabase.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    setLoginForm(emptyLoginForm);
    setNotice('Sesion iniciada.');
    await loadSession();
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setNotice('Falta configurar Supabase.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: loginForm.email,
      password: loginForm.password,
      options: {
        data: {
          name: loginForm.email.split('@')[0],
          role: 'worker',
        },
      },
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    setLoginForm(emptyLoginForm);
    setNotice('Cuenta creada. Ahora inicia sesion.');
    setAuthMode('login');
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
    setNotice('Sesion cerrada.');
  }

  const trendPoints = useMemo(
    () => (reports?.salesByPeriod?.length ? buildTrendPointsFromReport(reports.salesByPeriod) : buildTrendPoints(sales)),
    [reports, sales],
  );
  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + product.currentStock, 0),
    [products],
  );
  const salesToday = useMemo(
    () =>
      sales
        .filter((sale) => sale.soldAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
        .reduce((sum, sale) => sum + sale.total, 0),
    [sales],
  );
  const lowStockProducts = useMemo(
    () => reports?.lowStockProducts ?? products.filter((product) => product.currentStock <= product.minStock),
    [reports, products],
  );
  const inventoryValue = useMemo(
    () => reports?.summary.inventoryValue ?? products.reduce((sum, product) => sum + product.currentStock * product.unitPrice, 0),
    [reports, products],
  );
  const topProducts = useMemo(() => {
    if (reports) {
      return reports.topProducts.map((item) => ({
        product: { id: item.productId, name: item.name } as Product,
        quantity: item.quantity,
      }));
    }

    const totals = new Map<string, number>();
    for (const sale of sales) {
      totals.set(sale.productId, (totals.get(sale.productId) ?? 0) + sale.quantity);
    }
    return [...totals.entries()]
      .map(([productId, quantity]) => ({
        product: products.find((item) => item.id === productId),
        quantity,
      }))
      .filter((item) => item.product)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }, [reports, products, sales]);

  const recentMovements = useMemo(
    () =>
      [...movements]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map((movement) => ({
          ...movement,
          product: products.find((product) => product.id === movement.productId),
        })),
    [movements, products],
  );

  const recommendations = useMemo(() => {
    return forecast.slice(0, 3).map((item) => `${item.name}: pedir ${item.suggestedOrder} unidades`);
  }, [forecast]);

  if (!session) {
    return (
      <main className="app-shell auth-shell">
        <section className="panel auth-panel">
          <p className="eyebrow">Acceso al sistema</p>
          <h1>{authMode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}</h1>
          <form className="stack" onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
            <label>
              Correo
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="trabajador@tienda.com"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="********"
              />
            </label>
            <button className="primary-button" type="submit">{authMode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
          </form>
          <button className="secondary-button auth-toggle" type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
          </button>
          {notice ? <p className="auth-notice">{notice}</p> : null}
        </section>
      </main>
    );
  }

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      setNotice('No hay sesion activa.');
      return;
    }

    const stock = Number(productForm.currentStock);
    const price = Number(productForm.unitPrice);
    const minimum = Number(productForm.minStock);

    if (!productForm.name || !productForm.barcode) {
      setNotice('Falta completar nombre y codigo.');
      return;
    }

    const nextProduct: Product = {
      id: createId('prod'),
      barcode: productForm.barcode,
      name: productForm.name,
      description: productForm.description,
      category: productForm.category || 'General',
      unitPrice: Number.isFinite(price) ? price : 0,
      currentStock: Number.isFinite(stock) ? stock : 0,
      minStock: Number.isFinite(minimum) ? minimum : 0,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        barcode: nextProduct.barcode,
        name: nextProduct.name,
        description: nextProduct.description,
        category: nextProduct.category,
        unit_price: nextProduct.unitPrice,
        current_stock: nextProduct.currentStock,
        min_stock: nextProduct.minStock,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setNotice(data?.error ?? 'No se pudo crear el producto.');
      return;
    }

    setProductForm(emptyProductForm);
    setNotice('Producto creado correctamente.');
    await loadDashboard(accessToken);
  }

  async function handleRegisterSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      setNotice('No hay sesion activa.');
      return;
    }

    const product = products.find((item) => item.barcode === saleForm.barcode || item.name === saleForm.barcode);
    if (!product) {
      setNotice('No encontre el producto.');
      return;
    }

    const quantity = Number(saleForm.quantity);
    const discount = Number(saleForm.discount);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setNotice('La cantidad debe ser mayor a cero.');
      return;
    }

    if (quantity > product.currentStock) {
      setNotice('No hay stock suficiente para esa venta.');
      return;
    }

    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        barcode: product.barcode,
        quantity,
        discount,
        channel: saleForm.channel,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setNotice(data?.error ?? 'No se pudo registrar la venta.');
      return;
    }

    setSaleForm(emptySaleForm);
    setNotice('Venta registrada y stock actualizado.');
    await loadDashboard(accessToken);
  }

  async function handleInventoryMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      setNotice('No hay sesion activa.');
      return;
    }

    const product = products.find((item) => item.barcode === inventoryForm.barcode || item.name === inventoryForm.barcode);
    if (!product) {
      setNotice('No encontre el producto.');
      return;
    }

    const quantity = Number(inventoryForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setNotice('La cantidad debe ser mayor a cero.');
      return;
    }

    if ((inventoryForm.type === 'exit' || inventoryForm.adjustmentDirection === 'decrease') && quantity > product.currentStock) {
      setNotice('No hay stock suficiente para ese movimiento.');
      return;
    }

    const response = await fetch('/api/inventory/movements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        product_id: product.id,
        type: inventoryForm.type,
        quantity,
        reason: inventoryForm.reason || 'Movimiento de inventario',
        adjustment_direction: inventoryForm.adjustmentDirection,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setNotice(data?.error ?? 'No se pudo registrar el movimiento.');
      return;
    }

    setInventoryForm(emptyInventoryForm);
    setNotice('Movimiento de inventario registrado.');
    await loadDashboard(accessToken);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Inventario + ventas + demanda</p>
          <h1>Sistema de tienda</h1>
        </div>
        <div className="topbar-actions">
          <div className="view-switch">
            <button
              type="button"
              className={screen === 'overview' ? 'view-switch-button active' : 'view-switch-button'}
              onClick={() => setScreen('overview')}
            >
              Resumen
            </button>
            <button
              type="button"
              className={screen === 'operations' ? 'view-switch-button active' : 'view-switch-button'}
              onClick={() => setScreen('operations')}
            >
              Operaciones
            </button>
          </div>
          <div className="user-chip">
            {currentUser?.name ?? session.user.email ?? 'Usuario'} · {currentUser?.role ?? 'worker'}{' '}
            <button className="inline-link" type="button" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </div>
      </header>

      {screen === 'overview' ? (
        <section className="action-row">
          <button className="primary-button" type="button" onClick={() => {
            setOperationTab('sale');
            setScreen('operations');
          }}>
            <ScanBarcode size={16} /> Escanear
          </button>
          <button className="secondary-button" type="button" onClick={() => {
            setOperationTab('sale');
            setScreen('operations');
          }}>
            <ReceiptText size={16} /> Vender
          </button>
          <button className="secondary-button" type="button" onClick={() => {
            setOperationTab(currentUser?.role === 'admin' ? 'admin' : 'inventory');
            setScreen('operations');
          }}>
            <LineChart size={16} /> Gestionar
          </button>
        </section>
      ) : (
        <section className="action-row">
          <button className="primary-button" type="button" onClick={() => setScreen('overview')}>
            <LineChart size={16} /> Ver resumen
          </button>
          <button className="secondary-button" type="button" onClick={() => setScreen('overview')}>
            <Barcode size={16} /> Panel rapido
          </button>
        </section>
      )}

      <section className="alert-banner">
        <TriangleAlert size={18} />
        <span>
          Alertas: {lowStockProducts.length} productos con stock bajo y {sales.length} ventas en historial.
        </span>
        {notice ? <strong>{notice}</strong> : null}
      </section>

      {screen === 'overview' ? (
        <section className="content-grid">
          <article className="panel panel-wide">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Tendencia de ventas</p>
                <h2>Grafico de lineas</h2>
              </div>
              <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}>
                <option value="today">Hoy</option>
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
                <option value="90d">90 dias</option>
              </select>
            </div>
            <div className="chart-wrap">
              <svg viewBox="0 0 100 100" role="img" aria-label="Grafico de ventas" className="line-chart">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(80, 214, 255, 0.7)" />
                    <stop offset="100%" stopColor="rgba(80, 214, 255, 0.05)" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  points={trendPoints
                    .map((point, index) => {
                      const max = Math.max(...trendPoints.map((item) => item.value), 1);
                      const x = (index / Math.max(trendPoints.length - 1, 1)) * 100;
                      const y = 100 - (point.value / max) * 70 - 15;
                      return `${x.toFixed(2)},${y.toFixed(2)}`;
                    })
                    .join(' ')}
                />
                <path d={`${linePath(trendPoints)} L 100 100 L 0 100 Z`} fill="url(#chartGradient)" opacity="0.5" />
              </svg>
              <div className="chart-labels">
                {trendPoints.map((point) => (
                  <span key={point.label}>{point.label}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Productos</p>
                <h2>Mas vendidos</h2>
              </div>
            </div>
            <div className="list-card">
              {topProducts.map((item, index) => (
                <div key={item.product?.id ?? index} className="list-row">
                  <strong>{index + 1}. {item.product?.name}</strong>
                  <span>{item.quantity} u</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Alertas</p>
                <h2>Stock bajo</h2>
              </div>
            </div>
            <div className="list-card warning-list">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="list-row">
                  <strong>{product.name}</strong>
                  <span>{product.currentStock} / {product.minStock}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel panel-wide">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Prediccion</p>
                <h2>Que pedir ahora</h2>
              </div>
            </div>
            <div className="forecast-grid">
              {recommendations.length ? (
                recommendations.map((item) => <div key={item} className="forecast-card">{item}</div>)
              ) : (
                <div className="forecast-card">Sin alertas por ahora.</div>
              )}
            </div>
          </article>
        </section>
      ) : (
        <section className="content-grid operations-grid">
          <article className="panel panel-wide scanner-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Escaneo por camara</p>
                <h2>Capturar barcode</h2>
              </div>
            </div>
            <BarcodeScanner onDetected={(value) => {
              setSaleForm((current) => ({ ...current, barcode: value }));
              setNotice(`Codigo detectado: ${value}`);
            }} />
          </article>

          <article className="panel panel-wide operations-shell">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Flujos</p>
                <h2>Selecciona una tarea</h2>
              </div>
            </div>
            <div className="subtabs">
              <button type="button" className={operationTab === 'sale' ? 'subtab active' : 'subtab'} onClick={() => setOperationTab('sale')}>Venta</button>
              <button type="button" className={operationTab === 'inventory' ? 'subtab active' : 'subtab'} onClick={() => setOperationTab('inventory')}>Inventario</button>
              <button type="button" className={operationTab === 'activity' ? 'subtab active' : 'subtab'} onClick={() => setOperationTab('activity')}>Historial</button>
              <button type="button" className={operationTab === 'analytics' ? 'subtab active' : 'subtab'} onClick={() => setOperationTab('analytics')}>Analítica</button>
              {currentUser?.role === 'admin' ? <button type="button" className={operationTab === 'admin' ? 'subtab active' : 'subtab'} onClick={() => setOperationTab('admin')}>Admin</button> : null}
            </div>

            <div className="operation-panel">
              {operationTab === 'sale' ? (
                <form className="stack" onSubmit={handleRegisterSale}>
                  <label>
                    Codigo o nombre
                    <input value={saleForm.barcode} onChange={(event) => setSaleForm((current) => ({ ...current, barcode: event.target.value }))} placeholder="7751234567890" />
                  </label>
                  <div className="two-cols">
                    <label>
                      Cantidad
                      <input type="number" min="1" value={saleForm.quantity} onChange={(event) => setSaleForm((current) => ({ ...current, quantity: event.target.value }))} />
                    </label>
                    <label>
                      Descuento
                      <input type="number" step="0.01" value={saleForm.discount} onChange={(event) => setSaleForm((current) => ({ ...current, discount: event.target.value }))} />
                    </label>
                  </div>
                  <label>
                    Canal
                    <select value={saleForm.channel} onChange={(event) => setSaleForm((current) => ({ ...current, channel: event.target.value }))}>
                      <option>Mostrador</option>
                      <option>Delivery</option>
                      <option>Online</option>
                    </select>
                  </label>
                  <button className="primary-button" type="submit">Guardar venta</button>
                </form>
              ) : null}

              {operationTab === 'inventory' ? (
                <form className="stack" onSubmit={handleInventoryMovement}>
                  <label>
                    Codigo o nombre
                    <input value={inventoryForm.barcode} onChange={(event) => setInventoryForm((current) => ({ ...current, barcode: event.target.value }))} placeholder="7751234567890" />
                  </label>
                  <label>
                    Tipo de movimiento
                    <select value={inventoryForm.type} onChange={(event) => setInventoryForm((current) => ({ ...current, type: event.target.value as InventoryFormState['type'] }))}>
                      <option value="entry">Entrada</option>
                      <option value="exit">Salida</option>
                      <option value="adjustment">Ajuste</option>
                    </select>
                  </label>
                  {inventoryForm.type === 'adjustment' ? (
                    <label>
                      Direccion del ajuste
                      <select value={inventoryForm.adjustmentDirection} onChange={(event) => setInventoryForm((current) => ({ ...current, adjustmentDirection: event.target.value as InventoryFormState['adjustmentDirection'] }))}>
                        <option value="increase">Aumentar stock</option>
                        <option value="decrease">Disminuir stock</option>
                      </select>
                    </label>
                  ) : null}
                  <label>
                    Cantidad
                    <input type="number" min="1" value={inventoryForm.quantity} onChange={(event) => setInventoryForm((current) => ({ ...current, quantity: event.target.value }))} />
                  </label>
                  <label>
                    Motivo
                    <textarea value={inventoryForm.reason} onChange={(event) => setInventoryForm((current) => ({ ...current, reason: event.target.value }))} rows={3} placeholder="Ingreso de mercaderia, conteo, merma..." />
                  </label>
                  <button className="primary-button" type="submit">Guardar movimiento</button>
                </form>
              ) : null}

              {operationTab === 'activity' ? (
                <div className="list-card activity-list">
                  {recentMovements.map((movement) => (
                    <div key={movement.id} className="list-row">
                      <strong>{movement.product?.name ?? 'Producto'}</strong>
                      <span>{movement.type} x{movement.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {operationTab === 'analytics' ? (
                <div className="two-cols">
                  <div className="list-card">
                    {topProducts.map((item, index) => (
                      <div key={item.product?.id ?? index} className="list-row">
                        <strong>{index + 1}. {item.product?.name}</strong>
                        <span>{item.quantity} u</span>
                      </div>
                    ))}
                  </div>
                  <div className="list-card warning-list">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="list-row">
                        <strong>{product.name}</strong>
                        <span>{product.currentStock} / {product.minStock}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {operationTab === 'admin' ? (
                <form className="stack" onSubmit={handleAddProduct}>
                  <label>
                    Codigo de barras
                    <input value={productForm.barcode} onChange={(event) => setProductForm((current) => ({ ...current, barcode: event.target.value }))} placeholder="775123..." />
                  </label>
                  <label>
                    Nombre
                    <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} placeholder="Arroz 1kg" />
                  </label>
                  <label>
                    Categoria
                    <input value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} placeholder="Abarrotes" />
                  </label>
                  <div className="two-cols">
                    <label>
                      Precio unitario
                      <input type="number" step="0.01" value={productForm.unitPrice} onChange={(event) => setProductForm((current) => ({ ...current, unitPrice: event.target.value }))} />
                    </label>
                    <label>
                      Stock inicial
                      <input type="number" value={productForm.currentStock} onChange={(event) => setProductForm((current) => ({ ...current, currentStock: event.target.value }))} />
                    </label>
                  </div>
                  <label>
                    Stock minimo
                    <input type="number" value={productForm.minStock} onChange={(event) => setProductForm((current) => ({ ...current, minStock: event.target.value }))} />
                  </label>
                  <label>
                    Descripcion
                    <textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
                  </label>
                  <button className="primary-button" type="submit">Guardar producto</button>
                </form>
              ) : null}
            </div>
          </article>

          <article className="panel panel-wide">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Prediccion</p>
                <h2>Recomendaciones de compra</h2>
              </div>
            </div>
            <div className="movement-grid">
              {forecast.slice(0, 5).map((item) => (
                <div key={item.id} className="movement-item">
                  <strong>{item.name}</strong>
                  <span>{item.status === 'reorder' ? `Comprar ${item.suggestedOrder} u` : 'Sin compra urgente'}</span>
                  <small>Vendidas 30 dias: {item.soldLast30Days} | Stock: {item.currentStock}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="eyebrow">{title}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
