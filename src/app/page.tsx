"use client";

import * as React from "react";
import { ArrowRightLeft, Delete, Pencil, History, LineChart, Plus, Equal, X } from "lucide-react";
import { getExchangeRates, type ExchangeRateData } from "@/lib/rates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type ForeignCurrency = "USD" | "EUR";
type Currency = ForeignCurrency | "VES";
type Direction = "foreign-to-ves" | "ves-to-foreign";

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  VES: "Bs",
};

const formatValue = (value: string | number) => {
  const num = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDisplayValue = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
    const parts = value.toString().split('.');
    const integerPart = new Intl.NumberFormat("de-DE").format(parseInt(parts[0]));
    return parts.length > 1 ? `${integerPart},${parts[1]}` : integerPart;
};

const formatRateDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`); // Ensure correct parsing
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export default function Home() {
  const { toast } = useToast();
  const [rates, setRates] = React.useState<ExchangeRateData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [inputValue, setInputValue] = React.useState("0");
  const [outputValue, setOutputValue] = React.useState("0");
  const [direction, setDirection] = React.useState<Direction>("foreign-to-ves");
  const [foreignCurrency, setForeignCurrency] = React.useState<ForeignCurrency>("USD");
  const [isCustomRateActive, setIsCustomRateActive] = React.useState(false);
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
    if (isCustomRateActive && customRate) {
      const parsedCustom = parseFloat(customRate.replace(",", "."));
      return isNaN(parsedCustom) ? 0 : parsedCustom;
    }
    return rates?.rates[foreignCurrency] ?? 0;
  }, [isCustomRateActive, customRate, rates, foreignCurrency]);

  const fromCurrency: Currency = direction === "foreign-to-ves" ? foreignCurrency : "VES";
  const toCurrency: Currency = direction === "foreign-to-ves" ? "VES" : foreignCurrency;

  const calculateConversion = React.useCallback(() => {
    const parsedInput = parseFloat(inputValue.replace(",", "."));
    if (isNaN(parsedInput) || activeRate === 0) {
      setOutputValue("0");
      return;
    }
    const result = direction === "foreign-to-ves" ? parsedInput * activeRate : parsedInput / activeRate;
    setOutputValue(result.toString());
  }, [inputValue, activeRate, direction]);

  const handleNumberPress = (num: string) => {
    if (inputValue.replace(",", "").length >= 15) return;
    setInputValue((prev) => (prev === "0" ? num : prev + num));
  };

  const handleDecimalPress = () => {
    if (inputValue.includes(".")) return;
    setInputValue((prev) => prev + ".");
  };

  const handleClear = () => {
    setInputValue("0");
    setOutputValue("0");
  };
  
  const handleEquals = () => {
    calculateConversion();
  };

  const handleSwap = () => {
    setDirection((prev) => (prev === "foreign-to-ves" ? "ves-to-foreign" : "foreign-to-ves"));
    // Swap values
    const currentInput = inputValue;
    setInputValue(outputValue === "0" ? "0" : formatValue(outputValue).replace(/\./g, '').replace(',', '.'));
    setOutputValue(currentInput);
  };

  React.useEffect(() => {
     if (inputValue === "0") {
        setOutputValue("0");
        return;
    }
    calculateConversion();
  }, [inputValue, activeRate, direction, fromCurrency, toCurrency, calculateConversion]);

  const handleCurrencyButtonClick = (currency: ForeignCurrency) => {
    setForeignCurrency(currency);
    setIsCustomRateActive(false);
  }
  
  const keypadButtons = [
    { label: "7", action: () => handleNumberPress("7") },
    { label: "8", action: () => handleNumberPress("8") },
    { label: "9", action: () => handleNumberPress("9") },
    { label: <History size={28} />, action: () => { /* TODO */ }, variant: "accent" as const },
    { label: "4", action: () => handleNumberPress("4") },
    { label: "5", action: () => handleNumberPress("5") },
    { label: "6", action: () => handleNumberPress("6") },
    { label: <LineChart size={28} />, action: () => { /* TODO */ }, variant: "accent" as const },
    { label: "1", action: () => handleNumberPress("1") },
    { label: "2", action: () => handleNumberPress("2") },
    { label: "3", action: () => handleNumberPress("3") },
    { label: <Plus size={28} />, action: () => { /* TODO */ }, variant: "accent" as const },
    { label: "C", action: handleClear, variant: "destructive" as const },
    { label: "0", action: () => handleNumberPress("0") },
    { label: ",", action: handleDecimalPress },
    { label: <Equal size={28} />, action: handleEquals, variant: "primary" as const },
  ];

  const DisplayRow = ({ currency, amount }: { currency: string; amount: string | number }) => (
      <div className="flex justify-between items-baseline">
          <div className="flex items-center gap-3">
              <span className="font-bold text-4xl">{currencySymbols[currency as Currency]}</span>
          </div>
          <p className="font-sans font-normal text-6xl text-right break-all">{formatDisplayValue(amount)}</p>
      </div>
  );

  return (
    <main className="h-screen max-h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden font-sans">
      <div className="flex-1 flex flex-col justify-end p-6 space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          {isLoading ? <Skeleton className="h-4 w-48" /> : `Fecha Valor: ${formatRateDate(rates?.date ?? '')}`}
        </div>
        
        <DisplayRow currency={fromCurrency} amount={inputValue} />

        <div className="flex items-center justify-between">
          <div className="flex items-center text-2xl gap-2 text-muted-foreground">
            <button onClick={handleSwap}>
                <ArrowRightLeft size={20} className="text-primary" />
            </button>
            <span className="font-sans font-semibold">{toCurrency}</span>
          </div>
          <p className="font-sans font-normal text-4xl text-right break-all text-muted-foreground">{formatDisplayValue(outputValue)}</p>
        </div>
      </div>

      <div className="px-6 py-4 space-y-3">
          <div className="flex justify-between items-center space-x-4">
              <div className="flex items-center space-x-2">
                  <Button onClick={() => handleCurrencyButtonClick("USD")} variant={foreignCurrency === 'USD' && !isCustomRateActive ? 'primary' : 'outline'} className={cn("rounded-full h-12 w-12 p-0", foreignCurrency === 'USD' && !isCustomRateActive ? "bg-primary" : "border-primary text-primary")}>
                      <span className="text-lg font-bold">$</span>
                  </Button>
                  <Button onClick={() => handleCurrencyButtonClick("EUR")} variant={foreignCurrency === 'EUR' && !isCustomRateActive ? 'primary' : 'outline'} className={cn("rounded-full h-12 w-12 p-0", foreignCurrency === 'EUR' && !isCustomRateActive ? "bg-primary" : "border-primary text-primary")}>
                      <span className="text-lg font-bold">€</span>
                  </Button>
                  <Button onClick={() => setIsCustomRateActive(true)} variant={isCustomRateActive ? 'primary' : 'outline'} className={cn("rounded-full h-12 w-12 p-0", isCustomRateActive ? "bg-primary" : "border-primary text-primary")}>
                      <Pencil size={20} />
                  </Button>
              </div>
              <div className="flex-1 relative">
                {isCustomRateActive && (
                  <>
                  <Input
                    type="text"
                    placeholder={`Tasa Custom`}
                    value={customRate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[\d,.]*$/.test(value)) {
                        setCustomRate(value);
                      }
                    }}
                    className="bg-transparent border-0 border-b rounded-none px-0 text-lg text-right focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                  />
                  {customRate && (
                     <Button onClick={() => setCustomRate("")} variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground">
                        <X size={16}/>
                     </Button>
                  )}
                  </>
                )}
              </div>
          </div>
           <Separator className="bg-border/50" />
      </div>

      <div className="grid grid-cols-4 grid-rows-4 gap-3 p-4">
        {keypadButtons.map((btn, i) => (
          <Button
            key={i}
            onClick={btn.action}
            variant={btn.variant || "secondary"}
            className={cn(
              "h-20 w-20 text-3xl font-medium rounded-full aspect-square justify-self-center",
               "focus-visible:ring-primary focus-visible:ring-offset-background",
              btn.variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
              btn.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              btn.variant === 'accent' && 'bg-accent text-accent-foreground hover:bg-accent/90',
              !btn.variant && 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </main>
  );
}
