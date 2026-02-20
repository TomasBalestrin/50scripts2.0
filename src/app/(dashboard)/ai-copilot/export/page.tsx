'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LockedFeature } from '@/components/shared/locked-feature';
import { useAuth } from '@/hooks/use-auth';
import { hasAccess } from '@/lib/plans/gate';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

type ExportFormat = 'csv' | 'pdf';

interface DataTypeOption {
  key: string;
  label: string;
  description: string;
}

const DATA_TYPES: DataTypeOption[] = [
  {
    key: 'scripts',
    label: 'Scripts usados',
    description: 'Historico de scripts utilizados no periodo',
  },
  {
    key: 'vendas',
    label: 'Vendas',
    description: 'Vendas registradas e valores',
  },
  {
    key: 'receita',
    label: 'Receita',
    description: 'Receita total e por periodo',
  },
  {
    key: 'padroes',
    label: 'Padroes',
    description: 'Analise de padroes e conversao',
  },
];

function ExportContent() {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    'scripts',
    'vendas',
    'receita',
  ]);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const toggleType = (key: string) => {
    setSelectedTypes((prev) =>
      prev.includes(key)
        ? prev.filter((t) => t !== key)
        : [...prev, key]
    );
  };

  const handleExportCSV = async () => {
    setExporting(true);
    setExported(false);

    try {
      const params = new URLSearchParams({ format: 'csv' });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/export/analytics?${params.toString()}`);

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao exportar dados');
        setExporting(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${dateFrom || 'inicio'}_${dateTo || 'fim'}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error('Erro no export CSV:', err);
      alert('Erro ao exportar. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    setExported(false);

    try {
      // Fetch data as JSON for PDF generation
      const params = new URLSearchParams({ format: 'csv' });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/export/analytics?${params.toString()}`);

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao exportar dados');
        setExporting(false);
        return;
      }

      const csvText = await res.text();
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map((line) => line.split(','));

      // Calculate summary stats
      let totalScriptsUsed = 0;
      let totalSales = 0;
      let totalRevenue = 0;

      rows.forEach((row) => {
        totalScriptsUsed += parseInt(row[1]) || 0;
        totalSales += parseInt(row[2]) || 0;
        totalRevenue += parseFloat(row[3]) || 0;
      });

      const avgConversion =
        totalScriptsUsed > 0
          ? ((totalSales / totalScriptsUsed) * 100).toFixed(1)
          : '0.0';

      // Build printable HTML
      const printContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Relatorio Script Go</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0A0F1E;
              padding: 40px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 32px;
              padding-bottom: 16px;
              border-bottom: 2px solid #1D4ED8;
            }
            .header h1 {
              font-size: 24px;
              color: #1D4ED8;
              margin-bottom: 4px;
            }
            .header p {
              font-size: 13px;
              color: #666;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 32px;
            }
            .stat-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              text-align: center;
            }
            .stat-card .value {
              font-size: 22px;
              font-weight: 700;
              color: #0A0F1E;
            }
            .stat-card .label {
              font-size: 12px;
              color: #666;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th {
              background: #f3f4f6;
              text-align: left;
              padding: 10px 12px;
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 10px 12px;
              font-size: 13px;
              border-bottom: 1px solid #f3f4f6;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 12px;
              color: #0A0F1E;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Script Go</h1>
            <p>Relatorio de Analytics${dateFrom || dateTo ? ` | ${dateFrom || '...'} a ${dateTo || '...'}` : ''}</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="value">${totalScriptsUsed}</div>
              <div class="label">Scripts Usados</div>
            </div>
            <div class="stat-card">
              <div class="value">${totalSales}</div>
              <div class="label">Vendas</div>
            </div>
            <div class="stat-card">
              <div class="value">R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div class="label">Receita Total</div>
            </div>
            <div class="stat-card">
              <div class="value">${avgConversion}%</div>
              <div class="label">Taxa de Conversao</div>
            </div>
          </div>

          <div class="section-title">Dados Diarios</div>
          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
                )
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            Gerado em ${new Date().toLocaleString('pt-BR')} | Script Go
          </div>
        </body>
        </html>
      `;

      // Open a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load before printing
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error('Erro no export PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    if (selectedTypes.length === 0) {
      alert('Selecione pelo menos um tipo de dado para exportar.');
      return;
    }

    if (format === 'csv') {
      handleExportCSV();
    } else {
      handleExportPDF();
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Calendar className="h-4 w-4 text-[#1D4ED8]" />
            Periodo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Data inicial
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-[#1E2A52] bg-[#131B35] px-3 py-2.5 text-sm text-white outline-none focus:border-[#1D4ED8] transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Data final
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-[#1E2A52] bg-[#131B35] px-3 py-2.5 text-sm text-white outline-none focus:border-[#1D4ED8] transition-colors"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format Selector */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <FileText className="h-4 w-4 text-[#1D4ED8]" />
            Formato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                format === 'csv'
                  ? 'border-[#1D4ED8] bg-[#1D4ED8]/10 text-[#1D4ED8]'
                  : 'border-[#1E2A52] bg-[#131B35] text-gray-400 hover:border-gray-500'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => setFormat('pdf')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                format === 'pdf'
                  ? 'border-[#1D4ED8] bg-[#1D4ED8]/10 text-[#1D4ED8]'
                  : 'border-[#1E2A52] bg-[#131B35] text-gray-400 hover:border-gray-500'
              }`}
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Data Types */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader>
          <CardTitle className="text-base text-white">
            Dados para exportar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DATA_TYPES.map((dt) => (
              <label
                key={dt.key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                  selectedTypes.includes(dt.key)
                    ? 'border-[#1D4ED8]/50 bg-[#1D4ED8]/5'
                    : 'border-[#1E2A52] bg-[#131B35]'
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                    selectedTypes.includes(dt.key)
                      ? 'border-[#1D4ED8] bg-[#1D4ED8]'
                      : 'border-[#1E2A52]'
                  }`}
                >
                  {selectedTypes.includes(dt.key) && (
                    <svg
                      className="h-3 w-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(dt.key)}
                  onChange={() => toggleType(dt.key)}
                  className="sr-only"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{dt.label}</p>
                  <p className="text-xs text-gray-500">{dt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={exporting || selectedTypes.length === 0}
        className="h-12 w-full bg-[#1D4ED8] text-white hover:bg-[#1E40AF] disabled:opacity-50"
      >
        {exporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exportando...
          </>
        ) : exported ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Exportado com sucesso!
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Exportar {format.toUpperCase()}
          </>
        )}
      </Button>
    </div>
  );
}

export default function ExportPage() {
  const { profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-64 rounded bg-[#0A0F1E]" />
            <div className="mb-6 h-4 w-40 rounded bg-[#0A0F1E]" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-[#0A0F1E]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userPlan = profile?.plan || 'starter';
  const hasPremium = hasAccess(userPlan, 'copilot');

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-6">
      <div className="mx-auto max-w-2xl">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              <Download className="h-6 w-6 text-[#1D4ED8]" />
              Exportar Dados
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Exporte suas metricas e analytics
            </p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400">Premium</Badge>
        </div>

        {/* Locked feature gate */}
        {!hasPremium ? (
          <LockedFeature requiredPlan="premium" userPlan={userPlan}>
            <ExportContent />
          </LockedFeature>
        ) : (
          <ExportContent />
        )}
      </div>
    </div>
  );
}
