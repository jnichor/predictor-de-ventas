'use client';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from './barcode-scanner';
import type { InventoryMovement, Product, Sale } from '@/lib/types';
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

type InviteFormState = {
  email: string;
  name: string;
  role: 'admin' | 'worker';
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

const emptyInviteForm: InviteFormState = {
  email: '',
  name: '',
  role: 'worker',
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}


type OperationTab = 'sale' | 'inventory' | 'activity' | 'admin' | 'analytics' | 'users';

function isOperationTab(value: string | null): value is OperationTab {
  return value === 'sale' || value === 'inventory' || value === 'activity' || value === 'admin' || value === 'analytics' || value === 'users';
}

export function OperationsClient() {
  const searchParams = useSearchParams();
  const initialTab = (() => {
    const t = searchParams.get('tab');
    return isOperationTab(t) ? t : 'sale';
  })();

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [saleForm, setSaleForm] = useState<SaleFormState>(emptySaleForm);
  const [inventoryForm, setInventoryForm] = useState<InventoryFormState>(emptyInventoryForm);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(emptyInviteForm);
  const [reports, setReports] = useState<ReportState | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [operationTab, setOperationTab] = useState<OperationTab>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (isOperationTab(t)) {
      setOperationTab(t);
    }
  }, [searchParams]);

  const loadCurrentUser = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('loadCurrentUser failed', response.status);
        return;
      }

      const data = await response.json();
      setCurrentUser(data.user ?? null);
    } catch (error) {
      console.error('loadCurrentUser error', error);
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
        console.error('loadReports failed', response.status);
        return;
      }

      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('loadReports error', error);
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
        console.error('loadForecast failed', response.status);
        return;
      }

      const data = await response.json();
      setForecast(Array.isArray(data.recommendations) ? data.recommendations : []);
    } catch (error) {
      console.error('loadForecast error', error);
    }
  }, [period]);

  const loadDashboard = useCallback(async (accessToken?: string) => {
    setIsLoadingData(true);
    try {
      const response = await fetch('/api/dashboard', {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });
      if (!response.ok) {
        toast.error('No se pudieron cargar los datos del panel.');
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
    } catch (error) {
      console.error('loadDashboard error', error);
      toast.error('Error de conexión al cargar el panel.');
    } finally {
      setIsLoadingData(false);
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

  const lowStockProducts = useMemo(
    () => reports?.lowStockProducts ?? products.filter((product) => product.currentStock <= product.minStock),
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

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error('No hay sesión activa.');
      return;
    }

    const stock = Number(productForm.currentStock);
    const price = Number(productForm.unitPrice);
    const minimum = Number(productForm.minStock);

    if (!productForm.name || !productForm.barcode) {
      toast.error('Falta completar nombre y código.');
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
      toast.error(data?.error ?? 'No se pudo crear el producto.');
      return;
    }

    setProductForm(emptyProductForm);
    toast.success('Producto creado correctamente.');
    await loadDashboard(accessToken);
  }

  async function handleRegisterSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error('No hay sesión activa.');
      return;
    }

    const product = products.find((item) => item.barcode === saleForm.barcode || item.name === saleForm.barcode);
    if (!product) {
      toast.error('No se encontró el producto.');
      return;
    }

    const quantity = Number(saleForm.quantity);
    const discount = Number(saleForm.discount);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('La cantidad debe ser mayor a cero.');
      return;
    }

    if (quantity > product.currentStock) {
      toast.error('No hay stock suficiente para esa venta.');
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
      toast.error(data?.error ?? 'No se pudo registrar la venta.');
      return;
    }

    setSaleForm(emptySaleForm);
    toast.success('Venta registrada y stock actualizado.');
    await loadDashboard(accessToken);
  }

  async function handleInventoryMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error('No hay sesión activa.');
      return;
    }

    const product = products.find((item) => item.barcode === inventoryForm.barcode || item.name === inventoryForm.barcode);
    if (!product) {
      toast.error('No se encontró el producto.');
      return;
    }

    const quantity = Number(inventoryForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('La cantidad debe ser mayor a cero.');
      return;
    }

    if ((inventoryForm.type === 'exit' || inventoryForm.adjustmentDirection === 'decrease') && quantity > product.currentStock) {
      toast.error('No hay stock suficiente para ese movimiento.');
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
      toast.error(data?.error ?? 'No se pudo registrar el movimiento.');
      return;
    }

    setInventoryForm(emptyInventoryForm);
    toast.success('Movimiento de inventario registrado.');
    await loadDashboard(accessToken);
  }

  async function handleInviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error('No hay sesión activa.');
      return;
    }

    if (!inviteForm.email) {
      toast.error('Falta el email del invitado.');
      return;
    }

    const response = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: inviteForm.email,
        name: inviteForm.name || undefined,
        role: inviteForm.role,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? 'No se pudo enviar la invitación.');
      return;
    }

    setInviteForm(emptyInviteForm);
    toast.success(`Invitación enviada a ${inviteForm.email}.`);
  }

  return (
    <div className="app-shell legacy-ops">
      <section className="alert-banner">
        <TriangleAlert size={18} />
        <span>
          {isLoadingData && products.length === 0
            ? 'Cargando datos…'
            : `Alertas: ${lowStockProducts.length} productos con stock bajo y ${sales.length} ventas en historial.`}
        </span>
      </section>

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
              toast.success(`Código detectado: ${value}`);
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
              {currentUser?.role === 'admin' ? <button type="button" className={operationTab === 'admin' ? 'subtab active' : 'subtab'} onClick={() => setOperationTab('admin')}>Productos</button> : null}
              {currentUser?.role === 'admin' ? <button type="button" className={operationTab === 'users' ? 'subtab active' : 'subtab'} onClick={() => setOperationTab('users')}>Usuarios</button> : null}
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
                      {currentUser?.role === 'admin' ? <option value="adjustment">Ajuste</option> : null}
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

              {operationTab === 'users' && currentUser?.role === 'admin' ? (
                <form className="stack" onSubmit={handleInviteUser}>
                  <p className="muted">
                    Ingresá el email del nuevo miembro. Va a recibir un link para completar su contraseña y entrar al sistema.
                  </p>
                  <label>
                    Email
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="nuevo@tienda.com"
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    Nombre (opcional)
                    <input
                      value={inviteForm.name}
                      onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Ana Pérez"
                    />
                  </label>
                  <label>
                    Rol
                    <select
                      value={inviteForm.role}
                      onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as InviteFormState['role'] }))}
                    >
                      <option value="worker">Worker (ventas + inventario)</option>
                      <option value="admin">Admin (acceso completo)</option>
                    </select>
                  </label>
                  <button className="primary-button" type="submit">Enviar invitación</button>
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
    </div>
  );
}
