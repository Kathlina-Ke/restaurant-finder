import React, { useState, useCallback } from 'react';
import Map from './components/Map';
import RestaurantList from './components/RestaurantList';
import RestaurantDetail from './components/RestaurantDetail';
import styles from './App.module.css';

export default function App() {
  const [restaurants, setRestaurants]               = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [userLocation, setUserLocation]             = useState(null);
  const [activeTab, setActiveTab]                   = useState('list');
  const [loading, setLoading]                       = useState(false);
  const [navigationTarget, setNavigationTarget]     = useState(null);

  // Mobile only — which tab is shown
  const [mobileTab, setMobileTab] = useState('map'); // 'map' | 'list'

  const handleRestaurantsFound = useCallback((data, location) => {
    setRestaurants(data);
    setUserLocation(location);
    setMobileTab('list');
  }, []);

  const handleSelectRestaurant = useCallback((restaurant) => {
    setSelectedRestaurant(restaurant);
    setActiveTab('list');
    setMobileTab('list');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedRestaurant(null);
  }, []);

  const handleNavigate = useCallback((target) => {
    setNavigationTarget(target);
    setMobileTab('map');
  }, []);

  const sidebarContent = () => {
    if (selectedRestaurant) {
      return (
        <RestaurantDetail
          restaurant={selectedRestaurant}
          userLocation={userLocation}
          onBack={handleBack}
          onNavigate={handleNavigate}
        />
      );
    }
    return (
      <RestaurantList
        restaurants={restaurants}
        userLocation={userLocation}
        onSelect={handleSelectRestaurant}
        onSearchMap={() => {}}
      />
    );
  };

  return (
    <div className={styles.app}>

      {/* ── Desktop layout ── */}
      <div className={styles.desktop}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h1 className={styles.logo}>🍽️ Restaurant Finder</h1>
          </div>

          {/* Only one nav item — Restaurants */}
          <nav className={styles.sidebarNav}>
            <button className={`${styles.navItem} ${styles.navActive}`}>
              <span className={styles.navIcon}>🍴</span>
              <span>Restaurants</span>
              {restaurants.length > 0 && (
                <span className={styles.badge}>{restaurants.length}</span>
              )}
            </button>
          </nav>

          <div className={styles.sidebarContent}>
            {sidebarContent()}
          </div>
        </aside>

        {/* Map fills the rest — accessibility ♿ button is inside Map */}
        <main className={styles.mapArea}>
          <Map
            onRestaurantsFound={handleRestaurantsFound}
            onSelectRestaurant={handleSelectRestaurant}
            restaurants={restaurants}
            userLocation={userLocation}
            loading={loading}
            setLoading={setLoading}
            navigationTarget={navigationTarget}
            onClearNavigation={() => setNavigationTarget(null)}
            desktopMode
          />
        </main>
      </div>

      {/* ── Mobile layout ── */}
      <div className={styles.mobile}>
        <header className={styles.mobileHeader}>
          <h1 className={styles.mobileTitle}>🍽️ Restaurant Finder</h1>
        </header>

        {/* Only Map and List tabs */}
        <nav className={styles.mobileTabs} role="tablist">
          <button
            role="tab"
            aria-selected={mobileTab === 'map'}
            className={`${styles.mobileTab} ${mobileTab === 'map' ? styles.mobileTabActive : ''}`}
            onClick={() => setMobileTab('map')}
          >
            🗺️ Map
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === 'list'}
            className={`${styles.mobileTab} ${mobileTab === 'list' ? styles.mobileTabActive : ''}`}
            onClick={() => setMobileTab('list')}
          >
            🍴 {restaurants.length > 0 ? `(${restaurants.length})` : 'List'}
          </button>
        </nav>

        <main className={styles.mobileMain}>
          {/* Map is always mounted so the ♿ button is always available */}
          <div style={{ display: mobileTab === 'map' ? 'flex' : 'none', flex: 1, flexDirection: 'column' }}>
            <Map
              onRestaurantsFound={handleRestaurantsFound}
              onSelectRestaurant={handleSelectRestaurant}
              restaurants={restaurants}
              userLocation={userLocation}
              loading={loading}
              setLoading={setLoading}
              navigationTarget={navigationTarget}
              onClearNavigation={() => setNavigationTarget(null)}
            />
          </div>

          {mobileTab === 'list' && !selectedRestaurant && (
            <RestaurantList
              restaurants={restaurants}
              userLocation={userLocation}
              onSelect={handleSelectRestaurant}
              onSearchMap={() => setMobileTab('map')}
            />
          )}
          {mobileTab === 'list' && selectedRestaurant && (
            <RestaurantDetail
              restaurant={selectedRestaurant}
              userLocation={userLocation}
              onBack={handleBack}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>

    </div>
  );
}
