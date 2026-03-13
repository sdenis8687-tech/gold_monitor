'use client';

import { useEffect, useRef } from 'react';
import type { ChartPoint } from '@gold-monitor/shared';

interface ChartsProps {
  gold585: ChartPoint[];
  usdRub: ChartPoint[];
  loading?: boolean;
}

const GROUP_ID = 'gold-monitor-charts';

function formatTooltipDate(axisValue: number | string): string {
  return new Date(axisValue).toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtValue(val: number, decimals = 2): string {
  return val.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function Charts({ gold585, usdRub, loading = false }: ChartsProps) {
  const goldRef = useRef<HTMLDivElement>(null);
  const usdRef = useRef<HTMLDivElement>(null);
  const combinedRef = useRef<HTMLDivElement>(null);
  const goldChartRef = useRef<import('echarts').ECharts | null>(null);
  const usdChartRef = useRef<import('echarts').ECharts | null>(null);
  const combinedChartRef = useRef<import('echarts').ECharts | null>(null);

  useEffect(() => {
    let disposed = false;

    async function initCharts() {
      const echarts = await import('echarts');

      if (disposed || !goldRef.current || !usdRef.current || !combinedRef.current) return;

      if (goldChartRef.current) goldChartRef.current.dispose();
      if (usdChartRef.current) usdChartRef.current.dispose();
      if (combinedChartRef.current) combinedChartRef.current.dispose();

      const goldChart = echarts.init(goldRef.current, null, { renderer: 'canvas' });
      const usdChart = echarts.init(usdRef.current, null, { renderer: 'canvas' });
      const combinedChart = echarts.init(combinedRef.current, null, { renderer: 'canvas' });

      goldChartRef.current = goldChart;
      usdChartRef.current = usdChart;
      combinedChartRef.current = combinedChart;

      echarts.connect(GROUP_ID);
      goldChart.group = GROUP_ID;
      usdChart.group = GROUP_ID;
      combinedChart.group = GROUP_ID;

      const xAxisBase = {
        type: 'time' as const,
        axisLabel: {
          color: '#8892a4',
          fontSize: 11,
          formatter: (value: number) =>
            new Date(value).toLocaleDateString('ru-RU', {
              timeZone: 'Europe/Moscow',
              day: '2-digit',
              month: '2-digit',
            }),
        },
        axisLine: { lineStyle: { color: '#2a2d3a' } },
        splitLine: { lineStyle: { color: '#1e2130' } },
      };

      const singleChartOption = (
        data: ChartPoint[],
        color: string,
        name: string,
        yLabel: string,
      ): import('echarts').EChartsOption => ({
        backgroundColor: 'transparent',
        grid: { top: 16, right: 16, bottom: 48, left: 64 },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: '#4a4d5a' } },
          backgroundColor: '#1a1d27',
          borderColor: '#2a2d3a',
          textStyle: { color: '#e2e8f0', fontSize: 12 },
          formatter: (params: unknown) => {
            const p = (params as Array<{ axisValue: number; value: [string, number] }>)[0];
            if (!p) return '';
            const v = Array.isArray(p.value) ? p.value[1] : p.value;
            return `<div style="color:#8892a4;font-size:11px;margin-bottom:4px">${formatTooltipDate(p.axisValue)}</div><b>${name}:</b> ${fmtValue(v)}`;
          },
        },
        xAxis: xAxisBase,
        yAxis: {
          type: 'value',
          scale: true,
          name: yLabel,
          nameTextStyle: { color: '#8892a4', fontSize: 11 },
          axisLabel: {
            color: '#8892a4',
            fontSize: 11,
            formatter: (val: number) => val.toLocaleString('ru-RU'),
          },
          axisLine: { lineStyle: { color: '#2a2d3a' } },
          splitLine: { lineStyle: { color: '#1e2130' } },
        },
        series: [
          {
            name,
            type: 'line',
            data: data.map((p) => [p.ts, p.value]),
            smooth: 0.3,
            symbol: 'none',
            lineStyle: { color, width: 2 },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: color + '33' },
                  { offset: 1, color: color + '00' },
                ],
              },
            },
          },
        ],
      });

      goldChart.setOption(singleChartOption(gold585, '#f5c842', 'Золото 585', '₽/г'));
      goldChart.resize();
      usdChart.setOption(singleChartOption(usdRub, '#4fa8e8', 'USD/RUB', '₽'));
      usdChart.resize();

      // Combined dual-axis chart
      combinedChart.setOption({
        backgroundColor: 'transparent',
        grid: { top: 32, right: 72, bottom: 48, left: 72 },
        legend: {
          data: ['Золото 585', 'USD/RUB'],
          textStyle: { color: '#8892a4', fontSize: 11 },
          top: 0,
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: '#4a4d5a' } },
          backgroundColor: '#1a1d27',
          borderColor: '#2a2d3a',
          textStyle: { color: '#e2e8f0', fontSize: 12 },
          formatter: (params: unknown) => {
            const items = params as Array<{ axisValue: number; value: [string, number] | number; seriesName: string; color: string }>;
            if (!items || items.length === 0) return '';
            let html = `<div style="color:#8892a4;font-size:11px;margin-bottom:4px">${formatTooltipDate(items[0].axisValue)}</div>`;
            for (const item of items) {
              const v = Array.isArray(item.value) ? item.value[1] : item.value;
              html += `<div style="margin-top:2px"><span style="color:${item.color}">\u25CF</span> <b>${item.seriesName}:</b> ${fmtValue(v)}</div>`;
            }
            return html;
          },
        },
        xAxis: xAxisBase,
        yAxis: [
          {
            type: 'value',
            scale: true,
            name: '₽/г',
            nameTextStyle: { color: '#f5c842', fontSize: 11 },
            position: 'left',
            axisLabel: {
              color: '#f5c842',
              fontSize: 11,
              formatter: (val: number) => val.toLocaleString('ru-RU'),
            },
            axisLine: { show: true, lineStyle: { color: '#f5c84266' } },
            splitLine: { lineStyle: { color: '#1e2130' } },
          },
          {
            type: 'value',
            scale: true,
            name: '₽',
            nameTextStyle: { color: '#4fa8e8', fontSize: 11 },
            position: 'right',
            axisLabel: {
              color: '#4fa8e8',
              fontSize: 11,
              formatter: (val: number) => val.toLocaleString('ru-RU'),
            },
            axisLine: { show: true, lineStyle: { color: '#4fa8e866' } },
            splitLine: { show: false },
          },
        ],
        series: [
          {
            name: 'Золото 585',
            type: 'line',
            yAxisIndex: 0,
            data: gold585.map((p) => [p.ts, p.value]),
            smooth: 0.3,
            symbol: 'none',
            lineStyle: { color: '#f5c842', width: 2 },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#f5c84220' },
                  { offset: 1, color: '#f5c84200' },
                ],
              },
            },
          },
          {
            name: 'USD/RUB',
            type: 'line',
            yAxisIndex: 1,
            data: usdRub.map((p) => [p.ts, p.value]),
            smooth: 0.3,
            symbol: 'none',
            lineStyle: { color: '#4fa8e8', width: 2 },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#4fa8e820' },
                  { offset: 1, color: '#4fa8e800' },
                ],
              },
            },
          },
        ],
      });

      combinedChart.resize();
    }

    const handleResize = () => {
      goldChartRef.current?.resize();
      usdChartRef.current?.resize();
      combinedChartRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    initCharts();

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      if (goldChartRef.current) goldChartRef.current.dispose();
      if (usdChartRef.current) usdChartRef.current.dispose();
      if (combinedChartRef.current) combinedChartRef.current.dispose();
    };
  }, [gold585, usdRub]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-4">
          <div className="h-4 w-48 rounded bg-[#2a2d3a] animate-pulse mb-4" />
          <div className="h-64 rounded bg-[#2a2d3a] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-4">
              <div className="h-4 w-32 rounded bg-[#2a2d3a] animate-pulse mb-4" />
              <div className="h-48 rounded bg-[#2a2d3a] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-2">Золото 585 + USD/RUB</h3>
        <div ref={combinedRef} style={{ width: '100%', height: 300 }} data-testid="combined-chart" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-4">
          <h3 className="text-sm font-medium text-[#f5c842] mb-2">Золото 585, ₽/г</h3>
          <div ref={goldRef} style={{ width: '100%', height: 240 }} data-testid="gold-chart" />
        </div>
        <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-4">
          <h3 className="text-sm font-medium text-[#4fa8e8] mb-2">USD/RUB</h3>
          <div ref={usdRef} style={{ width: '100%', height: 240 }} data-testid="usd-chart" />
        </div>
      </div>
    </div>
  );
}
