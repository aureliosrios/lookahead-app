'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [role, setRole] = useState<'ingeniero' | 'campo'>('ingeniero');
  const [semanaActiva, setSemanaActiva] = useState<number>(7);
  const [data, setData] = useState<{ l3: any[]; l4: any[]; l5: any[]; compromisos: any[] }>({
    l3: [],
    l4: [],
    l5: [],
    compromisos: []
  });
  const [historicoPpc, setHistoricoPpc] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Form states
  const [l4Form, setL4Form] = useState({
    id_padre_l3: '',
    descripcion: '',
    fecha_inicio_compromiso: '',
    fecha_fin_compromiso: '',
    responsable: ''
  });

  const [avanceForm, setAvanceForm] = useState({
    id_partida_l5: '',
    id_compromiso: '',
    metrado_ejecutado_dia: '',
    responsable: '',
    causa_incumplimiento: ''
  });

  const [compromisoForm, setCompromisoForm] = useState({
    id_partida_l5: '',
    metrado_comprometido_semanal: '',
    responsable_frente: '',
    semana_lookahead: 7
  });

  // Load data from APIs
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/lookahead');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
      
      const resPpc = await fetch('/api/cierre-semana');
      const jsonPpc = await resPpc.json();
      if (jsonPpc.success) {
        setHistoricoPpc(jsonPpc.data);
      }
    } catch (err: any) {
      mostrarMensaje('error', 'Error al conectar con la base de datos cloud: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const mostrarMensaje = (tipo: 'success' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  // Submit L4 Program
  const handleL4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l4Form.id_padre_l3 || !l4Form.descripcion) {
      mostrarMensaje('error', 'Por favor, completa los campos requeridos para el Nivel 4.');
      return;
    }

    try {
      const res = await fetch('/api/lookahead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'l4', data: l4Form })
      });
      const resJson = await res.json();
      if (resJson.success) {
        mostrarMensaje('success', 'Planificación Nivel 4 registrada exitosamente.');
        setL4Form({ id_padre_l3: '', descripcion: '', fecha_inicio_compromiso: '', fecha_fin_compromiso: '', responsable: '' });
        cargarDatos();
      } else {
        mostrarMensaje('error', resJson.error);
      }
    } catch (err: any) {
      mostrarMensaje('error', 'Fallo de red al registrar Nivel 4.');
    }
  };

  // Submit Daily Progress (Avance)
  const handleAvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avanceForm.id_partida_l5 || avanceForm.metrado_ejecutado_dia === '') {
      mostrarMensaje('error', 'Selecciona partida L5 e ingresa el metrado diario.');
      return;
    }

    try {
      const res = await fetch('/api/avance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(avanceForm)
      });
      const resJson = await res.json();
      if (resJson.success) {
        mostrarMensaje('success', `Avance registrado. L3 actualizado a ${resJson.data.pctAvanceL3}%`);
        setAvanceForm({ id_partida_l5: '', id_compromiso: '', metrado_ejecutado_dia: '', responsable: '', causa_incumplimiento: '' });
        cargarDatos();
      } else {
        mostrarMensaje('error', resJson.error);
      }
    } catch (err: any) {
      mostrarMensaje('error', 'Fallo de red al registrar avance.');
    }
  };

  // Submit Commitment
  const handleCompromisoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compromisoForm.id_partida_l5 || compromisoForm.metrado_comprometido_semanal === '') {
      mostrarMensaje('error', 'Completa los campos del compromiso semanal.');
      return;
    }

    try {
      const res = await fetch('/api/lookahead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'compromiso', data: { ...compromisoForm, semana_lookahead: semanaActiva } })
      });
      const resJson = await res.json();
      if (resJson.success) {
        mostrarMensaje('success', 'Compromiso semanal registrado.');
        setCompromisoForm({ id_partida_l5: '', metrado_comprometido_semanal: '', responsable_frente: '', semana_lookahead: semanaActiva });
        cargarDatos();
      } else {
        mostrarMensaje('error', resJson.error);
      }
    } catch (err: any) {
      mostrarMensaje('error', 'Fallo de red.');
    }
  };

  // Close Week (Cierre)
  const handleCierreSemana = async () => {
    if (!confirm(`¿Estás seguro de realizar el corte y cierre de la Semana ${semanaActiva}? Se evaluarán todos los compromisos.`)) return;

    try {
      const res = await fetch('/api/cierre-semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semana: semanaActiva })
      });
      const resJson = await res.json();
      if (resJson.success) {
        mostrarMensaje('success', `¡Cierre completado! PPC de la semana: ${resJson.data.ppc}%`);
        cargarDatos();
      } else {
        mostrarMensaje('error', resJson.error);
      }
    } catch (err: any) {
      mostrarMensaje('error', 'Error al procesar cierre semanal.');
    }
  };

  const formatearFecha = (ts: any) => {
    if (!ts) return 'No definida';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Premium */}
      <header className="glass-panel" style={{ margin: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Lookahead & PPC Control System
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Control y Planificación Semanal en la Nube</p>
        </div>

        {/* Selector de Rol */}
        <div style={{ display: 'flex', background: 'var(--bg-base)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setRole('ingeniero')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'var(--transition-fast)',
              backgroundColor: role === 'ingeniero' ? 'var(--primary)' : 'transparent',
              color: role === 'ingeniero' ? 'var(--bg-base)' : 'var(--text-secondary)'
            }}
          >
            💻 Laptop (Planeamiento)
          </button>
          <button 
            onClick={() => setRole('campo')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'var(--transition-fast)',
              backgroundColor: role === 'campo' ? 'var(--primary)' : 'transparent',
              color: role === 'campo' ? 'var(--bg-base)' : 'var(--text-secondary)'
            }}
          >
            📱 Celular (Campo)
          </button>
        </div>
      </header>

      {/* Mensajes Flotantes */}
      {mensaje && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '16px 24px',
          borderRadius: 'var(--radius-md)',
          zIndex: 1000,
          backgroundColor: mensaje.tipo === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#000',
          fontWeight: '600',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.3s ease'
        }}>
          {mensaje.tipo === 'success' ? '✓ ' : '⚠ '} {mensaje.texto}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--primary)' }}>
          <p style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>Cargando datos del proyecto en tiempo real...</p>
        </div>
      )}

      {!loading && (
        <main style={{ flex: 1, padding: '0 16px 32px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Fila de Estadísticas y Control (Solo para Ingeniero) */}
          {role === 'ingeniero' && (
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Semana Activa</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <h3 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Semana {semanaActiva}</h3>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setSemanaActiva(prev => Math.max(1, prev - 1))} style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: '#fff', cursor: 'pointer' }}>-</button>
                    <button onClick={() => setSemanaActiva(prev => prev + 1)} style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', color: '#fff', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Partidas L5</p>
                <h3 style={{ fontSize: '2rem', marginTop: '8px', color: '#fff' }}>{data.l5.length} partidas</h3>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actividades Nivel 3</p>
                <h3 style={{ fontSize: '2rem', marginTop: '8px', color: 'var(--secondary)' }}>{data.l3.length} registradas</h3>
              </div>

              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                <button 
                  onClick={handleCierreSemana}
                  style={{
                    backgroundColor: 'var(--danger)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
                  onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                >
                  ⚡ Procesar Cierre y Medir PPC
                </button>
              </div>
            </section>
          )}

          {/* ROL: INGENIERO DE PLANEAMIENTO */}
          {role === 'ingeniero' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              
              {/* Tablero de Métricas PPC / KPIs */}
              <section className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Indicadores de Desempeño (KPIs) e Historial PPC
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  {/* Histórico PPC en SVG */}
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Porcentaje de Plan Completado (PPC %)</h4>
                    {historicoPpc.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay cierres registrados aún. Ejecuta un cierre de semana para ver las métricas.</p>
                    ) : (
                      <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                        <svg viewBox="0 0 400 180" style={{ width: '100%', height: 'auto' }}>
                          {/* Líneas de Guía */}
                          <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border-color)" strokeDasharray="4" />
                          <line x1="40" y1="80" x2="380" y2="80" stroke="var(--border-color)" strokeDasharray="4" />
                          <line x1="40" y1="140" x2="380" y2="140" stroke="var(--border-color)" strokeDasharray="4" />
                          <text x="10" y="25" fill="var(--text-muted)" fontSize="10">100%</text>
                          <text x="10" y="85" fill="var(--text-muted)" fontSize="10">50%</text>
                          <text x="10" y="145" fill="var(--text-muted)" fontSize="10">0%</text>

                          {/* Barras de PPC */}
                          {historicoPpc.map((m, idx) => {
                            const x = 50 + idx * 50;
                            const height = (m.ppc_porcentaje / 100) * 120;
                            const y = 140 - height;
                            return (
                              <g key={m.id}>
                                <rect x={x} y={y} width="24" height={height} fill="var(--primary)" rx="4" />
                                <text x={x + 12} y={y - 6} fill="#fff" fontSize="10" textAnchor="middle">{m.ppc_porcentaje}%</text>
                                <text x={x + 12} y={155} fill="var(--text-secondary)" fontSize="10" textAnchor="middle">S{m.semana_lookahead}</text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Estado de Compromisos de la Semana */}
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Compromisos Semana Activa ({semanaActiva})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {data.compromisos.filter(c => c.semana_lookahead === semanaActiva).length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin compromisos registrados para la Semana {semanaActiva}. Agrégalos en el Plan Semanal abajo.</p>
                      ) : (
                        data.compromisos.filter(c => c.semana_lookahead === semanaActiva).map(c => {
                          const avanceRel = data.l5.find(l => l.id === c.id_partida_l5);
                          return (
                            <div key={c.id} style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${c.estado_compromiso === 'Cumplido' ? 'var(--success)' : c.estado_compromiso === 'No Cumplido' ? 'var(--danger)' : 'var(--warning)'}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600' }}>{c.id_partida_l5} - {avanceRel?.descripcion || 'Partida'}</span>
                                <span style={{
                                  fontSize: '0.8rem',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: c.estado_compromiso === 'Cumplido' ? 'rgba(74, 222, 128, 0.2)' : c.estado_compromiso === 'No Cumplido' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                  color: c.estado_compromiso === 'Cumplido' ? 'var(--success)' : c.estado_compromiso === 'No Cumplido' ? 'var(--danger)' : 'var(--warning)'
                                }}>
                                  {c.estado_compromiso}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Comprometido: {c.metrado_comprometido_semanal} m3 | Responsable: {c.responsable_frente}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Matriz Lookahead de Control Jerárquica */}
              <section className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>📋 Matriz Completa de Lookahead (Plan vs Avance Real-Time)</h2>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px' }}>Código/WBS</th>
                      <th style={{ padding: '12px' }}>Descripción de la Actividad</th>
                      <th style={{ padding: '12px' }}>Fechas Planificadas (Inicio / Fin)</th>
                      <th style={{ padding: '12px' }}>Responsable</th>
                      <th style={{ padding: '12px' }}>Metrado Acumulado / Total</th>
                      <th style={{ padding: '12px' }}>Avance %</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.l3.map(l3 => {
                      // Filtrar L4 hijas
                      const hijasL4 = data.l4.filter(l4 => l4.id_padre_l3 === l3.id);
                      // Filtrar L5 hijas
                      const hijasL5 = data.l5.filter(l5 => l5.id_actividad_l3_padre === l3.id);

                      return (
                        <caption key={l3.id} style={{ display: 'table-row-group', captionSide: 'top' }}>
                          {/* Fila L3 (Padre) */}
                          <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--secondary)' }}>
                            <td style={{ padding: '14px 12px' }}>{l3.id}</td>
                            <td style={{ padding: '14px 12px' }}>{l3.descripcion}</td>
                            <td style={{ padding: '14px 12px' }}>{formatearFecha(l3.fecha_inicio_plan)} a {formatearFecha(l3.fecha_fin_plan)}</td>
                            <td style={{ padding: '14px 12px' }}>Planeamiento</td>
                            <td style={{ padding: '14px 12px' }}>-</td>
                            <td style={{ padding: '14px 12px' }}>{l3.pct_avance_metrados}%</td>
                            <td style={{ padding: '14px 12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                backgroundColor: l3.estado === 'Completado' ? 'rgba(74, 222, 128, 0.2)' : l3.estado === 'En Progreso' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                color: l3.estado === 'Completado' ? 'var(--success)' : l3.estado === 'En Progreso' ? 'var(--accent)' : 'var(--text-muted)'
                              }}>{l3.estado}</span>
                            </td>
                          </tr>

                          {/* Filas L4 (Subactividades ingresadas por campo) */}
                          {hijasL4.map(l4 => (
                            <tr key={l4.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem', color: '#fff' }}>
                              <td style={{ padding: '10px 12px 10px 30px', color: 'var(--text-muted)' }}>↳ L4</td>
                              <td style={{ padding: '10px 12px' }}>{l4.descripcion}</td>
                              <td style={{ padding: '10px 12px' }}>{formatearFecha(l4.fecha_inicio_compromiso)} a {formatearFecha(l4.fecha_fin_compromiso)}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--primary)' }}>{l4.responsable}</td>
                              <td style={{ padding: '10px 12px' }}>-</td>
                              <td style={{ padding: '10px 12px' }}>-</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l4.estado}</span>
                              </td>
                            </tr>
                          ))}

                          {/* Filas L5 (Partidas de costos y metrados) */}
                          {hijasL5.map(l5 => {
                            const pctL5 = l5.metrado_total > 0 ? Math.round((Number(l5.metrado_avance_actual_total || l5.metrado_avance_estimado_fc || 0) / l5.metrado_total) * 100) : 0;
                            return (
                              <tr key={l5.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <td style={{ padding: '8px 12px 8px 50px', color: 'var(--text-muted)' }}>↳ L5: {l5.id}</td>
                                <td style={{ padding: '8px 12px' }}>{l5.descripcion}</td>
                                <td style={{ padding: '8px 12px' }}>-</td>
                                <td style={{ padding: '8px 12px' }}>Campo</td>
                                <td style={{ padding: '8px 12px' }}>{Number(l5.metrado_avance_actual_total || l5.metrado_avance_estimado_fc || 0).toFixed(2)} / {l5.metrado_total} {l5.unidad}</td>
                                <td style={{ padding: '8px 12px' }}>{pctL5}%</td>
                                <td style={{ padding: '8px 12px' }}>S/. {l5.pu_soles} (PU)</td>
                              </tr>
                            );
                          })}
                        </caption>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              {/* Crear y Modificar el Plan Semanal */}
              <section className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>📝 Programación y Compromisos del Plan Semanal (Ingeniero)</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  
                  {/* Formulario de Compromiso */}
                  <form onSubmit={handleCompromisoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>Añadir Compromiso a Partida L5</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Partida Nivel 5 (L5)</label>
                      <select 
                        value={compromisoForm.id_partida_l5}
                        onChange={(e) => setCompromisoForm(prev => ({ ...prev, id_partida_l5: e.target.value }))}
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                      >
                        <option value="">-- Seleccionar Partida L5 --</option>
                        {data.l5.map(l5 => (
                          <option key={l5.id} value={l5.id}>{l5.id} - {l5.descripcion}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Metrado Comprometido</label>
                        <input 
                          type="number"
                          step="any"
                          value={compromisoForm.metrado_comprometido_semanal}
                          onChange={(e) => setCompromisoForm(prev => ({ ...prev, metrado_comprometido_semanal: e.target.value }))}
                          placeholder="Metrado a realizar"
                          style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Responsable</label>
                        <input 
                          type="text"
                          value={compromisoForm.responsable_frente}
                          onChange={(e) => setCompromisoForm(prev => ({ ...prev, responsable_frente: e.target.value }))}
                          placeholder="Ej. Ing. Solorzano"
                          style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <button type="submit" style={{ padding: '12px', background: 'var(--primary)', color: 'var(--bg-base)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer' }}>
                      Guardar Compromiso
                    </button>
                  </form>

                  {/* Listado editable de compromisos actuales */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--secondary)', marginBottom: '12px' }}>Compromisos Registrados (Semana {semanaActiva})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                      {data.compromisos.filter(c => c.semana_lookahead === semanaActiva).map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                          <div>
                            <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{c.id_partida_l5}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Compromiso: {c.metrado_comprometido_semanal} | {c.responsable_frente}</p>
                          </div>
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--warning)' }}>
                            {c.estado_compromiso}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </section>

            </div>
          )}

          {/* ROL: PERSONAL DE CAMPO (MOBILE FRIENDLY) */}
          {role === 'campo' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
              
              {/* Resumen de Actividades L3 vigentes */}
              <section className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary)', marginBottom: '12px' }}>🚧 Actividades Nivel 3 (Vigentes)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.l3.map(l3 => (
                    <div key={l3.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{l3.id}</span>
                        <p style={{ fontSize: '0.9rem', color: '#fff', marginTop: '2px' }}>{l3.descripcion}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l3.pct_avance_metrados}% Avance</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Formulario 1: Programar Nivel 4 (Subactividades) */}
              <section className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '16px' }}>📝 Programar Subactividad (Nivel 4)</h3>
                <form onSubmit={handleL4Submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Actividad Padre Nivel 3 (L3)</label>
                    <select 
                      value={l4Form.id_padre_l3}
                      onChange={(e) => setL4Form(prev => ({ ...prev, id_padre_l3: e.target.value }))}
                      style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                      required
                    >
                      <option value="">-- Seleccionar L3 --</option>
                      {data.l3.map(l3 => (
                        <option key={l3.id} value={l3.id}>{l3.id} - {l3.descripcion}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descripción de la Subactividad (L4)</label>
                    <input 
                      type="text"
                      value={l4Form.descripcion}
                      onChange={(e) => setL4Form(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Ej. Vaciado de concreto, Perfilado de subrasante"
                      style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fecha Inicio</label>
                      <input 
                        type="date"
                        value={l4Form.fecha_inicio_compromiso}
                        onChange={(e) => setL4Form(prev => ({ ...prev, fecha_inicio_compromiso: e.target.value }))}
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fecha Fin</label>
                      <input 
                        type="date"
                        value={l4Form.fecha_fin_compromiso}
                        onChange={(e) => setL4Form(prev => ({ ...prev, fecha_fin_compromiso: e.target.value }))}
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Responsable / Cuadrilla</label>
                    <input 
                      type="text"
                      value={l4Form.responsable}
                      onChange={(e) => setL4Form(prev => ({ ...prev, responsable: e.target.value }))}
                      placeholder="Ej. Cuadrilla B / Ing. Gomez"
                      style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                    />
                  </div>

                  <button type="submit" style={{ padding: '12px', background: 'var(--primary)', color: 'var(--bg-base)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer' }}>
                    Registrar Programación L4
                  </button>
                </form>
              </section>

              {/* Formulario 2: Reporte de Avance Diario (Nivel 5) */}
              <section className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary)', marginBottom: '16px' }}>👷 Reportar Avance Diario (Nivel 5)</h3>
                
                <form onSubmit={handleAvanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Compromiso Asignado (Semana {semanaActiva})</label>
                    <select 
                      value={avanceForm.id_compromiso}
                      onChange={(e) => {
                        const compId = e.target.value;
                        const compObj = data.compromisos.find(c => c.id === compId);
                        setAvanceForm(prev => ({
                          ...prev,
                          id_compromiso: compId,
                          id_partida_l5: compObj ? compObj.id_partida_l5 : ''
                        }));
                      }}
                      style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                    >
                      <option value="">-- Seleccionar Compromiso --</option>
                      {data.compromisos.filter(c => c.semana_lookahead === semanaActiva).map(c => {
                        const pL5 = data.l5.find(l => l.id === c.id_partida_l5);
                        return (
                          <option key={c.id} value={c.id}>
                            [{c.id_partida_l5}] {pL5?.descripcion || 'Partida'} - Comp: {c.metrado_comprometido_semanal}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Partida L5 (Física)</label>
                    <input 
                      type="text" 
                      value={avanceForm.id_partida_l5} 
                      disabled 
                      placeholder="Autocompletado al seleccionar compromiso"
                      style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Metrado Ejecutado del Día</label>
                      <input 
                        type="number"
                        step="any"
                        value={avanceForm.metrado_ejecutado_dia}
                        onChange={(e) => setAvanceForm(prev => ({ ...prev, metrado_ejecutado_dia: e.target.value }))}
                        placeholder="Cantidad en m3, m2, etc."
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Responsable Reporte</label>
                      <input 
                        type="text"
                        value={avanceForm.responsable}
                        onChange={(e) => setAvanceForm(prev => ({ ...prev, responsable: e.target.value }))}
                        placeholder="Ej. Capataz Lopez"
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Causa de Desviación / Incumplimiento (Opcional)</label>
                    <input 
                      type="text"
                      value={avanceForm.causa_incumplimiento}
                      onChange={(e) => setAvanceForm(prev => ({ ...prev, causa_incumplimiento: e.target.value }))}
                      placeholder="Ej. Lluvia intensa, Rotura de excavadora"
                      style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: '#fff' }}
                    />
                  </div>

                  <button type="submit" style={{ padding: '12px', background: 'var(--secondary)', color: 'var(--bg-base)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer' }}>
                    Registrar Avance Diario L5
                  </button>
                </form>
              </section>

            </div>
          )}
        </main>
      )}

      {/* Footer Fijo */}
      <footer style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)' }}>
        © 2026 Lookahead & PPC Control System. Todos los derechos reservados.
      </footer>
    </div>
  );
}
