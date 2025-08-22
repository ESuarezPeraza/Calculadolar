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
          USD: 36.53,
          EUR: 39.28,
        },
        date: formattedDate,
      });
    }, 300);
  });
};
