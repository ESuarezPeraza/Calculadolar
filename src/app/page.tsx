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
type State = {
  currentOperand: string;
  previousOperand: string | null;
  operation: string | null;
  overwrite: boolean;
};

const INITIAL_STATE: State = {
  currentOperand: "0",
  previousOperand: null,
  operation: null,
  overwrite: false,
};

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  VES: "Bs",
};

const formatValue = (value: string | number) => {
  const num = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDisplayValue = (value: string | number) => {
  let valueStr = typeof value === 'string' ? value : value.toString();
  valueStr = valueStr.replace('.', ',');

  const parts = valueStr.split(',');
  if (parts[0].length > 0) {
      const integerPart = new Intl.NumberFormat("de-DE").format(parseInt(parts[0].replace(/\./g, ''), 10));
      return parts.length > 1 ? `${integerPart},${parts[1]}` : integerPart;
  }
  return valueStr;
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

function evaluate({ currentOperand, previousOperand, operation }: State): number {
    const prev = parseFloat(previousOperand?.replace(',', '.') ?? '0');
    const current = parseFloat(currentOperand.replace(',', '.'));
    if (isNaN(prev) || isNaN(current)) return NaN;
    let computation = 0;
    switch (operation) {
        case "+":
            computation = prev + current;
            break;
    }
    return computation;
}

export default function Home() {
  const { toast } = useToast();
  const [rates, setRates] = React.useState<ExchangeRateData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [state, setState] = React.useState<State>(INITIAL_STATE);
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
  
  const calculateConversion = React.useCallback((valueToConvert: string) => {
    const parsedInput = parseFloat(valueToConvert.replace(",", "."));
    if (isNaN(parsedInput) || activeRate === 0) {
      setOutputValue("0");
      return;
    }
    const result = direction === "foreign-to-ves" ? parsedInput * activeRate : parsedInput / activeRate;
    setOutputValue(result.toFixed(2));
  }, [activeRate, direction]);


  React.useEffect(() => {
    if(state.operation === null) {
      calculateConversion(state.currentOperand);
    }
  }, [state.currentOperand, activeRate, direction, fromCurrency, toCurrency, calculateConversion, state.operation]);
  
  const handleNumberPress = (num: string) => {
    if (state.overwrite) {
        setState(s => ({ ...s, currentOperand: num, overwrite: false }));
        return;
    }
    if (state.currentOperand === "0" && num === "0") return;
    if (state.currentOperand.replace(",", "").length >= 15) return;
    setState(s => ({ ...s, currentOperand: s.currentOperand === "0" ? num : s.currentOperand + num}));
  };
  
  const handleBackspace = () => {
    if (state.overwrite) {
        setState({ ...INITIAL_STATE });
        return;
    }
    if (state.currentOperand.length === 1) {
        setState(s => ({ ...s, currentOperand: "0" }));
        return;
    }
    setState(s => ({...s, currentOperand: s.currentOperand.slice(0, -1) }));
  };

  const handleDecimalPress = () => {
    if (state.overwrite) {
        setState(s => ({ ...s, currentOperand: "0,", overwrite: false }));
        return;
    }
    if (state.currentOperand.includes(",")) return;
    setState(s => ({ ...s, currentOperand: s.currentOperand + "," }));
  };

  const handleClear = () => {
    setState(INITIAL_STATE);
    setOutputValue("0");
  };
  
  const handleOperationPress = (operation: string) => {
    if (state.previousOperand == null) {
      setState(s => ({
        ...s,
        operation,
        previousOperand: s.currentOperand,
        currentOperand: "0"
      }));
      return;
    }

    const result = evaluate(state);
    const resultStr = isNaN(result) ? "0" : result.toString().replace('.', ',');
    setState({
        ...state,
        previousOperand: resultStr,
        operation: operation,
        currentOperand: "0"
    });
  };
  
  const handleEquals = () => {
    if (state.operation == null || state.previousOperand == null) {
        return;
    }
    const result = evaluate(state);
    const resultStr = isNaN(result) ? "0" : result.toString().replace('.', ',');
    
    setState({
      previousOperand: null,
      operation: null,
      currentOperand: resultStr,
      overwrite: true,
    });
    calculateConversion(resultStr);
  };

  const handleSwap = () => {
    setDirection((prev) => (prev === "foreign-to-ves" ? "ves-to-foreign" : "foreign-to-ves"));
    setState(INITIAL_STATE);
    const currentOutput = outputValue;
  
    let newInputValue = "0";
    if (currentOutput !== "0") {
        const num = parseFloat(currentOutput);
        newInputValue = isNaN(num) ? "0" : num.toString().replace('.', ',');
    }
    
    setState(s => ({...s, currentOperand: newInputValue}));
    setOutputValue(state.currentOperand.replace(',', '.'));
  };

  const handleCurrencyButtonClick = (currency: ForeignCurrency) => {
    setForeignCurrency(currency);
    setIsCustomRateActive(false);
  }
  
  const keypadButtons = [
    { label: "7", action: () => handleNumberPress("7") },
    { label: "8", action: () => handleNumberPress("8") },
    { label: "9", action: () => handleNumberPress("9") },
    { label: <History size={28} />, action: () => { /* TODO: History */ }, variant: "custom" as const, customColor: "#919191", icon: <History size={28} className="text-black" /> },
    { label: "4", action: () => handleNumberPress("4") },
    { label: "5", action: () => handleNumberPress("5") },
    { label: "6", action: () => handleNumberPress("6") },
    { label: <LineChart size={28} />, action: () => { /* TODO */ }, variant: "custom" as const, customColor: "#919191", icon: <LineChart size={28} className="text-black" /> },
    { label: "1", action: () => handleNumberPress("1") },
    { label: "2", action: () => handleNumberPress("2") },
    { label: "3", action: () => handleNumberPress("3") },
    { label: <Plus size={28} />, action: () => handleOperationPress('+'), variant: "custom" as const, customColor: "#919191", icon: <Plus size={28} className="text-black" /> },
    { label: "C", action: handleClear, variant: "destructive" as const },
    { label: "0", action: () => handleNumberPress("0") },
    { label: ",", action: handleDecimalPress },
    { label: <Equal size={28} />, action: handleEquals, variant: "primary" as const },
  ];

  const DisplayRow = ({ currency, amount, isSub = false }: { currency: string; amount: string | number; isSub?: boolean }) => (
      <div className={cn("flex justify-between items-baseline", isSub && "min-h-[2rem]")}>
          <div className="flex items-center gap-3">
              <span className={cn("font-bold", isSub ? "text-xl text-muted-foreground" : "text-4xl")}>{currencySymbols[currency as Currency]}</span>
          </div>
          <p className={cn("font-sans font-normal text-right break-all", isSub ? "text-2xl text-muted-foreground" : "text-6xl")}>{formatDisplayValue(amount)}</p>
      </div>
  );

  const CurrencyButton = ({ active, label, children, onClick }: {active: boolean, label: string, children: React.ReactNode, onClick: () => void}) => (
    <div className="flex flex-col items-center gap-2">
      <Button 
        onClick={onClick} 
        variant={active ? 'primary' : 'outline'} 
        className={cn("h-10 w-16 text-lg font-bold rounded-3xl", active ? "bg-primary" : "border-primary text-primary")}
      >
        {children}
      </Button>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </div>
  );

  return (
    <main className="h-screen max-h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden font-sans">
      <div className="flex-1 flex flex-col justify-end p-6 space-y-4">
        <div className="text-sm text-muted-foreground mb-1">
          {isLoading ? <Skeleton className="h-4 w-48" /> : `Fecha Valor: ${formatRateDate(rates?.date ?? '')}`}
        </div>
        <div className="text-sm text-muted-foreground mb-4">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              `1 ${isCustomRateActive ? 'Tasa' : foreignCurrency} = ${formatValue(activeRate)} Bs`
            )}
        </div>
        
        {state.previousOperand && (
          <DisplayRow currency={fromCurrency} amount={`${formatDisplayValue(state.previousOperand)} ${state.operation}`} isSub />
        )}
        <DisplayRow currency={fromCurrency} amount={state.currentOperand} />

        <div className="flex items-center justify-between">
          <div className="flex items-center text-2xl gap-2 text-muted-foreground">
            <button onClick={handleSwap}>
                <ArrowRightLeft size={20} className="text-primary" />
            </button>
            <span className="font-sans font-semibold">{currencySymbols[toCurrency]}</span>
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
                    <Delete size={32} strokeWidth={1.5} />
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
              btn.variant === 'custom' && 'flex items-center justify-center text-xs',
              !btn.variant && 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
            style={btn.variant === 'custom' ? { backgroundColor: btn.customColor } : {}}
            size={'icon'}
          >
            {btn.icon ? btn.icon : btn.label}
          </Button>
        ))}
      </div>
    </main>
  );
}
