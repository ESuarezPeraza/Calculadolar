
"use client";

import * as React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getHistoricalRates, type HistoricalRate } from "@/lib/rates";
import { Skeleton } from "./skeleton";

interface HistoryChartProps {
  currency: 'USD' | 'EUR';
}

export function HistoryChart({ currency }: HistoryChartProps) {
  const [data, setData] = React.useState<HistoricalRate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistoricalData = async () => {
      setIsLoading(true);
      try {
        const historicalData = await getHistoricalRates(currency);
        setData(historicalData);
      } catch (error) {
        console.error("Failed to fetch historical rates", error);
        // Handle error appropriately in a real app
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoricalData();
  }, [currency]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full bg-muted-foreground/20" />;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="rate" stroke="#8884d8" activeDot={{ r: 8 }} name={`Tasa ${currency}`} />
      </LineChart>
    </ResponsiveContainer>
  );
}
