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
  
  const handleBackspace = () => {
    setInputValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
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
    { label: "", action: () => { /* TODO: History */ }, variant: "custom" as const, customColor: "#919191", icon: <History size={28} className="text-black" /> },
    { label: "4", action: () => handleNumberPress("4") },
    { label: "5", action: () => handleNumberPress("5") },
    { label: "6", action: () => handleNumberPress("6") },
    { label: "", action: () => { /* TODO */ }, variant: "custom" as const, customColor: "#919191", icon: <LineChart size={28} className="text-black" /> },
    { label: "1", action: () => handleNumberPress("1") },
    { label: "2", action: () => handleNumberPress("2") },
    { label: "3", action: () => handleNumberPress("3") },
    { label: "", action: () => { /* TODO */ }, variant: "custom" as const, customColor: "#919191", icon: <Plus size={28} className="text-black" /> },
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

  const CurrencyButton = ({ active, label, children, onClick }: {active: boolean, label: string, children: React.ReactNode, onClick: () => void}) => (
    <div className="flex flex-col items-center gap-2">
      <Button 
        onClick={onClick} 
        variant={active ? 'primary' : 'outline'} 
        className={cn("rounded-full h-12 w-12 p-0 text-lg font-bold", active ? "bg-primary" : "border-primary text-primary")}
      >
        {children}
      </Button>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
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
              <div className="flex items-center space-x-4">
                  <CurrencyButton onClick={() => handleCurrencyButtonClick("USD")} active={foreignCurrency === 'USD' && !isCustomRateActive} label="USD">
                      $
                  </CurrencyButton>
                   <CurrencyButton onClick={() => handleCurrencyButtonClick("EUR")} active={foreignCurrency === 'EUR' && !isCustomRateActive} label="EUR">
                      €
                  </CurrencyButton>
                  <CurrencyButton onClick={() => setIsCustomRateActive(true)} active={isCustomRateActive} label="CUSTOM">
                      <Pencil size={20} />
                  </CurrencyButton>
              </div>
              <div className="flex-1 relative flex justify-end">
                {isCustomRateActive ? (
                  <>
                  <Input
                    type="text"
                    placeholder={`Tasa`}
                    value={customRate}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,.]/g, '');
                      setCustomRate(value);
                    }}
                    className="bg-transparent border-0 border-b-2 border-primary rounded-none px-0 text-lg text-right focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground w-24"
                  />
                  {customRate && (
                     <Button onClick={() => setCustomRate("")} variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground">
                        <X size={16}/>
                     </Button>
                  )}
                  </>
                ) : (
                  <Button onClick={handleBackspace} variant="ghost" size="icon" className="h-12 w-12 text-primary/50 hover:text-primary">
                    <Delete size={40} strokeWidth={1.5} />
                  </Button>
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
              btn.variant === 'custom' && 'flex-col text-xs',
              !btn.variant && 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
            style={btn.variant === 'custom' ? { backgroundColor: btn.customColor } : {}}
            size={'icon'}
          >
            {btn.variant === 'custom' ? btn.icon : null}
            {typeof btn.label === 'string' && btn.label}
            {typeof btn.label !== 'string' && btn.variant !== 'custom' ? btn.label : null}
          </Button>
        ))}
      </div>
    </main>
  );
}
