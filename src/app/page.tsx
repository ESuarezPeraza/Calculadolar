"use client";

import * as React from "react";
import { ArrowRightLeft, Delete } from "lucide-react";
import { getExchangeRates, type ExchangeRateData } from "@/lib/rates";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ForeignCurrency = "USD" | "EUR";
type Currency = ForeignCurrency | "VES";
type Direction = "foreign-to-ves" | "ves-to-foreign";

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  VES: "Bs",
};

const formatValue = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "0,00";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default function Home() {
  const { toast } = useToast();
  const [rates, setRates] = React.useState<ExchangeRateData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [inputValue, setInputValue] = React.useState("0");
  const [direction, setDirection] = React.useState<Direction>("foreign-to-ves");
  const [foreignCurrency, setForeignCurrency] = React.useState<ForeignCurrency>("USD");
  const [useCustomRate, setUseCustomRate] = React.useState(false);
  const [customRate, setCustomRate] = React.useState("");

  React.useEffect(() => {
    const fetchRates = async () => {
      try {
        setIsLoading(true);
        const fetchedRates = await getExchangeRates();
        setRates(fetchedRates);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch exchange rates.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchRates();
  }, [toast]);

  const activeRate = React.useMemo(() => {
    if (useCustomRate && customRate) {
      const parsedCustom = parseFloat(customRate.replace(",", "."));
      return isNaN(parsedCustom) ? 0 : parsedCustom;
    }
    return rates?.rates[foreignCurrency] ?? 0;
  }, [useCustomRate, customRate, rates, foreignCurrency]);

  const fromCurrency: Currency = direction === "foreign-to-ves" ? foreignCurrency : "VES";
  const toCurrency: Currency = direction === "foreign-to-ves" ? "VES" : foreignCurrency;

  const outputValue = React.useMemo(() => {
    const parsedInput = parseFloat(inputValue);
    if (isNaN(parsedInput) || activeRate === 0) return "0";
    const result = direction === "foreign-to-ves" ? parsedInput * activeRate : parsedInput / activeRate;
    return result;
  }, [inputValue, activeRate, direction]);

  const handleNumberPress = (num: string) => {
    if (inputValue.length >= 15) return;
    setInputValue((prev) => (prev === "0" ? num : prev + num));
  };

  const handleDecimalPress = () => {
    if (inputValue.includes(".")) return;
    setInputValue((prev) => prev + ".");
  };

  const handleClear = () => setInputValue("0");

  const handleBackspace = () => {
    if (inputValue.length === 1) {
      setInputValue("0");
    } else {
      setInputValue((prev) => prev.slice(0, -1));
    }
  };

  const handleSwap = () => {
    setDirection((prev) => (prev === "foreign-to-ves" ? "ves-to-foreign" : "foreign-to-ves"));
  };
  
  const keypadButtons = [
    { label: "C", action: handleClear, variant: "destructive" as const, area: "clear" },
    { label: "USD", action: () => setForeignCurrency("USD"), active: foreignCurrency === 'USD', variant: "primary" as const, area: "usd" },
    { label: "EUR", action: () => setForeignCurrency("EUR"), active: foreignCurrency === 'EUR', variant: "primary" as const, area: "eur" },
    { label: <Delete />, action: handleBackspace, area: "backspace" },
    { label: "7", action: () => handleNumberPress("7"), area: "seven" },
    { label: "8", action: () => handleNumberPress("8"), area: "eight" },
    { label: "9", action: () => handleNumberPress("9"), area: "nine" },
    { label: <ArrowRightLeft />, action: handleSwap, area: "swap" },
    { label: "4", action: () => handleNumberPress("4"), area: "four" },
    { label: "5", action: () => handleNumberPress("5"), area: "five" },
    { label: "6", action: () => handleNumberPress("6"), area: "six" },
    { label: "1", action: () => handleNumberPress("1"), area: "one" },
    { label: "2", action: () => handleNumberPress("2"), area: "two" },
    { label: "3", action: () => handleNumberPress("3"), area: "three" },
    { label: "0", action: () => handleNumberPress("0"), area: "zero" },
    { label: ".", action: handleDecimalPress, area: "decimal" },
  ];

  const DisplayRow = ({ currency, amount, isActive }: { currency: Currency; amount: string | number; isActive: boolean }) => (
    <div className={cn("flex justify-between items-baseline transition-all duration-300", !isActive && "opacity-60")}>
      <div className="flex items-center gap-3">
        <span className={cn("font-bold", isActive ? "text-4xl" : "text-2xl")}>{currencySymbols[currency]}</span>
        <span className={cn(isActive ? "text-2xl" : "text-lg")}>{currency}</span>
      </div>
      <p className={cn("font-mono font-black text-right break-all", isActive ? "text-7xl" : "text-5xl")}>{formatValue(amount)}</p>
    </div>
  );

  return (
    <main className="h-screen max-h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div className="flex-1 flex flex-col justify-end p-6 space-y-4">
        <DisplayRow currency={fromCurrency} amount={inputValue} isActive={true} />
        <DisplayRow currency={toCurrency} amount={outputValue} isActive={false} />
      </div>

      <div className="px-6 py-4 space-y-3 border-t border-b border-white/10">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          {isLoading ? <Skeleton className="h-4 w-48" /> : 
            <>
              <p>BCV Rate: <span className="font-semibold text-foreground">1 {foreignCurrency} = {formatValue(rates?.rates[foreignCurrency] ?? 0)} VES</span></p>
              <p>{rates?.date}</p>
            </>
          }
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="custom-rate-switch" checked={useCustomRate} onCheckedChange={setUseCustomRate} />
          <Label htmlFor="custom-rate-switch">Use Custom Rate</Label>
        </div>
        {useCustomRate && (
          <Input
            type="text"
            placeholder={`Custom ${foreignCurrency} rate`}
            value={customRate}
            onChange={(e) => {
              const value = e.target.value;
              if (/^[\d,.]*$/.test(value)) {
                setCustomRate(value);
              }
            }}
            className="bg-secondary border-secondary focus-visible:ring-primary"
          />
        )}
      </div>

      <div className="grid grid-cols-4 grid-rows-5 gap-2 p-2">
        {keypadButtons.map(btn => (
          <Button
            key={btn.area}
            onClick={btn.action}
            variant={btn.variant === 'destructive' ? 'destructive' : 'secondary'}
            className={cn(
              "h-full w-full text-3xl font-bold rounded-xl shadow-lg focus-visible:ring-primary",
              btn.area === 'zero' && 'col-span-2',
              btn.variant === 'primary' && (btn.active ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-secondary-foreground'),
            )}
            style={{ gridArea: btn.area }}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </main>
  );
}
