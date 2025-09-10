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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
const HistoryChart = React.lazy(() => import('@/components/ui/history-chart').then(module => ({ default: module.HistoryChart })));
import { triggerHapticFeedback } from "@/lib/haptics";

type ForeignCurrency = "USD" | "EUR";
type Currency = ForeignCurrency | "VES";
type Direction = "foreign-to-ves" | "ves-to-foreign";
type State = {
  currentOperand: string;
  expression: string;
  overwrite: boolean;
};

const INITIAL_STATE: State = {
  currentOperand: "0",
  expression: "",
  overwrite: false,
};

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  VES: "Bs",
};

const formatValue = (value: string | number) => {
  const num = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (isNaN(num)) return "0,00";
  if (num === 0) return "0";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDisplayValue = (value: string | number) => {
  let valueStr = typeof value === 'string' ? value : value.toString();
  
  if (valueStr === "0") return "0";

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
    const date = new Date(`${dateString}T00:00:00`); 
    const formatted = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);

    const finalString = formatted.replace(/ de (\d{4})/, ' $1');
    return finalString.charAt(0).toUpperCase() + finalString.slice(1);
};

function evaluate(expression: string): number {
    if (!expression) return 0;
    
    const values = expression.replace(/,/g, '.').split('+').map(v => v.trim());
    
    const sum = values.reduce((acc, value) => {
        const num = parseFloat(value);
        return acc + (isNaN(num) ? 0 : num);
    }, 0);

    return sum;
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
  const [inputValueForConversion, setInputValueForConversion] = React.useState("0");
  const [animationError, setAnimationError] = React.useState(false);
  const [isSwapping, setIsSwapping] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isChartOpen, setIsChartOpen] = React.useState(false);

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
    setOutputValue(formatValue(result.toFixed(2)));
  }, [activeRate, direction]);

  React.useEffect(() => {
    calculateConversion(inputValueForConversion);
  }, [inputValueForConversion, activeRate, direction, fromCurrency, toCurrency, calculateConversion]);
  
  React.useEffect(() => {
    if (!state.expression) {
      setInputValueForConversion(state.currentOperand);
    }
  }, [state.currentOperand, state.expression])

  const handleNumberPress = (num: string) => {
    triggerHapticFeedback();
    if (state.overwrite) {
        setState({ ...INITIAL_STATE, currentOperand: num, overwrite: false });
        return;
    }
    if (state.currentOperand === "0" && num === "0") return;
    if (state.currentOperand.replace(",", "").length >= 15) {
      triggerErrorAnimation();
      return;
    }
    setState(s => ({ ...s, currentOperand: s.currentOperand === "0" ? num : s.currentOperand + num}));
  };
  
  const handleBackspace = () => {
    triggerHapticFeedback();
    if (state.overwrite) {
        setState({ ...INITIAL_STATE });
        setInputValueForConversion("0");
        return;
    }
    if (state.currentOperand.length === 1) {
        setState(s => ({ ...s, currentOperand: "0" }));
        return;
    }
    setState(s => ({...s, currentOperand: s.currentOperand.slice(0, -1) }));
  };

  const handleDecimalPress = () => {
    triggerHapticFeedback();
    if (state.overwrite) {
        setState({ ...INITIAL_STATE, currentOperand: "0,", overwrite: false });
        return;
    }
    if (state.currentOperand.includes(",")) {
      triggerErrorAnimation();
      return;
    }
    setState(s => ({ ...s, currentOperand: s.currentOperand + "," }));
  };

  const handleClear = () => {
    triggerHapticFeedback([50, 50, 50]);
    setState(INITIAL_STATE);
    setInputValueForConversion("0");
  };
  
  const handleOperationPress = (operation: string) => {
    triggerHapticFeedback();
    if(state.currentOperand === '0' && state.expression === '') {
      triggerErrorAnimation();
      return;
    }

    const newExpression = `${state.expression}${state.currentOperand} ${operation} `;

    setState(s => ({
      ...s,
      expression: newExpression,
      currentOperand: "0"
    }));
  };
  
  const handleEquals = () => {
    triggerHapticFeedback();
    if (!state.expression && state.currentOperand === "0") {
      triggerErrorAnimation();
      return;
    }
    
    const finalExpression = `${state.expression}${state.currentOperand}`;
    const result = evaluate(finalExpression);
    const resultStr = isNaN(result) ? "0" : result.toString().replace('.', ',');

    setHistory(prevHistory => [...prevHistory, `${finalExpression} = ${resultStr}`]);
    
    setInputValueForConversion(resultStr);
    setState({
      ...INITIAL_STATE,
      currentOperand: resultStr,
      overwrite: true,
    });
  };

  const handleSwap = () => {
    triggerHapticFeedback();
    setIsSwapping(true);
    setTimeout(() => {
      setDirection((prev) => (prev === "foreign-to-ves" ? "ves-to-foreign" : "foreign-to-ves"));
      setIsSwapping(false);
    }, 200);
  };

  const triggerErrorAnimation = () => {
    setAnimationError(true);
    triggerHapticFeedback([100, 50, 100]);
    setTimeout(() => setAnimationError(false), 500);
  };

  const handleCurrencyButtonClick = (currency: ForeignCurrency) => {
    triggerHapticFeedback();
    setForeignCurrency(currency);
    setIsCustomRateActive(false);
  }
  
  type KeypadButton = {
  label: React.ReactNode;
  action: () => void;
  variant?: "ghost" | "destructive" | "primary" | "secondary";
  className?: string;
  "aria-label"?: string;
};

const keypadButtons: KeypadButton[] = [
    { label: "7", action: () => handleNumberPress("7") },
    { label: "8", action: () => handleNumberPress("8") },
    { label: "9", action: () => handleNumberPress("9") },
    { label: <History size={20} />, action: () => setIsHistoryOpen(true), variant: "ghost" as const, className: "text-muted-foreground hover:text-foreground", "aria-label": "Ver historial de cálculos" },
    { label: "4", action: () => handleNumberPress("4") },
    { label: "5", action: () => handleNumberPress("5") },
    { label: "6", action: () => handleNumberPress("6") },
    { label: <LineChart size={20} />, action: () => setIsChartOpen(true), variant: "ghost" as const, className: "text-muted-foreground hover:text-foreground", "aria-label": "Ver gráfico de historial de tasas" },
    { label: "1", action: () => handleNumberPress("1") },
    { label: "2", action: () => handleNumberPress("2") },
    { label: "3", action: () => handleNumberPress("3") },
    { label: <Plus size={24} />, action: () => handleOperationPress('+'), variant: "ghost" as const, className: "text-muted-foreground hover:text-foreground", "aria-label": "Sumar" },
    { label: "C", action: handleClear, variant: "destructive" as const },
    { label: "0", action: () => handleNumberPress("0") },
    { label: ",", action: handleDecimalPress },
    { label: <Equal size={24} />, action: handleEquals, variant: "primary" as const, "aria-label": "Calcular resultado" },
  ];

  const MainDisplay = ({ currency, amount }: { currency: string; amount: string | number;}) => (
      <div className={cn("flex justify-between items-baseline px-1 py-0", animationError && "animate-shake")}>
          <div className="flex items-center gap-2">
              <span className="font-normal text-2xl text-muted-foreground/80">{currencySymbols[currency as Currency]}</span>
          </div>
          <p className="font-sans font-normal text-4xl text-right break-all leading-tight">{formatDisplayValue(amount)}</p>
      </div>
  );
  
  const ExpressionDisplay = ({ expression }: { expression: string }) => (
      <div className="flex justify-end items-baseline min-h-[1.5rem] px-1">
          <p className="font-sans font-normal text-sm text-right break-all text-muted-foreground/70 truncate">
            {expression.replace(/\+/g, ' + ')}
          </p>
      </div>
  );

  const ConversionResultDisplay = ({ currency, amount}: { currency: string; amount: string | number}) => (
    <div className="flex items-center justify-between px-1 py-1 bg-muted/20 rounded-xl border border-border/50">
            <div className="flex items-center text-sm gap-2 text-muted-foreground">
        <button 
          onClick={handleSwap}
          className="p-1.5 rounded-full hover:bg-primary/10 transition-colors duration-200"
          aria-label="Intercambiar divisas"
        >
            <ArrowRightLeft size={16} className="text-primary" />
        </button>
        <span className="font-sans font-normal text-base">{currencySymbols[currency as Currency]}</span>
      </div>
      <p className="font-sans font-normal text-lg text-right break-all text-muted-foreground pr-2">{formatDisplayValue(amount)}</p>
    </div>
  );

  const CurrencyButton = ({ active, label, children, onClick }: {active: boolean, label: string, children: React.ReactNode, onClick: () => void}) => (
    <div className="flex flex-col items-center gap-2">
      <Button 
        onClick={onClick} 
        variant={active ? 'primary' : 'outline'} 
        className={cn("h-10 w-16 text-lg font-normal rounded-3xl", active ? "bg-primary" : "border-primary text-primary")}
      >
        {children}
      </Button>
      <span className="text-xs font-normal text-muted-foreground">{label}</span>
    </div>
  );
  
  return (
    <main className="h-screen max-h-screen w-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20 text-foreground overflow-hidden font-sans">
      {/* Header with exchange rate info */}
      <div className="px-4 pt-3">
        <div className="flex justify-between items-center text-xs text-muted-foreground/80">
          <div className="text-left capitalize font-normal">
            {isLoading ? <Skeleton className="h-4 w-40 bg-muted-foreground/20" /> : formatRateDate(rates?.date ?? '')}
          </div>
          <div className="text-right font-normal">
              {isLoading ? (
                <Skeleton className="h-4 w-28 bg-muted-foreground/20" />
              ) : (
                `1 ${isCustomRateActive ? 'Tasa' : foreignCurrency} = ${formatValue(activeRate)} Bs`
              )}
          </div>
        </div>
      </div>

      {/* Display area */}
      <div className={cn("flex-1 flex flex-col justify-end px-4 space-y-1 py-1 transition-opacity duration-200", isSwapping ? "opacity-0" : "opacity-100")}>
        <ExpressionDisplay expression={state.expression} />
        
        <div className="bg-card/50 rounded-2xl p-2 border border-border/30 backdrop-blur-sm">
          <MainDisplay currency={fromCurrency} amount={state.currentOperand} />
        </div>
       
        <ConversionResultDisplay currency={toCurrency} amount={outputValue} />
      </div>

      {/* Currency selection and controls */}
      <div className="px-4 py-2 space-y-2">
          <div className="flex justify-between items-center space-x-4">
              <div className="flex items-center space-x-3">
                  <CurrencyButton onClick={() => handleCurrencyButtonClick("USD")} active={foreignCurrency === 'USD' && !isCustomRateActive} label="USD">
                      $
                  </CurrencyButton>
                   <CurrencyButton onClick={() => handleCurrencyButtonClick("EUR")} active={foreignCurrency === 'EUR' && !isCustomRateActive} label="EUR">
                      €
                  </CurrencyButton>
                  <CurrencyButton onClick={() => setIsCustomRateActive(true)} active={isCustomRateActive} label="CUSTOM">
                      <Pencil size={18} aria-label="Editar tasa de cambio personalizada" />
                  </CurrencyButton>
              </div>
              <div className="flex-1 relative flex justify-end">
                {isCustomRateActive ? (
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Tasa personalizada"
                      value={customRate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9,.]/g, '');
                        setCustomRate(value);
                      }}
                      className="bg-transparent border-0 border-b-2 border-primary rounded-none px-0 text-sm text-right focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 w-24 font-normal"
                    />
                    {customRate && (
                       <Button onClick={() => setCustomRate("")} variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Borrar tasa de cambio personalizada">
                          <X size={16}/>
                       </Button>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={handleBackspace} 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200"
                    aria-label="Borrar último caracter"
                  >
                    <Delete size={22} strokeWidth={1.5} />
                  </Button>
                )}
              </div>
          </div>
           <Separator className="bg-border/30 mt-1" />
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-2 px-3 pb-3">
        {keypadButtons.map((btn, i) => (
          <Button
            key={i}
            onClick={btn.action}
            variant={btn.variant || "secondary"}
            className={cn(
              "h-16 w-full text-2xl font-normal rounded-2xl aspect-square transition-all duration-200 transform hover:scale-105 active:scale-95",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              btn.variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25',
              btn.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/25',
              btn.variant === 'ghost' && 'hover:bg-muted/50',
              !btn.variant && 'bg-secondary/80 text-secondary-foreground hover:bg-secondary shadow-sm',
              btn.className
            )}
            size={'icon'}
            aria-label={btn["aria-label"]}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Historial de Cálculos</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {history.length > 0 ? (
              history.map((item, index) => (
                <div key={index} className="p-2 bg-muted/50 rounded-lg">
                  {item}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No hay historial de cálculos.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isChartOpen} onOpenChange={setIsChartOpen}>
        <SheetContent className="min-w-[80vw]">
          <SheetHeader>
            <SheetTitle>Historial de Tasa de Cambio (Últimos 30 días)</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <React.Suspense fallback={<Skeleton className="h-[400px] w-full bg-muted-foreground/20" />}>
              <HistoryChart currency={foreignCurrency} />
            </React.Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
