// ===== Weather App - Main Application =====

(function () {
  'use strict';

  // ===== Constants =====
  const OWM_BASE = 'https://api.openweathermap.org/data/2.5/weather';
  const OWM_ICON = 'https://openweathermap.org/img/wn/';
  const LS_KEY_API = 'weather-app-api-key';
  const LS_KEY_CACHE = 'weather-app-cache';

  // ===== Weather description mapping (EN -> JP) =====
  const descriptionJP = {
    'clear sky': '快晴',
    'few clouds': '晴れ時々曇り',
    'scattered clouds': '散在する雲',
    'broken clouds': '曇り',
    'overcast clouds': '曇天',
    'shower rain': 'にわか雨',
    'rain': '雨',
    'light rain': '小雨',
    'moderate rain': '雨',
    'heavy intensity rain': '大雨',
    'very heavy rain': '豪雨',
    'extreme rain': '猛烈な雨',
    'freezing rain': '凍雨',
    'light intensity shower rain': '弱いにわか雨',
    'heavy intensity shower rain': '強いにわか雨',
    'ragged shower rain': '断続的なにわか雨',
    'thunderstorm': '雷雨',
    'thunderstorm with light rain': '雷雨（小雨）',
    'thunderstorm with rain': '雷雨（雨）',
    'thunderstorm with heavy rain': '雷雨（大雨）',
    'light thunderstorm': '弱い雷雨',
    'heavy thunderstorm': '激しい雷雨',
    'ragged thunderstorm': '断続的な雷雨',
    'thunderstorm with light drizzle': '雷雨（霧雨）',
    'thunderstorm with drizzle': '雷雨（霧雨）',
    'thunderstorm with heavy drizzle': '雷雨（強い霧雨）',
    'light intensity drizzle': '弱い霧雨',
    'drizzle': '霧雨',
    'heavy intensity drizzle': '強い霧雨',
    'light intensity drizzle rain': '弱い霧雨',
    'drizzle rain': '霧雨',
    'heavy intensity drizzle rain': '強い霧雨',
    'shower rain and drizzle': 'にわか雨と霧雨',
    'heavy shower rain and drizzle': '強いにわか雨と霧雨',
    'shower drizzle': 'にわか霧雨',
    'snow': '雪',
    'light snow': '小雪',
    'heavy snow': '大雪',
    'sleet': 'みぞれ',
    'light shower sleet': '弱いにわかみぞれ',
    'shower sleet': 'にわかみぞれ',
    'light rain and snow': '雨まじりの雪（弱い）',
    'rain and snow': '雨まじりの雪',
    'light shower snow': '弱いにわか雪',
    'shower snow': 'にわか雪',
    'heavy shower snow': '強いにわか雪',
    'mist': '靄',
    'smoke': '煙霧',
    'haze': '薄霞',
    'sand/dust whirls': '砂塵旋風',
    'fog': '霧',
    'sand': '砂嵐',
    'dust': '黄砂',
    'volcanic ash': '火山灰',
    'squalls': 'スコール',
    'tornado': '竜巻',
  };

  // ===== DOM Elements =====
  const dom = {
    modal: document.getElementById('api-key-modal'),
    apiKeyInput: document.getElementById('api-key-input'),
    apiKeySubmit: document.getElementById('api-key-submit'),
    app: document.getElementById('app'),
    loading: document.getElementById('loading-state'),
    error: document.getElementById('error-state'),
    errorMsg: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    content: document.getElementById('weather-content'),
    refreshBtn: document.getElementById('refresh-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    locationName: document.getElementById('location-name'),
    updateTime: document.getElementById('update-time'),
    weatherIcon: document.getElementById('weather-icon'),
    tempValue: document.getElementById('temp-value'),
    weatherDesc: document.getElementById('weather-desc'),
    tempMax: document.getElementById('temp-max'),
    tempMin: document.getElementById('temp-min'),
    feelsLike: document.getElementById('feels-like'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('wind-speed'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    clouds: document.getElementById('clouds'),
    adviceList: document.getElementById('advice-list'),
    sunriseTime: document.getElementById('sunrise-time'),
    sunsetTime: document.getElementById('sunset-time'),
    sunProgress: document.getElementById('sun-progress'),
    sunDot: document.getElementById('sun-dot'),
    particles: document.getElementById('particles'),
  };

  // ===== State =====
  let apiKey = localStorage.getItem(LS_KEY_API) || '';

  // ===== Init =====
  function init() {
    createParticles();

    if (!apiKey) {
      showModal();
    } else {
      dom.modal.classList.add('hidden');
      dom.app.classList.remove('hidden');
      fetchWeather();
    }

    // Event listeners
    dom.apiKeySubmit.addEventListener('click', handleApiKeySubmit);
    dom.apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleApiKeySubmit();
    });
    dom.refreshBtn.addEventListener('click', () => {
      dom.refreshBtn.classList.add('spinning');
      setTimeout(() => dom.refreshBtn.classList.remove('spinning'), 800);
      fetchWeather();
    });
    dom.retryBtn.addEventListener('click', fetchWeather);
    dom.settingsBtn.addEventListener('click', () => {
      showModal();
      dom.apiKeyInput.value = apiKey;
    });
  }

  // ===== Particles =====
  function createParticles() {
    const colors = ['rgba(108,159,255,0.3)', 'rgba(160,108,255,0.2)', 'rgba(108,255,160,0.15)'];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      const size = Math.random() * 4 + 2;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = (Math.random() * 15 + 10) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';
      dom.particles.appendChild(p);
    }
  }

  // ===== Modal =====
  function showModal() {
    dom.modal.classList.remove('hidden');
    dom.app.classList.add('hidden');
    setTimeout(() => dom.apiKeyInput.focus(), 100);
  }

  function handleApiKeySubmit() {
    const key = dom.apiKeyInput.value.trim();
    if (!key) {
      dom.apiKeyInput.style.borderColor = '#ff6b6b';
      dom.apiKeyInput.focus();
      setTimeout(() => dom.apiKeyInput.style.borderColor = '', 1500);
      return;
    }
    apiKey = key;
    localStorage.setItem(LS_KEY_API, apiKey);
    dom.modal.classList.add('hidden');
    dom.app.classList.remove('hidden');
    fetchWeather();
  }

  // ===== Fetch Weather =====
  function fetchWeather() {
    showLoading();

    if (!navigator.geolocation) {
      showError('お使いのブラウザは位置情報APIに対応していません。');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchFromAPI(latitude, longitude);
      },
      (err) => {
        let msg = '位置情報の取得に失敗しました。';
        switch (err.code) {
          case 1: msg = '位置情報の使用が許可されていません。ブラウザの設定で許可してください。'; break;
          case 2: msg = '位置情報が利用できません。'; break;
          case 3: msg = '位置情報の取得がタイムアウトしました。'; break;
        }
        showError(msg);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function fetchFromAPI(lat, lon) {
    const url = `${OWM_BASE}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401) {
          showError('APIキーが無効です。設定から正しいキーを入力してください。');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      // Cache
      localStorage.setItem(LS_KEY_CACHE, JSON.stringify({ data, timestamp: Date.now() }));

      renderWeather(data);
    } catch (e) {
      // Try cached data
      const cached = localStorage.getItem(LS_KEY_CACHE);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        renderWeather(data);
        dom.updateTime.textContent = `キャッシュ: ${formatTime(new Date(timestamp))}`;
      } else {
        showError('天気データの取得に失敗しました。インターネット接続を確認してください。');
      }
    }
  }

  // ===== UI State =====
  function showLoading() {
    dom.loading.classList.remove('hidden');
    dom.error.classList.add('hidden');
    dom.content.classList.add('hidden');
  }

  function showError(msg) {
    dom.loading.classList.add('hidden');
    dom.error.classList.remove('hidden');
    dom.content.classList.add('hidden');
    dom.errorMsg.textContent = msg;
  }

  function showContent() {
    dom.loading.classList.add('hidden');
    dom.error.classList.add('hidden');
    dom.content.classList.remove('hidden');
  }

  // ===== Render Weather =====
  function renderWeather(data) {
    const w = data.weather[0];
    const main = data.main;
    const wind = data.wind;
    const sys = data.sys;

    // Location
    dom.locationName.textContent = data.name || '不明な場所';
    dom.updateTime.textContent = `更新: ${formatTime(new Date())}`;

    // Icon
    dom.weatherIcon.src = `${OWM_ICON}${w.icon}@4x.png`;
    dom.weatherIcon.alt = w.description;

    // Temp
    dom.tempValue.textContent = Math.round(main.temp);
    const desc = descriptionJP[w.description] || w.description;
    dom.weatherDesc.textContent = desc;
    dom.tempMax.textContent = Math.round(main.temp_max);
    dom.tempMin.textContent = Math.round(main.temp_min);

    // Details
    dom.feelsLike.textContent = Math.round(main.feels_like);
    dom.humidity.textContent = main.humidity;
    dom.windSpeed.textContent = wind.speed.toFixed(1);
    dom.pressure.textContent = main.pressure;
    dom.visibility.textContent = data.visibility ? (data.visibility / 1000).toFixed(1) : '--';
    dom.clouds.textContent = data.clouds ? data.clouds.all : '--';

    // Sunrise / Sunset
    const sunrise = new Date(sys.sunrise * 1000);
    const sunset = new Date(sys.sunset * 1000);
    dom.sunriseTime.textContent = formatTime(sunrise);
    dom.sunsetTime.textContent = formatTime(sunset);

    // Sun progress
    const now = Date.now();
    const dayStart = sunrise.getTime();
    const dayEnd = sunset.getTime();
    let sunPct = 0;
    if (now < dayStart) sunPct = 0;
    else if (now > dayEnd) sunPct = 100;
    else sunPct = ((now - dayStart) / (dayEnd - dayStart)) * 100;

    setTimeout(() => {
      dom.sunProgress.style.width = sunPct + '%';
      dom.sunDot.style.left = sunPct + '%';
    }, 200);

    // Advice
    generateAdvice(main.temp, main.feels_like, main.humidity, w, wind.speed, data);

    // Dynamic background
    updateBackground(w.icon);

    showContent();
  }

  // ===== Advice Logic =====
  function generateAdvice(temp, feelsLike, humidity, weather, windSpeed, data) {
    const advices = [];
    const weatherMain = weather.main.toLowerCase();
    const weatherId = weather.id;

    // --- Rain / umbrella ---
    if (['rain', 'drizzle', 'thunderstorm'].includes(weatherMain)) {
      advices.push({
        icon: '☂️',
        title: '傘が必要です',
        desc: weatherMain === 'thunderstorm'
          ? '雷雨の予報です。外出はなるべく控えましょう。'
          : '雨が降っています。お出かけには傘をお忘れなく。',
        tag: 'warn',
        tagText: '注意',
      });
    } else if (weatherMain === 'snow') {
      advices.push({
        icon: '🌨️',
        title: '雪が降っています',
        desc: '路面の凍結に注意してください。暖かい服装で出かけましょう。',
        tag: 'warn',
        tagText: '注意',
      });
    }

    // --- Temperature-based clothing ---
    if (temp >= 30) {
      advices.push({
        icon: '👕',
        title: '半袖がおすすめ',
        desc: `気温${Math.round(temp)}°Cの暑い日です。涼しい服装で水分補給を忘れずに。`,
        tag: 'warn',
        tagText: '暑さ注意',
      });
    } else if (temp >= 25) {
      advices.push({
        icon: '👕',
        title: '半袖でOKです',
        desc: '暑すぎず過ごしやすい気温です。軽めの服装がおすすめ。',
        tag: 'good',
        tagText: '快適',
      });
    } else if (temp >= 20) {
      advices.push({
        icon: '👔',
        title: '長袖がおすすめ',
        desc: '涼しめの気温です。薄手の長袖やカーディガンがちょうど良いでしょう。',
        tag: 'info',
        tagText: 'おすすめ',
      });
    } else if (temp >= 15) {
      advices.push({
        icon: '🧥',
        title: 'ジャケットを羽織りましょう',
        desc: '肌寒い気温です。上着を持ってお出かけください。',
        tag: 'info',
        tagText: 'おすすめ',
      });
    } else if (temp >= 10) {
      advices.push({
        icon: '🧥',
        title: 'コートが必要です',
        desc: '気温が低めです。暖かいコートやセーターを着用しましょう。',
        tag: 'warn',
        tagText: '寒さ注意',
      });
    } else if (temp >= 5) {
      advices.push({
        icon: '🧣',
        title: '防寒対策をしっかりと',
        desc: 'かなり寒いです。マフラーや手袋で防寒しましょう。',
        tag: 'warn',
        tagText: '寒さ注意',
      });
    } else {
      advices.push({
        icon: '🥶',
        title: '極寒！重ね着必須',
        desc: `気温${Math.round(temp)}°Cの厳しい寒さです。ダウンジャケットや防寒具が必須です。`,
        tag: 'warn',
        tagText: '厳寒',
      });
    }

    // --- Heat stroke ---
    if (temp >= 35) {
      advices.push({
        icon: '🔥',
        title: '熱中症に厳重警戒',
        desc: '危険な暑さです。不要な外出は避け、こまめに水分・塩分を補給してください。',
        tag: 'warn',
        tagText: '危険',
      });
    } else if (temp >= 30 && humidity >= 70) {
      advices.push({
        icon: '💦',
        title: '熱中症に注意',
        desc: '高温多湿です。水分をこまめに摂り、直射日光を避けましょう。',
        tag: 'warn',
        tagText: '注意',
      });
    }

    // --- UV / Sunscreen ---
    if (weather.icon && weather.icon.includes('d') && temp >= 20) {
      const isCloudless = ['01d', '02d'].includes(weather.icon);
      if (isCloudless) {
        advices.push({
          icon: '🧴',
          title: '日焼け止めを塗りましょう',
          desc: '晴天で紫外線が強いです。外出前に日焼け止めを忘れずに。',
          tag: 'info',
          tagText: 'UV注意',
        });
      }
    }

    // --- Wind ---
    if (windSpeed >= 10) {
      advices.push({
        icon: '🌀',
        title: '強風に注意',
        desc: `風速${windSpeed.toFixed(1)}m/sの強い風が吹いています。飛びやすい物に注意してください。`,
        tag: 'warn',
        tagText: '注意',
      });
    } else if (windSpeed >= 7) {
      advices.push({
        icon: '💨',
        title: 'やや強い風',
        desc: '帽子やスカートが飛ばされないよう注意しましょう。',
        tag: 'info',
        tagText: '風',
      });
    }

    // --- Humidity ---
    if (humidity >= 80 && temp >= 20) {
      advices.push({
        icon: '😓',
        title: '蒸し暑い日です',
        desc: `湿度${humidity}%で蒸し暑く感じるでしょう。こまめな水分補給を心がけて。`,
        tag: 'info',
        tagText: '多湿',
      });
    } else if (humidity <= 30) {
      advices.push({
        icon: '🏜️',
        title: '乾燥に注意',
        desc: '空気が乾燥しています。保湿クリームやリップクリームのご使用をおすすめします。',
        tag: 'info',
        tagText: '乾燥',
      });
    }

    // --- Feels like differs significantly ---
    if (Math.abs(feelsLike - temp) >= 3) {
      const diff = feelsLike < temp ? '寒く' : '暑く';
      advices.push({
        icon: '🌡️',
        title: `体感温度は${Math.round(feelsLike)}°C`,
        desc: `実際の気温より${diff}感じられます。体感に合わせた服装を。`,
        tag: 'info',
        tagText: '体感',
      });
    }

    // --- Good weather ---
    if (advices.length <= 1 && ['clear sky', 'few clouds'].includes(weather.description) && temp >= 15 && temp <= 28) {
      advices.push({
        icon: '🌈',
        title: 'お出かけ日和です！',
        desc: '気持ちの良い天気です。散歩やアウトドアにぴったり。',
        tag: 'good',
        tagText: '快適',
      });
    }

    renderAdvice(advices);
  }

  function renderAdvice(advices) {
    dom.adviceList.innerHTML = '';

    if (advices.length === 0) {
      const item = document.createElement('div');
      item.className = 'advice-item';
      item.innerHTML = `
        <div class="advice-icon">✅</div>
        <div class="advice-text">
          <div class="advice-title">特に注意事項はありません</div>
          <div class="advice-desc">快適な天候です。良い一日を！</div>
        </div>
        <span class="advice-tag good">快適</span>
      `;
      dom.adviceList.appendChild(item);
      return;
    }

    advices.forEach(a => {
      const item = document.createElement('div');
      item.className = 'advice-item';
      item.innerHTML = `
        <div class="advice-icon">${a.icon}</div>
        <div class="advice-text">
          <div class="advice-title">${a.title}</div>
          <div class="advice-desc">${a.desc}</div>
        </div>
        <span class="advice-tag ${a.tag}">${a.tagText}</span>
      `;
      dom.adviceList.appendChild(item);
    });
  }

  // ===== Dynamic Background =====
  function updateBackground(icon) {
    const isNight = icon.includes('n');
    const code = icon.replace(/[dn]$/, '');

    let gradient;
    if (isNight) {
      gradient = 'linear-gradient(135deg, #0a0e1a 0%, #0f1529 50%, #141d33 100%)';
    } else {
      switch (code) {
        case '01': // clear
          gradient = 'linear-gradient(135deg, #0a1628 0%, #0f2040 50%, #162d55 100%)';
          break;
        case '02': // few clouds
        case '03': // scattered clouds
          gradient = 'linear-gradient(135deg, #0a1222 0%, #111c32 50%, #172842 100%)';
          break;
        case '04': // broken/overcast clouds
          gradient = 'linear-gradient(135deg, #0b0f1a 0%, #111620 50%, #161c28 100%)';
          break;
        case '09': // shower rain
        case '10': // rain
          gradient = 'linear-gradient(135deg, #080c18 0%, #0c1220 50%, #101828 100%)';
          break;
        case '11': // thunderstorm
          gradient = 'linear-gradient(135deg, #06080f 0%, #0a0e18 50%, #0e1220 100%)';
          break;
        case '13': // snow
          gradient = 'linear-gradient(135deg, #10141f 0%, #161b2a 50%, #1c2235 100%)';
          break;
        default:
          gradient = 'linear-gradient(135deg, #0a0e1a 0%, #0f1529 50%, #141d33 100%)';
      }
    }

    document.body.style.background = gradient;
  }

  // ===== Utilities =====
  function formatTime(d) {
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  // ===== Start =====
  document.addEventListener('DOMContentLoaded', init);
})();
