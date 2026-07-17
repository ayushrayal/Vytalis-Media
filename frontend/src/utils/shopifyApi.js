import api, { API_URL } from '../config/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Fetch current Shopify connection status.
 */
export const getShopifyStatus = async () => {
  const response = await api.get('/api/shopify/status');
  return response.data.data;
};

/**
 * Initiate Shopify OAuth Install flow by fetching authorization redirect URL.
 */
export const fetchShopifyInstallUrl = async (storeDomain) => {
  const response = await api.get('/api/shopify/install', {
    params: { shop: storeDomain }
  });
  return response.data?.data?.redirectUrl || response.data?.redirectUrl;
};

/**
 * Connect or reconnect a Shopify store.
 */
export const connectShopify = async ({ storeDomain, accessToken, scopes }) => {
  const response = await api.post('/api/shopify/connect', {
    storeDomain,
    accessToken,
    scopes
  });
  return response.data.data;
};

/**
 * Disconnect current Shopify store.
 */
export const disconnectShopify = async () => {
  const response = await api.post('/api/shopify/disconnect');
  return response.data.data;
};

/**
 * Analytics API fetchers
 */
export const getShopifyOverview = async ({ preset = '30d', refresh = false }) => {
  const response = await api.get('/api/shopify/dashboard', {
    params: { preset, refresh: refresh ? 'true' : 'false' }
  });
  return response.data;
};

export const getShopifySalesTrend = async ({ preset = '30d', refresh = false }) => {
  const response = await api.get('/api/shopify/sales-trend', {
    params: { preset, refresh: refresh ? 'true' : 'false' }
  });
  return response.data;
};

export const getShopifyTopProducts = async ({ preset = '30d', limit = 10, refresh = false }) => {
  const response = await api.get('/api/shopify/top-products', {
    params: { preset, limit, refresh: refresh ? 'true' : 'false' }
  });
  return response.data;
};

export const getShopifyRecentOrders = async ({ limit = 10, refresh = false }) => {
  const response = await api.get('/api/shopify/recent-orders', {
    params: { limit, refresh: refresh ? 'true' : 'false' }
  });
  return response.data;
};

/**
 * React Query Hooks
 */
export const useShopifyStatus = () => {
  return useQuery({
    queryKey: ['shopifyStatus'],
    queryFn: getShopifyStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
};

export const useConnectShopify = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectShopify,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopifyStatus'] });
      queryClient.invalidateQueries({ queryKey: ['shopify'] });
    }
  });
};

export const useDisconnectShopify = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectShopify,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopifyStatus'] });
      queryClient.invalidateQueries({ queryKey: ['shopify'] });
    }
  });
};

export const useShopifyOverview = (preset = '30d', enabled = true) => {
  return useQuery({
    queryKey: ['shopify', 'overview', preset],
    queryFn: () => getShopifyOverview({ preset }),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
};

export const useShopifySalesTrend = (preset = '30d', enabled = true) => {
  return useQuery({
    queryKey: ['shopify', 'trend', preset],
    queryFn: () => getShopifySalesTrend({ preset }),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
};

export const useShopifyTopProducts = (preset = '30d', limit = 10, enabled = true) => {
  return useQuery({
    queryKey: ['shopify', 'products', preset, limit],
    queryFn: () => getShopifyTopProducts({ preset, limit }),
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1
  });
};

export const useShopifyRecentOrders = (limit = 10, enabled = true) => {
  return useQuery({
    queryKey: ['shopify', 'orders', limit],
    queryFn: () => getShopifyRecentOrders({ limit }),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
};
