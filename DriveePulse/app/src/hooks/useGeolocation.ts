import { useState, useEffect } from 'react';

interface Position {
  lat: number;
  lng: number;
}

interface UseGeolocationReturn {
  position: Position | null;
  isLoading: boolean;
  error: string | null;
  getCurrentPosition: () => void;
}

export const useGeolocation = (): UseGeolocationReturn => {
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается браузером');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (error) => {
        setError(getGeolocationErrorMessage(error));
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.';
      case error.POSITION_UNAVAILABLE:
        return 'Информация о местоположении недоступна.';
      case error.TIMEOUT:
        return 'Время ожидания получения геолокации истекло.';
      default:
        return 'Произошла неизвестная ошибка при получении геолокации.';
    }
  };

  useEffect(() => {
    // Автоматически получаем позицию при монтировании компонента
    getCurrentPosition();
  }, []);

  return { position, isLoading, error, getCurrentPosition };
};