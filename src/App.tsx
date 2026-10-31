import { useState, useEffect, type FormEvent, type CSSProperties } from 'react';
import './App.css';

const API_BASE_URL = 'https://inai-col2.fishrungames.com';

const ENDPOINTS = {
  register: `${API_BASE_URL}/api/register/`,
  login: `${API_BASE_URL}/api/login/`,
  logout: `${API_BASE_URL}/api/logout/`,
  profile: `${API_BASE_URL}/api/profile/`,
  specializations: `${API_BASE_URL}/api/specializations/`,
};

// Жёсткий стиль для всех полей ввода: белый текст на угольно-чёрном фоне
const inputStyle: CSSProperties = {
  backgroundColor: '#181818',
  color: '#ffffff',
  WebkitTextFillColor: '#ffffff',
  caretColor: '#ff5722',
  border: '2px solid #181818',
  padding: '12px 14px',
  fontSize: '1rem',
  fontWeight: 700,
  width: '100%',
};

interface SpecializationItem {
  value: string;
  label: string;
}

interface MusicianData {
  id?: number;
  username: string;
  email?: string;
  profile?: {
    first_name?: string;
    specialization?: string;
    specialization_display?: string;
    bio?: string;
    fee?: string | number;
  };
}

type Mode = 'login' | 'register';

function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('Загрузка студии...');

  const [isLogged, setIsLogged] = useState<boolean>(
    Boolean(localStorage.getItem('band_session'))
  );
  const [mode, setMode] = useState<Mode>('login');

  const [errorText, setErrorText] = useState<string | null>(null);
  const [okText, setOkText] = useState<string | null>(null);

  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');

  const [musician, setMusician] = useState<MusicianData | null>(null);
  const [specList, setSpecList] = useState<SpecializationItem[]>([
    { value: 'vocal', label: 'Вокал' },
    { value: 'guitar', label: 'Гитара' },
    { value: 'bass', label: 'Бас-гитара' },
    { value: 'drums', label: 'Ударные' },
    { value: 'keys', label: 'Клавишные' },
    { value: 'other', label: 'Другое' },
  ]);

  const [editMode, setEditMode] = useState<boolean>(false);
  const [firstNameForm, setFirstNameForm] = useState<string>('');
  const [specForm, setSpecForm] = useState<string>('other');
  const [bioForm, setBioForm] = useState<string>('');
  const [feeForm, setFeeForm] = useState<string>('0.00');

  const triggerLoader = (msg: string) => {
    setErrorText(null);
    setOkText(null);
    setLoadingStep(msg);
    setLoading(true);
  };

  useEffect(() => {
    fetchSpecializations();
    if (isLogged) {
      loadMyProfile();
    }
  }, [isLogged]);

  const fetchSpecializations = async () => {
    try {
      const res = await fetch(ENDPOINTS.specializations);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((item: Record<string, string>) => ({
            value: item.value || item.key || item.code || 'other',
            label: item.label || item.name || item.display || 'Другое',
          }));
          setSpecList(formatted);
        }
      }
    } catch {
      // Оставляем дефолтный список
    }
  };

  const syncProfileState = (data: MusicianData) => {
    setMusician(data);
    setFirstNameForm(data.profile?.first_name || '');
    setSpecForm(data.profile?.specialization || 'other');
    setBioForm(data.profile?.bio || '');
    setFeeForm(String(data.profile?.fee ?? '0.00'));
  };

  const loadMyProfile = async () => {
    triggerLoader('Синхронизация профиля музыканта...');
    try {
      const response = await fetch(ENDPOINTS.profile, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Сессия истекла или недоступна (${response.status})`);
      }

      const data: MusicianData = await response.json();
      syncProfileState(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка чтения профиля';
      setErrorText(msg);
      localStorage.removeItem('band_session');
      setIsLogged(false);
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    triggerLoader('Регистрируем нового участника группы...');

    try {
      const response = await fetch(ENDPOINTS.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: usernameInput,
          email: emailInput,
          password: passwordInput,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || data.username?.[0] || data.password?.[0] || 'Не удалось зарегистрироваться'
        );
      }

      setOkText('Аккаунт создан! Теперь выполните вход.');
      setMode('login');
      setPasswordInput('');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const onLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    triggerLoader('Проверяем пропуск в студию...');

    try {
      const response = await fetch(ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || data.non_field_errors?.[0] || 'Неверный логин или пароль'
        );
      }

      localStorage.setItem('band_session', data.username || 'active');
      setIsLogged(true);
      syncProfileState(data);
      setPasswordInput('');
      setOkText('Добро пожаловать в студию SOLAR VINYL!');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const onUpdateProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    triggerLoader('Обновляем карточку музыканта...');

    try {
      const payload = {
        first_name: firstNameForm,
        specialization: specForm,
        bio: bioForm,
        fee: feeForm,
        profile: {
          first_name: firstNameForm,
          specialization: specForm,
          bio: bioForm,
          fee: feeForm,
        },
      };

      const response = await fetch(ENDPOINTS.profile, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка при сохранении профиля');
      }

      if (data.profile) {
        syncProfileState(data);
      } else {
        syncProfileState({
          ...musician,
          username: musician?.username || usernameInput,
          profile: {
            first_name: data.first_name ?? firstNameForm,
            specialization: data.specialization ?? specForm,
            specialization_display:
              data.specialization_display ??
              specList.find((s) => s.value === specForm)?.label ??
              specForm,
            bio: data.bio ?? bioForm,
            fee: data.fee ?? feeForm,
          },
        });
      }

      setEditMode(false);
      setOkText('Данные музыканта успешно сохранены!');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  const onLogoutClick = async () => {
    triggerLoader('Закрываем смену в студии...');
    try {
      await fetch(ENDPOINTS.logout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).catch(() => {});
    } finally {
      localStorage.removeItem('band_session');
      setIsLogged(false);
      setMusician(null);
      setEditMode(false);
      setLoading(false);
      setOkText('Вы вышли из учётной записи.');
    }
  };

  return (
    <div>
      {/* Встроенная защита цвета инпутов от любых конфликтов стилей */}
      <style>{`
        input, select, textarea {
          background-color: #181818 !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ff5722 !important;
        }
        input::placeholder, textarea::placeholder {
          color: #9e9e9e !important;
          -webkit-text-fill-color: #9e9e9e !important;
          opacity: 1 !important;
        }
      `}</style>

      {loading && (
        <div className="loader-backdrop">
          <div className="loader-modal">
            <div className="eq-bars">
              <div className="eq-bar"></div>
              <div className="eq-bar"></div>
              <div className="eq-bar"></div>
              <div className="eq-bar"></div>
            </div>
            <div className="loader-label">{loadingStep}</div>
          </div>
        </div>
      )}

      <div className="top-Ribbon">
        SOLAR VINYL COLLECTIVE • ANALOG SOUND STUDIO & WORLD TOUR 2026 • BISHKEK / BERLIN
      </div>

      <header className="studio-header">
        <div className="brand-title">
          <span>💿 SOLAR VINYL</span>
          <span className="vinyl-badge">Indie Rock Band</span>
        </div>

        <div className="header-controls">
          {isLogged ? (
            <>
              <span className="member-pill">
                🎙️ Участник: {musician?.username || usernameInput}
              </span>
              <button className="retro-btn retro-btn-dark" onClick={onLogoutClick}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <button
                className={`retro-btn ${mode === 'login' ? 'retro-btn-accent' : ''}`}
                onClick={() => {
                  setMode('login');
                  setErrorText(null);
                }}
              >
                Вход
              </button>
              <button
                className={`retro-btn ${mode === 'register' ? 'retro-btn-accent' : ''}`}
                onClick={() => {
                  setMode('register');
                  setErrorText(null);
                }}
              >
                Регистрация
              </button>
            </>
          )}
        </div>
      </header>

      <main className="workspace">
        <aside className="panel-box">
          {errorText && <div className="notice notice-err">{errorText}</div>}
          {okText && <div className="notice notice-ok">{okText}</div>}

          {!isLogged ? (
            mode === 'login' ? (
              <form onSubmit={onLoginSubmit}>
                <div className="panel-heading">
                  <span>🔑 Вход в бэкстейдж</span>
                </div>
                <div className="field-row">
                  <label>Никнейм музыканта (Username)</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Введите логин"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                  />
                </div>
                <div className="field-row">
                  <label>Пароль</label>
                  <input
                    style={inputStyle}
                    type="password"
                    placeholder="Введите пароль"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="retro-btn retro-btn-accent"
                  style={{ width: '100%' }}
                >
                  Войти в студию
                </button>
              </form>
            ) : (
              <form onSubmit={onRegisterSubmit}>
                <div className="panel-heading">
                  <span>📝 Новый музыкант</span>
                </div>
                <div className="field-row">
                  <label>Придумайте Username</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Ваш сценический ник"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                  />
                </div>
                <div className="field-row">
                  <label>Контактный Email</label>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="band@solarvinyl.org"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </div>
                <div className="field-row">
                  <label>Пароль</label>
                  <input
                    style={inputStyle}
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="retro-btn retro-btn-accent"
                  style={{ width: '100%' }}
                >
                  Создать карточку
                </button>
              </form>
            )
          ) : (
            <div>
              <div className="panel-heading">
                <span>🎛️ Профиль музыканта</span>
                <button className="retro-btn" onClick={loadMyProfile} title="Обновить с сервера">
                  ↻
                </button>
              </div>

              {!editMode ? (
                <div>
                  <div className="musician-badge-card">
                    <div className="stat-line">
                      <span className="stat-label">ID участника:</span>
                      <span className="stat-val">#{musician?.id ?? '—'}</span>
                    </div>
                    <div className="stat-line">
                      <span className="stat-label">Сценический ник:</span>
                      <span className="stat-val">{musician?.username}</span>
                    </div>
                    <div className="stat-line">
                      <span className="stat-label">Имя:</span>
                      <span className="stat-val">
                        {musician?.profile?.first_name || 'Не заполнено'}
                      </span>
                    </div>
                    <div className="stat-line">
                      <span className="stat-label">Инструмент / Роль:</span>
                      <span className="stat-val">
                        {musician?.profile?.specialization_display ||
                          musician?.profile?.specialization ||
                          'Другое'}
                      </span>
                    </div>
                    <div className="stat-line">
                      <span className="stat-label">Ставка за концерт:</span>
                      <span className="stat-val">${musician?.profile?.fee ?? '0.00'}</span>
                    </div>

                    <div className="bio-box">
                      <strong>О музыканте:</strong>{' '}
                      {musician?.profile?.bio || 'Биография пока пуста. Нажмите редактировать!'}
                    </div>
                  </div>

                  <button
                    className="retro-btn retro-btn-accent"
                    style={{ width: '100%' }}
                    onClick={() => setEditMode(true)}
                  >
                    ✏️ Редактировать анкету
                  </button>
                </div>
              ) : (
                <form onSubmit={onUpdateProfileSubmit}>
                  <div className="field-row">
                    <label>Ваше имя (First Name)</label>
                    <input
                      style={inputStyle}
                      type="text"
                      value={firstNameForm}
                      onChange={(e) => setFirstNameForm(e.target.value)}
                      placeholder="Имя участника"
                    />
                  </div>

                  <div className="field-row">
                    <label>Специализация в группе</label>
                    <select
                      style={inputStyle}
                      value={specForm}
                      onChange={(e) => setSpecForm(e.target.value)}
                    >
                      {specList.map((sp) => (
                        <option key={sp.value} value={sp.value}>
                          {sp.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-row">
                    <label>Гонорар (Fee $)</label>
                    <input
                      style={inputStyle}
                      type="number"
                      step="0.01"
                      value={feeForm}
                      onChange={(e) => setFeeForm(e.target.value)}
                    />
                  </div>

                  <div className="field-row">
                    <label>О себе / Инструменты (Bio)</label>
                    <textarea
                      style={inputStyle}
                      rows={3}
                      value={bioForm}
                      onChange={(e) => setBioForm(e.target.value)}
                      placeholder="На чём играете и ваш опыт..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      className="retro-btn retro-btn-accent"
                      style={{ flex: 1 }}
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      className="retro-btn"
                      onClick={() => setEditMode(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </aside>

        <section>
          <div className="poster-banner">
            <h1>ЗВУК НАСТОЯЩЕГО АНАЛОГА</h1>
            <p>Официальный портал инди-рок коллектива SOLAR VINYL</p>
          </div>

          <div className="panel-box" style={{ marginBottom: '28px' }}>
            <div className="panel-heading">
              <span>📀 Дискография на виниле</span>
            </div>
            <div className="albums-grid">
              <div className="vinyl-card">
                <span className="vinyl-year">LP • 2026</span>
                <h3>Warm Tape Memories</h3>
                <p>9 треков, записанных вживую на плёночный магнитофон Studer A800.</p>
              </div>
              <div className="vinyl-card">
                <span className="vinyl-year">EP • 2025</span>
                <h3>Ala-Too Sunset</h3>
                <p>Инструментальный мини-альбом с акустическими гитарами и винтажным синтезатором.</p>
              </div>
              <div className="vinyl-card">
                <span className="vinyl-year">LIVE • 2024</span>
                <h3>Garage Sessions #4</h3>
                <p>Концертная пластинка ограниченным тиражом в 500 копий.</p>
              </div>
            </div>
          </div>

          <div className="panel-box">
            <div className="panel-heading">
              <span>🗓️ График репетиций и выступлений</span>
            </div>
            <table className="gig-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Локация</th>
                  <th>Событие</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>08 НОЯ</td>
                  <td>Бишкек, Vinyl Hall</td>
                  <td>Презентация новой пластинки</td>
                  <td>Билеты в кассе</td>
                </tr>
                <tr>
                  <td>19 НОЯ</td>
                  <td>Алматы, Sound Stage</td>
                  <td>Сольный акустический вечер</td>
                  <td>Sold Out</td>
                </tr>
                <tr>
                  <td>02 ДЕК</td>
                  <td>Ташкент, Indie Club</td>
                  <td>Фестиваль живого звука</td>
                  <td>Регистрация открыта</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;