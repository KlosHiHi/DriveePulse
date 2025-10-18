import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pin, MapPin, Target, Plus, Minus, Navigation } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface Position {
  lat: number;
  lng: number;
}

interface MapComponentProps {
  center: Position;
  pickupLocation?: Position | null;
  destinationLocation?: Position | null;
  routeCoordinates?: Position[];
  routeLoading?: boolean;
  viewBounds?: {northeast: Position, southwest: Position} | null;
  onMapClick?: (position: Position) => void;
  height?: string;
  className?: string;
}

// Утилиты для работы с координатами - ПРАВИЛЬНАЯ проекция Меркатора
const rad2deg = (rad: number) => rad * (180 / Math.PI);

// Конвертация координат в пиксели тайла - ИСПРАВЛЕНО
const latLngToTile = (lat: number, lng: number, zoom: number) => {
  const scale = Math.pow(2, zoom);
  
  // Правильная формула для X (долгота)
  const x = (lng + 180) / 360 * scale;
  
  // Правильная формула для Y (широта) - проекция Меркатора
  const latRad = lat * Math.PI / 180;
  const y = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * scale;
  
  return { x, y };
};

// Конвертация тайла в координаты - ИСПРАВЛЕНО  
const tileToLatLng = (x: number, y: number, zoom: number) => {
  const scale = Math.pow(2, zoom);
  
  // Правильная формула для долготы
  const lng = x / scale * 360 - 180;
  
  // Правильная формула для широты - обратная проекция Меркатора
  const n = Math.PI - 2 * Math.PI * y / scale;
  const lat = rad2deg(Math.atan(Math.sinh(n)));
  
  return { lat, lng };
};

// Провайдеры карт - монохромные схематичные тайлы
const getMapUrl = (x: number, y: number, z: number, theme: string) => {
  if (theme === 'dark') {
    // Для темной темы - минималистичная темная схема
    return `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/${z}/${x}/${y}.png`;
  }
  // Для светлой темы - минималистичная светлая схема  
  return `https://cartodb-basemaps-a.global.ssl.fastly.net/light_nolabels/${z}/${x}/${y}.png`;
};

// Кастомный компонент карты
const CustomMap: React.FC<MapComponentProps> = ({
  center,
  pickupLocation,
  destinationLocation,
  routeCoordinates = [],
  routeLoading = false,
  viewBounds,
  onMapClick,
  height = '400px',
  className = '',
  
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(13);
  const [mapCenter, setMapCenter] = useState(center);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tiles, setTiles] = useState<Array<{x: number, y: number, url: string, key: string}>>([]);
  const [oldTiles, setOldTiles] = useState<Array<{x: number, y: number, url: string, key: string}>>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevThemeRef = useRef(theme);
  
  

  // Размер тайла
  const TILE_SIZE = 256;

  // Effect to handle theme changes with transition
  useEffect(() => {
    if (prevThemeRef.current !== theme) {
      setOldTiles(tiles);
      setIsTransitioning(true);
      
      // Force tiles update on theme change
      if (!mapRef.current) return;
      const mapWidth = mapRef.current.offsetWidth;
      const mapHeight = mapRef.current.offsetHeight;
      const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
      
      const tilesX = Math.ceil(mapWidth / TILE_SIZE) + 4;
      const tilesY = Math.ceil(mapHeight / TILE_SIZE) + 4;
      
      const newTiles: Array<{x: number, y: number, url: string, key: string}> = [];
      
      for (let i = -Math.floor(tilesX / 2); i <= Math.floor(tilesX / 2); i++) {
        for (let j = -Math.floor(tilesY / 2); j <= Math.floor(tilesY / 2); j++) {
          const tileX = Math.floor(centerTile.x) + i;
          const tileY = Math.floor(centerTile.y) + j;
          
          if (tileX >= 0 && tileY >= 0 && tileX < Math.pow(2, zoom) && tileY < Math.pow(2, zoom)) {
            newTiles.push({
              x: tileX,
              y: tileY,
              url: getMapUrl(tileX, tileY, zoom, theme),
              key: `${tileX}-${tileY}-${zoom}-${theme}`
            });
          }
        }
      }
      
      setTiles(newTiles);
      
      // End transition after animation
      setTimeout(() => {
        setIsTransitioning(false);
        setOldTiles([]);
      }, 500);
      
      prevThemeRef.current = theme;
    }
  }, [theme, mapCenter, zoom]);

  // Update labels with throttling
  

  // Обновление тайлов при изменении центра или зума - ИСПРАВЛЕНО
  useEffect(() => {
    if (!mapRef.current) return;

    const mapWidth = mapRef.current.offsetWidth;
    const mapHeight = mapRef.current.offsetHeight;
    
    const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
    
    // Увеличиваем количество тайлов для буферизации
    const tilesX = Math.ceil(mapWidth / TILE_SIZE) + 4;
    const tilesY = Math.ceil(mapHeight / TILE_SIZE) + 4;
    
    const newTiles: Array<{x: number, y: number, url: string, key: string}> = [];
    
    for (let i = -Math.floor(tilesX / 2); i <= Math.floor(tilesX / 2); i++) {
      for (let j = -Math.floor(tilesY / 2); j <= Math.floor(tilesY / 2); j++) {
        const tileX = Math.floor(centerTile.x) + i; // Округляем до целых
        const tileY = Math.floor(centerTile.y) + j; // Округляем до целых
        
        if (tileX >= 0 && tileY >= 0 && tileX < Math.pow(2, zoom) && tileY < Math.pow(2, zoom)) {
          newTiles.push({
            x: tileX,
            y: tileY,
            url: getMapUrl(tileX, tileY, zoom, theme),
            // Включаем тему в ключ — это гарантирует обновление тайлов при смене темы
            key: `${tileX}-${tileY}-${zoom}-${theme}`
          });
        }
      }
    }
    
    // Обновляем тайлы плавно и сразу (без задержки)
    setTiles(prevTiles => {
      const newKeys = newTiles.map(t => t.key);
      const prevKeys = prevTiles.map(t => t.key);
      
      // Обновляем только если тайлы действительно изменились
      if (newKeys.length !== prevKeys.length || !newKeys.every(key => prevKeys.includes(key))) {
        return newTiles;
      }
      return prevTiles;
    });
  }, [mapCenter, zoom, theme]);

  // Auto-adjust view to fit bounds when viewBounds changes
  useEffect(() => {
    if (viewBounds && mapRef.current) {
      const mapWidth = mapRef.current.offsetWidth;
      const mapHeight = mapRef.current.offsetHeight;
      
      // Calculate center of bounds
      const centerLat = (viewBounds.northeast.lat + viewBounds.southwest.lat) / 2;
      const centerLng = (viewBounds.northeast.lng + viewBounds.southwest.lng) / 2;
      
      // Calculate span with padding
      const latSpan = Math.abs(viewBounds.northeast.lat - viewBounds.southwest.lat);
      const lngSpan = Math.abs(viewBounds.northeast.lng - viewBounds.southwest.lng);
      
      // Add 20% padding to the bounds
      const paddedLatSpan = latSpan * 1.4;
      const paddedLngSpan = lngSpan * 1.4;
      
      // More accurate zoom calculation for Web Mercator projection
      const maxLatRad = Math.max(
        Math.abs(viewBounds.northeast.lat * Math.PI / 180),
        Math.abs(viewBounds.southwest.lat * Math.PI / 180)
      );
      
      // Calculate zoom levels considering Mercator distortion
      const latZoom = Math.log2(mapHeight / 256 * 360 / paddedLatSpan);
      const lngZoom = Math.log2(mapWidth / 256 * 360 / paddedLngSpan / Math.cos(maxLatRad));
      
      // Use the more restrictive zoom and add safety margins
      const newZoom = Math.floor(Math.min(latZoom, lngZoom, 16));
      const safeZoom = Math.max(3, Math.min(15, newZoom));
      
      // Smooth transition with delay to ensure tiles are loaded
      setTimeout(() => {
        setMapCenter({ lat: centerLat, lng: centerLng });
        setZoom(safeZoom);
      }, 100);
    }
  }, [viewBounds]);

  // Конвертация координат в пиксели на карте - ИСПРАВЛЕНО
  const latLngToPixel = (lat: number, lng: number) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    
    const mapWidth = mapRef.current.offsetWidth;
    const mapHeight = mapRef.current.offsetHeight;
    
    // Получаем точные тайловые координаты (с дробной частью)
    const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
    const pointTile = latLngToTile(lat, lng, zoom);
    
    // Конвертируем в пиксели относительно центра с учетом дробной части
    const deltaX = pointTile.x - centerTile.x;
    const deltaY = pointTile.y - centerTile.y;
    
    const pixelX = deltaX * TILE_SIZE + mapWidth / 2;
    const pixelY = deltaY * TILE_SIZE + mapHeight / 2;
    
    return { x: pixelX, y: pixelY };
  };

  // Конвертация пикселей в координаты - УПРОЩЕНО
  const pixelToLatLng = (x: number, y: number) => {
    if (!mapRef.current) return mapCenter;
    
    const mapWidth = mapRef.current.offsetWidth;
    const mapHeight = mapRef.current.offsetHeight;
    
    const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
    
    // Простое смещение от центра в тайловых координатах
    const offsetX = (x - mapWidth / 2) / TILE_SIZE;
    const offsetY = (y - mapHeight / 2) / TILE_SIZE;
    
    const tileX = centerTile.x + offsetX;
    const tileY = centerTile.y + offsetY;
    
    return tileToLatLng(tileX, tileY, zoom);
  };

  // Обработка кликов
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging || !onMapClick) return;
    
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const coordinates = pixelToLatLng(x, y);
    onMapClick(coordinates);
  }, [isDragging, onMapClick, mapCenter, zoom]);

  // Обработка перетаскивания - ПРАВИЛЬНАЯ математика
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !mapRef.current) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Обновляем при каждом движении для плавности
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      // Используем правильную конвертацию пикселей в координаты
      const mapWidth = mapRef.current.offsetWidth;
      const mapHeight = mapRef.current.offsetHeight;
      
      // Вычисляем новый центр через pixelToLatLng
      const newCenter = pixelToLatLng(
        mapWidth / 2 - deltaX,  // Инвертируем X для правильного направления
        mapHeight / 2 - deltaY  // Инвертируем Y для правильного направления
      );
      
      setMapCenter(newCenter);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Обработчики событий мыши и касаний
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Обработка touch событий
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      e.preventDefault();
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1 || !mapRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    
    // Обновляем при каждом движении для плавности на touch
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      const mapWidth = mapRef.current.offsetWidth;
      const mapHeight = mapRef.current.offsetHeight;
      
      // Используем ту же логику что и для мыши
      const newCenter = pixelToLatLng(
        mapWidth / 2 - deltaX,
        mapHeight / 2 - deltaY
      );
      
      setMapCenter(newCenter);
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
    
    e.preventDefault();
  }, [isDragging, dragStart]);

  // Упрощенный компонент маршрута для оптимизации
  const RoutePolyline: React.FC<{ coordinates: Position[] }> = ({ coordinates }) => {
    if (coordinates.length < 2) return null;
    
    // Агрессивное упрощение маршрута - берем каждую 5-ую точку + начало и конец
    const simplifiedCoordinates = React.useMemo(() => {
      if (coordinates.length <= 10) return coordinates;
      
      const simplified = [coordinates[0]]; // Начальная точка
      
      // Берем каждую 5-ую точку для упрощения
      for (let i = 5; i < coordinates.length - 1; i += 5) {
        simplified.push(coordinates[i]);
      }
      
      simplified.push(coordinates[coordinates.length - 1]); // Конечная точка
      return simplified;
    }, [coordinates]);
    
    const pathPoints = simplifiedCoordinates.map(coord => {
      const pixel = latLngToPixel(coord.lat, coord.lng);
      return `${pixel.x},${pixel.y}`;
    }).join(' ');
    
    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5
        }}
      >
        {/* Простая линия маршрута */}
        <polyline
          points={pathPoints}
          stroke="var(--route-color)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={routeLoading ? "8,4" : "none"}
          style={{
            animation: routeLoading ? 'dashMove 1.5s linear infinite' : 'none',
          }}
        />
      </svg>
    );
  };

  // Компонент маркера
  const Marker: React.FC<{ 
    position: Position; 
    type: 'current' | 'pickup' | 'destination';
  }> = ({ position, type }) => {
    const pixel = latLngToPixel(position.lat, position.lng);
    
    const getMarkerConfig = () => {
      switch (type) {
        case 'current':
          return {
            icon: Pin,
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            size: 28,
            pulse: true
          };
        case 'pickup':
          return {
            icon: MapPin,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            size: 24,
            pulse: false
          };
        case 'destination':
          return {
            icon: Target,
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            size: 24,
            pulse: false
          };
        default:
          return {
            icon: Pin,
            background: '#6B7280',
            size: 20,
            pulse: false
          };
      }
    };

    const config = getMarkerConfig();
    const IconComponent = config.icon;

    return (
      <div
        style={{
          position: 'absolute',
          left: pixel.x - config.size / 2,
          top: pixel.y - config.size / 2,
          width: config.size,
          height: config.size,
          background: config.background,
          borderRadius: '50%',
          border: '3px solid white',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          animation: config.pulse ? 'pulse 2s infinite' : 'none'
        }}
      >
        <IconComponent size={config.size * 0.5} color="white" />
      </div>
    );
  };

  return (
    <div 
      className={`custom-map ${className} ${isDragging ? 'dragging' : ''}`}
      style={{ 
        height, 
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      {/* Контейнер карты */}
      <div
        ref={mapRef}
        className={`map-container ${isTransitioning ? 'theme-transitioning' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
          transition: 'background-color 0.5s ease-in-out'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
      >
        {/* Previous theme tiles for transition */}
        {isTransitioning && oldTiles.map((tile) => {
          if (!mapRef.current) return null;
          
          const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
          const mapWidth = mapRef.current.offsetWidth;
          const mapHeight = mapRef.current.offsetHeight;
          
          const deltaX = tile.x - centerTile.x;
          const deltaY = tile.y - centerTile.y;
          
          const x = mapWidth / 2 + deltaX * TILE_SIZE;
          const y = mapHeight / 2 + deltaY * TILE_SIZE;
          
          return (
            <img
              key={`old-${tile.key}`}
              src={tile.url}
              alt=""
              className="map-tile theme-old"
              style={{
                position: 'absolute',
                left: Math.round(x),
                top: Math.round(y),
                width: TILE_SIZE,
                height: TILE_SIZE,
                pointerEvents: 'none',
                opacity: 1,
                userSelect: 'none',
                display: 'block',
                transform: 'translateZ(0)',
                transition: 'opacity 0.5s ease-in-out'
              }}
              draggable={false}
            />
          );
        })}

        {/* Current theme tiles */}
        {tiles.map((tile) => {
          if (!mapRef.current) return null;
          
          const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
          const mapWidth = mapRef.current.offsetWidth;
          const mapHeight = mapRef.current.offsetHeight;
          
          // Точный расчет позиции тайла с учетом дробной части центра
          const deltaX = tile.x - centerTile.x;
          const deltaY = tile.y - centerTile.y;
          
          const x = mapWidth / 2 + deltaX * TILE_SIZE;
          const y = mapHeight / 2 + deltaY * TILE_SIZE;
          
          return (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              style={{
                position: 'absolute',
                left: Math.round(x), // Округляем для четкости
                top: Math.round(y),
                width: TILE_SIZE,
                height: TILE_SIZE,
                pointerEvents: 'none',
                opacity: 1,
                userSelect: 'none',
                display: 'block',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out', // Плавный переход когда не перетаскиваем
                transform: 'translateZ(0)' // Включаем GPU ускорение
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
              draggable={false}
            />
          );
        })}

        {/* Маршрут */}
        {routeCoordinates.length > 0 && (
          <RoutePolyline coordinates={routeCoordinates} />
        )}

        {/* Маркеры */}
        <Marker position={mapCenter} type="current" />
        {pickupLocation && <Marker position={pickupLocation} type="pickup" />}
        {destinationLocation && <Marker position={destinationLocation} type="destination" />}

        {/* labels removed */}
      </div>

      {/* Контролы зума */}
      <div className="zoom-controls" style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px var(--shadow-color)',
        border: '1px solid var(--border-color)',
      }}>
        <button
          onClick={() => setZoom(Math.min(18, zoom + 1))}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <Plus size={16} />
        </button>
        <button
          onClick={() => setZoom(Math.max(1, zoom - 1))}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Minus size={16} />
        </button>
      </div>

      {/* Кнопка центрирования */}
      <button
        onClick={() => setMapCenter(center)}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--primary-color)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px var(--shadow-color)'
        }}
      >
        <Navigation size={20} />
      </button>

      {/* CSS анимации и оптимизации */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes dashMove {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 36; }
        }

        .theme-transitioning .theme-old {
          opacity: 1;
        }

        .theme-transitioning .map-tile:not(.theme-old) {
          opacity: 0;
        }

        .theme-transitioning.map-container .map-tile {
          transition: opacity 0.5s ease-in-out;
        }

        .theme-transitioning.map-container .map-tile.theme-old {
          opacity: 0;
        }
        
        .custom-map {
          will-change: transform;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: none;
          transform: translateZ(0); /* GPU ускорение */
          backface-visibility: hidden;
          perspective: 1000px;
        }
        
        .custom-map img {
          will-change: transform, opacity;
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
          transform: translateZ(0);
          backface-visibility: hidden;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        /* Плавные курсоры */
        .custom-map {
          cursor: grab;
        }
        
        .custom-map:active,
        .custom-map.dragging {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
};

export default CustomMap;