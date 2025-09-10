export interface ExchangeRateData {
  rates: {
    USD: number;
    EUR: number;
  };
  date: string;
}

export const getExchangeRates = async (): Promise<ExchangeRateData> => {
  // In a real application, this would fetch data from the BCV API
  // or another reliable source. For this example, we return mock data.
  return new Promise(resolve => {
    setTimeout(() => {
      const date = new Date();
      const formattedDate = new Intl.DateTimeFormat('en-CA').format(date); // YYYY-MM-DD
      resolve({
        rates: {
          USD: 140.33,
          EUR: 151.2,
        },
                date: formattedDate,
      });
    }, 300);
  });
};

export interface HistoricalRate {
  date: string;
  rate: number;
}

export const getHistoricalRates = async (currency: 'USD' | 'EUR'): Promise<HistoricalRate[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const rates: HistoricalRate[] = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const formattedDate = new Intl.DateTimeFormat('en-CA').format(date); // YYYY-MM-DD
        
        // Mock rate fluctuation
        const baseRate = currency === 'USD' ? 140.33 : 151.2;
        const fluctuation = (Math.random() - 0.5) * 5;
        const rate = baseRate + fluctuation;
        
        rates.push({ date: formattedDate, rate: parseFloat(rate.toFixed(2)) });
      }
      resolve(rates);
    }, 500);
  });
};
