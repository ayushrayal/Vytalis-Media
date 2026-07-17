import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

export const DEFAULT_CARDS = [
  'spend',
  'purchases',
  'cpa',
  'roas',
  'purchaseConversionValue',
  'ctr',
  'cpm',
  'cpc',
  'reach',
  'impressions',
  'linkClicks',
  'frequency'
];

export const MIN_VISIBLE_CARDS = 3;
export const MAX_VISIBLE_CARDS = 20;

const getCacheKey = (userId) => `dashboard_preferences_v1_${userId || 'guest'}`;

/**
 * Normalizes and merges card preferences with available cards.
 * Ensures any new card not previously in user preferences is appended and default-visible.
 */
export const normalizePreferences = (prefs, availableKeys = DEFAULT_CARDS) => {
  let cardOrder = Array.isArray(prefs?.cardOrder) && prefs.cardOrder.length > 0
    ? [...prefs.cardOrder]
    : [...DEFAULT_CARDS];
  
  let visibleCards = Array.isArray(prefs?.visibleCards)
    ? [...prefs.visibleCards]
    : [...DEFAULT_CARDS];

  // Append any available keys not present in cardOrder
  availableKeys.forEach((key) => {
    if (!cardOrder.includes(key)) {
      cardOrder.push(key);
    }
    if (!visibleCards.includes(key) && !prefs?.visibleCards) {
      visibleCards.push(key);
    }
  });

  // Filter out any ordered keys that are no longer valid available keys
  cardOrder = cardOrder.filter((k) => availableKeys.includes(k) || DEFAULT_CARDS.includes(k));
  visibleCards = visibleCards.filter((k) => cardOrder.includes(k));

  return {
    version: prefs?.version || 1,
    visibleCards,
    cardOrder
  };
};

export const useDashboardPreferences = (availableKeys = DEFAULT_CARDS) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || user?._id;
  const cacheKey = getCacheKey(userId);

  // Synchronous read from localStorage for instant render (<10ms)
  const [preferences, setPreferencesState] = useState(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return normalizePreferences(parsed, availableKeys);
      }
    } catch (err) {
      console.warn('Failed to parse cached dashboard preferences:', err);
    }
    return normalizePreferences(null, availableKeys);
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
  const debounceTimerRef = useRef(null);

  // Save to localStorage helper
  const saveToLocalStorage = useCallback((newPrefs) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(newPrefs));
    } catch (e) {
      console.warn('Failed to write dashboard preferences to localStorage:', e);
    }
  }, [cacheKey]);

  // Fetch from server in background
  const { data: serverPrefs } = useQuery({
    queryKey: ['dashboardPreferences', userId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/users/dashboard-preferences`);
      return response.data?.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Sync server data if different and user has not pending un-saved changes
  useEffect(() => {
    if (serverPrefs && !isDirty) {
      const normalized = normalizePreferences(serverPrefs, availableKeys);
      setPreferencesState(normalized);
      saveToLocalStorage(normalized);
    }
  }, [serverPrefs, isDirty, availableKeys, saveToLocalStorage]);

  // Server Mutation with optimistic update
  const saveMutation = useMutation({
    mutationFn: async (updatedPrefs) => {
      const response = await axios.put(`${API_URL}/api/users/dashboard-preferences`, updatedPrefs);
      return response.data?.data;
    },
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: (data) => {
      setSaveStatus('saved');
      setIsDirty(false);
      if (data) {
        const normalized = normalizePreferences(data, availableKeys);
        queryClient.setQueryData(['dashboardPreferences', userId], normalized);
        saveToLocalStorage(normalized);
      }
    },
    onError: (err) => {
      console.error('Failed to auto-save dashboard preferences to backend:', err);
      setSaveStatus('error');
      // Keep isDirty = true so user can retry or preferences aren't lost
      setIsDirty(true);
    }
  });

  // Reset Mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${API_URL}/api/users/dashboard-preferences/reset`);
      return response.data?.data;
    },
    onSuccess: () => {
      const defaults = normalizePreferences(null, availableKeys);
      setPreferencesState(defaults);
      saveToLocalStorage(defaults);
      queryClient.setQueryData(['dashboardPreferences', userId], defaults);
      setSaveStatus('saved');
      setIsDirty(false);
    },
    onError: (err) => {
      console.error('Failed to reset dashboard preferences:', err);
      setSaveStatus('error');
    }
  });

  // Debounced API save (500ms window)
  const scheduleDebouncedSave = useCallback((newPrefs) => {
    setSaveStatus('saving');
    setIsDirty(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveMutation.mutate(newPrefs);
    }, 500);
  }, [saveMutation]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Public Actions
  const updatePreferences = useCallback((newPartial) => {
    setPreferencesState((prev) => {
      const updated = normalizePreferences({ ...prev, ...newPartial }, availableKeys);
      saveToLocalStorage(updated);
      scheduleDebouncedSave(updated);
      return updated;
    });
  }, [availableKeys, saveToLocalStorage, scheduleDebouncedSave]);

  const toggleCardVisibility = useCallback((cardKey) => {
    setPreferencesState((prev) => {
      const isCurrentlyVisible = prev.visibleCards.includes(cardKey);
      if (isCurrentlyVisible && prev.visibleCards.length <= MIN_VISIBLE_CARDS) {
        // Return unchanged if trying to drop below minimum visible cards
        return prev;
      }

      const nextVisible = isCurrentlyVisible
        ? prev.visibleCards.filter((k) => k !== cardKey)
        : [...prev.visibleCards, cardKey];

      const updated = normalizePreferences({ ...prev, visibleCards: nextVisible }, availableKeys);
      saveToLocalStorage(updated);
      scheduleDebouncedSave(updated);
      return updated;
    });
  }, [availableKeys, saveToLocalStorage, scheduleDebouncedSave]);

  const reorderCards = useCallback((newCardOrder) => {
    setPreferencesState((prev) => {
      const updated = normalizePreferences({ ...prev, cardOrder: newCardOrder }, availableKeys);
      saveToLocalStorage(updated);
      scheduleDebouncedSave(updated);
      return updated;
    });
  }, [availableKeys, saveToLocalStorage, scheduleDebouncedSave]);

  const resetPreferences = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const defaults = normalizePreferences(null, availableKeys);
    setPreferencesState(defaults);
    saveToLocalStorage(defaults);
    resetMutation.mutate();
  }, [availableKeys, saveToLocalStorage, resetMutation]);

  return {
    visibleCards: preferences.visibleCards,
    cardOrder: preferences.cardOrder,
    version: preferences.version,
    isDirty,
    saveStatus,
    updatePreferences,
    toggleCardVisibility,
    reorderCards,
    resetPreferences,
    minVisibleCards: MIN_VISIBLE_CARDS
  };
};

export default useDashboardPreferences;
