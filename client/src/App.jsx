import React, { useState, useCallback } from 'react';
import Map from './components/Map';
import RestaurantList from './components/RestaurantList';
import RestaurantDetail from './components/RestaurantDetail';
import BlindAssist from './components/BlindAssist';
import styles from './App.module.css';

export default function App() {
  const [restaurants, setRestaurants]           = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [userLocation, setUserLocation]         = useState(null);
  const [activeTab, setActiveTab]               = useState('map');
  const [loading, setLoading]                   = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  const handleRestaurantsFound = useCallback((data, location) => {
    setRestaurants(data);
    setUserLocation(location);
    setActiveTab('list');
  }, []);

  const handleSelectRestaurant = useCallback((restaurant) => {
    setSelectedRestaurant(restaurant);
    setActiveTab('list');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedRestaurant(null);
  }, []);

  // Triggered from RestaurantDetail → switches to map tab and starts nav
  const handleNavigate = useCallback((target) => {
    setNavigationTarget(target);
    setActiveTab('map');
  }, []);

  const sidebarContent = () => {
    if (activeTab === 'list' && selectedRestaurant) {
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
        onSearchMap={() => setActiveTab('map')}
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

          <nav className={styles.sidebarNav}>
            <button
              className={`${styles.navItem} ${activeTab === 'list' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('list')}
            >
              <span className={styles.navIcon}>🍴</span>
              <span>Restaurants</span>
              {restaurants.length > 0 && (
                <span className={styles.badge}>{restaurants.length}</span>
              )}
            </button>
            <button
              className={`${styles.navItem} ${activeTab === 'map' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <span className={styles.navIcon}>🗺️</span>
              <span>Map</span>
            </button>
            <button
              className={`${styles.navItem} ${activeTab === 'assist' ? styles.navActive : ''}`}
              onClick={() => setActiveTab('assist')}
            >
              <span className={styles.navIcon}>👁️</span>
              <span>Blind Assist</span>
            </button>
          </nav>

          <div className={styles.sidebarContent}>
            {activeTab === 'assist' ? (
              <BlindAssist />
            ) : (
              sidebarContent()
            )}
          </div>
        </aside>

        {/* Map always visible — accessibility button lives inside Map */}
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

        <nav className={styles.mobileTabs} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'map'}
            className={`${styles.mobileTab} ${activeTab === 'map' ? styles.mobileTabActive : ''}`}
            onClick={() => setActiveTab('map')}
          >
            🗺️ Map
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'list'}
            className={`${styles.mobileTab} ${activeTab === 'list' ? styles.mobileTabActive : ''}`}
            onClick={() => setActiveTab('list')}
          >
            🍴 {restaurants.length > 0 ? `(${restaurants.length})` : 'List'}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'assist'}
            className={`${styles.mobileTab} ${activeTab === 'assist' ? styles.mobileTabActive : ''}`}
            onClick={() => setActiveTab('assist')}
          >
            👁️ Assist
          </button>
        </nav>

        <main className={styles.mobileMain}>
          {activeTab === 'map' && (
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
          )}
          {activeTab === 'list' && !selectedRestaurant && (
            <RestaurantList
              restaurants={restaurants}
              userLocation={userLocation}
              onSelect={handleSelectRestaurant}
              onSearchMap={() => setActiveTab('map')}
            />
          )}
          {activeTab === 'list' && selectedRestaurant && (
            <RestaurantDetail
              restaurant={selectedRestaurant}
              userLocation={userLocation}
              onBack={handleBack}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'assist' && <BlindAssist />}
        </main>
      </div>
    </div>
  );
}
