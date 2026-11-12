(() => {
  const hero = document.querySelector('.hero');
  const name = document.getElementById('season-name');
  const weather = document.getElementById('season-weather');
  const icon = document.getElementById('season-icon');
  const next = document.getElementById('season-next');
  if (!hero || !name || !weather || !icon || !next) return;

  const seasons = [
    { key: 'spring', name: 'Spring', weather: 'Light spring rain', icon: '🌦️' },
    { key: 'summer', name: 'Summer', weather: 'Sunny and warm', icon: '☀️' },
    { key: 'autumn', name: 'Autumn', weather: 'Breezy with falling leaves', icon: '🍂' },
    { key: 'winter', name: 'Winter', weather: 'Gentle snowfall', icon: '❄️' }
  ];
  let current = 0;
  const showSeason = (index) => {
    current = (index + seasons.length) % seasons.length;
    const season = seasons[current];
    hero.classList.remove(...seasons.map(({ key }) => `season-${key}`));
    hero.classList.add(`season-${season.key}`);
    name.textContent = season.name;
    weather.textContent = season.weather;
    icon.textContent = season.icon;
    next.setAttribute('aria-label', `Show next season after ${season.name}`);
  };

  showSeason(current);
  next.addEventListener('click', () => showSeason(current + 1));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.setInterval(() => showSeason(current + 1), 14000);
  }
})();
