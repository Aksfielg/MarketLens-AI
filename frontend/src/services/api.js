import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

/** Shared client for endpoints not wrapped in helpers (e.g. video generation). */
export const api = axios.create({ baseURL: BASE_URL });

export const getSignals = async () => {
  const response = await axios.get(`${BASE_URL}/signals`);
  return response.data;
};

export const getStockDetail = async (symbol) => {
  const response = await axios.get(`${BASE_URL}/signal/${symbol}`);
  return response.data;
};

export const getBacktest = async (symbol, pattern) => {
  const response = await axios.get(`${BASE_URL}/backtest/${symbol}/${pattern}`);
  return response.data;
};
