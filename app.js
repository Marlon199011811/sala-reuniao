/**
 * ============================================
 * SISTEMA DE AGENDAMENTO - SALA DE REUNIÃO
 * JavaScript Completo - Firebase Integration
 * ============================================
 */

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let currentUser = null;
let userProfile = null;
let currentDate = new Date();
let currentView = 'month';
let bookings = [];
let users = [];
let filters = {};
let unsubscribeBookings = null;
let isAdmin = false;

// Cores para eventos
const EVENT_COLORS = ['blue', 'green', 'orange', 'purple', 'red', 'gray'];
const COLOR_MAP = {
    blue: '#3b82f6', green: '#10b981', orange: '#f97316',
    purple: '#8b5cf6', red: '#ef4444', gray: '#6b7280'
};

// Horários de funcionamento
const START_HOUR = 7;
const END_HOUR = 20;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAuthState();
    initEventListeners();
    loadFiltersFromStorage();
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ============================================
// AUTENTICAÇÃO FIREBASE
// ============================================
function initAuthState() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProfile(user.uid);
            showScreen('dashboard-screen');
            startRealtimeSync();
            updateUserUI();
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebar-overlay').classList.remove('active');
        } else {
            currentUser = null;
            userProfile = null;
            isAdmin = false;
            stopRealtimeSync();
            showScreen('login-screen');
        }
    });
}

async function loadUserProfile(uid) {
    try {
        const doc = await firebase.firestore().collection('usuarios').doc(uid).get();
        if (doc.exists) {
            userProfile = doc.data();
            isAdmin = userProfile.perfil === 'admin';
        } else {
            // Criar perfil básico se não existir
            userProfile = {
                nome: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email,
                perfil: 'usuario',
                setor: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await firebase.firestore().collection('usuarios').doc(uid).set(userProfile);
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        showToast('error', 'Erro', 'Falha ao carregar dados do usuário');
    }
}

function updateUserUI() {
    if (!userProfile) return;

    // Avatar
    const initials = userProfile.nome 
        ? userProfile.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';
    document.getElementById('user-initials').textContent = initials;
    document.getElementById('user-name').textContent = userProfile.nome || userProfile.email;

    // Role badge
    const roleEl = document.getElementById('user-role');
    roleEl.textContent = isAdmin ? 'Administrador' : 'Usuário';
    roleEl.style.background = isAdmin ? 'rgba(139, 92, 246, 0.15)' : 'var(--primary-light)';
    roleEl.style.color = isAdmin ? '#8b5cf6' : 'var(--primary)';

    // Menu admin
    const adminItems = document.querySelectorAll('#menu-reports, #sidebar-reports');
    adminItems.forEach(el => {
        el.style.display = isAdmin ? 'flex' : 'none';
    });
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('remember-me').checked;

    showLoading(true);
    try {
        const persistence = remember 
            ? firebase.auth.Auth.Persistence.LOCAL 
            : firebase.auth.Auth.Persistence.SESSION;
        await firebase.auth().setPersistence(persistence);
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showToast('success', 'Bem-vindo!', 'Login realizado com sucesso');
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
});

// Cadastro
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const department = document.getElementById('reg-department').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password-confirm').value;

    if (password !== confirm) {
        showToast('error', 'Erro', 'As senhas não coincidem');
        return;
    }
    if (password.length < 6) {
        showToast('error', 'Erro', 'A senha deve ter no mínimo 6 caracteres');
        return;
    }

    showLoading(true);
    try {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });

        // Salvar no Firestore
        await firebase.firestore().collection('usuarios').doc(cred.user.uid).set({
            nome: name,
            email: email,
            perfil: 'usuario',
            setor: department,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('success', 'Conta criada!', 'Bem-vindo ao sistema');
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
});

// Recuperação de senha
document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;

    showLoading(true);
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showToast('success', 'E-mail enviado', 'Verifique sua caixa de entrada');
        showLogin();
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
});

function handleAuthError(error) {
    const messages = {
        'auth/invalid-email': 'E-mail inválido',
        'auth/user-disabled': 'Conta desativada',
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/email-already-in-use': 'E-mail já cadastrado',
        'auth/weak-password': 'Senha muito fraca',
        'auth/invalid-credential': 'Credenciais inválidas'
    };
    showToast('error', 'Erro', messages[error.code] || error.message);
}

function logout() {
    firebase.auth().signOut();
    closeUserMenu();
    showToast('info', 'Até logo', 'Sessão encerrada');
}

// ============================================
// NAVEGAÇÃO DE TELAS
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showLogin() {
    showScreen('login-screen');
}

function showRegister() {
    showScreen('register-screen');
}

function showForgotPassword() {
    showScreen('forgot-screen');
}

function showFilters() {
    document.getElementById('filters-modal').classList.add('active');
}

function showReports() {
    if (!isAdmin) {
        showToast('warning', 'Acesso negado', 'Apenas administradores podem acessar relatórios');
        return;
    }
    document.getElementById('reports-modal').classList.add('active');
    generateReport();
}

function showMyBookings() {
    loadMyBookings();
    document.getElementById('my-bookings-modal').classList.add('active');
}

// ============================================
// SIDEBAR & UI
// ============================================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

function closeUserMenu() {
    document.getElementById('user-dropdown').classList.remove('active');
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        closeUserMenu();
    }
});

// ============================================
// FIREBASE REALTIME - AGENDAMENTOS
// ============================================
function startRealtimeSync() {
    stopRealtimeSync();

    unsubscribeBookings = firebase.firestore()
        .collection('agendamentos')
        .orderBy('data')
        .orderBy('horaInicio')
        .onSnapshot((snapshot) => {
            bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });

            // Cache local
            localStorage.setItem('bookings_cache', JSON.stringify(bookings));

            renderCalendar();
            updateSummaryCards();
        }, (error) => {
            console.error('Erro no sync:', error);
            // Tentar carregar do cache
            const cached = localStorage.getItem('bookings_cache');
            if (cached) {
                bookings = JSON.parse(cached);
                renderCalendar();
                updateSummaryCards();
            }
            showToast('warning', 'Offline', 'Usando dados em cache');
        });
}

function stopRealtimeSync() {
    if (unsubscribeBookings) {
        unsubscribeBookings();
        unsubscribeBookings = null;
    }
}

// ============================================
// CALENDÁRIO
// ============================================
function setView(view) {
    currentView = 'month';
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === 'month');
    });
    document.querySelectorAll('.calendar-view').forEach(v => v.classList.remove('active'));
    const mv = document.getElementById('month-view');
    if (mv) mv.classList.add('active');
    renderCalendar();
}

function navigateCalendar(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

function renderCalendar() {
    updateCalendarTitle();
    renderMonthView();
}

function updateCalendarTitle() {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const title = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    document.getElementById('calendar-title').textContent = title;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

// Renderizar View Mês
function renderMonthView() {
    const container = document.getElementById('month-days');
    container.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Dias do mês anterior
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
        const day = prevMonth.getDate() - i;
        const cell = createDayCell(day, true, new Date(year, month - 1, day));
        container.appendChild(cell);
    }

    // Dias do mês atual
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        const cell = createDayCell(day, false, date, isToday);
        container.appendChild(cell);
    }

    // Dias do próximo mês
    const totalCells = container.children.length;
    const remaining = 42 - totalCells; // 6 semanas
    for (let day = 1; day <= remaining; day++) {
        const cell = createDayCell(day, true, new Date(year, month + 1, day));
        container.appendChild(cell);
    }
}

function createDayCell(day, isOtherMonth, date, isToday = false) {
    const cell = document.createElement('div');
    cell.className = 'day-cell' + (isOtherMonth ? ' other-month' : '') + (isToday ? ' today' : '');
    cell.dataset.date = formatDateISO(date);

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = day;
    cell.appendChild(number);

    // Eventos do dia
    const dayEvents = document.createElement('div');
    dayEvents.className = 'day-events';

    const dateStr = formatDateISO(date);
    const dayBookings = getFilteredBookings().filter(b => b.data === dateStr && b.status !== 'cancelado');

    const maxVisible = 3;
    dayBookings.slice(0, maxVisible).forEach(booking => {
        const event = document.createElement('div');
        event.className = `day-event event-${booking.corEvento || 'blue'}`;
        event.textContent = `${booking.horaInicio} ${booking.titulo}`;
        event.onclick = (e) => {
            e.stopPropagation();
            showBookingDetails(booking);
        };
        dayEvents.appendChild(event);
    });

    if (dayBookings.length > maxVisible) {
        const more = document.createElement('div');
        more.className = 'more-events';
        more.textContent = `+${dayBookings.length - maxVisible} mais`;
        more.onclick = (e) => {
            e.stopPropagation();
            currentDate = new Date(date);
            setView('day');
        };
        dayEvents.appendChild(more);
    }

    cell.appendChild(dayEvents);

    // Clique para mostrar popup do dia
    cell.addEventListener('click', () => {
        showDayBookings(date);
    });

    return cell;
}

// Renderizar View Semana
function renderWeekView() {
    const container = document.getElementById('week-grid');
    container.innerHTML = '';

    const weekStart = getWeekStart(currentDate);

    // Header vazio (canto)
    const corner = document.createElement('div');
    corner.className = 'week-header-cell';
    corner.style.background = 'var(--bg-hover)';
    container.appendChild(corner);

    // Headers dos dias
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const isToday = date.toDateString() === new Date().toDateString();

        const header = document.createElement('div');
        header.className = 'week-header-cell' + (isToday ? ' today' : '');
        header.innerHTML = `
            <div class="day-name">${weekdays[i]}</div>
            <div class="day-number">${date.getDate()}</div>
        `;
        container.appendChild(header);
    }

    // Slots de horário
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
        // Coluna de tempo
        const timeCol = document.createElement('div');
        timeCol.className = 'week-time-column';
        timeCol.textContent = `${hour.toString().padStart(2, '0')}:00`;
        container.appendChild(timeCol);

        // Slots dos dias
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dateStr = formatDateISO(date);
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;

            const slot = document.createElement('div');
            slot.className = 'week-slot';
            slot.dataset.date = dateStr;
            slot.dataset.time = timeStr;

            // Eventos neste slot
            const slotBookings = getFilteredBookings().filter(b => {
                if (b.data !== dateStr || b.status === 'cancelado') return false;
                const startH = parseInt(b.horaInicio.split(':')[0]);
                const endH = parseInt(b.horaFim.split(':')[0]);
                return hour >= startH && hour < endH;
            });

            slotBookings.forEach(booking => {
                const startH = parseInt(booking.horaInicio.split(':')[0]);
                const endH = parseInt(booking.horaFim.split(':')[0]);
                const duration = endH - startH;

                const event = document.createElement('div');
                event.className = `week-event event-${booking.corEvento || 'blue'}`;
                event.style.top = '2px';
                event.style.height = `calc(${duration * 100}% - 4px)`;
                event.innerHTML = `
                    <strong>${booking.titulo}</strong><br>
                    <small>${booking.solicitante}</small>
                `;
                event.onclick = (e) => {
                    e.stopPropagation();
                    showBookingDetails(booking);
                };
                slot.appendChild(event);
            });

            slot.addEventListener('click', () => {
                if (isDateInPast(date) && hour < new Date().getHours()) {
                    showToast('warning', 'Atenção', 'Horário no passado');
                    return;
                }
                openBookingModal(date, timeStr);
            });

            container.appendChild(slot);
        }
    }
}

// Renderizar View Dia
function renderDayView() {
    const container = document.getElementById('day-grid');
    container.innerHTML = '';

    const dateStr = formatDateISO(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();

    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
        // Label de hora
        const label = document.createElement('div');
        label.className = 'day-time-label';
        label.textContent = `${hour.toString().padStart(2, '0')}:00`;
        if (isToday && hour === new Date().getHours()) {
            label.style.color = 'var(--primary)';
            label.style.fontWeight = '700';
        }
        container.appendChild(label);

        // Slot
        const slot = document.createElement('div');
        slot.className = 'day-slot';

        // Eventos nesta hora
        const hourBookings = getFilteredBookings().filter(b => {
            if (b.data !== dateStr || b.status === 'cancelado') return false;
            const startH = parseInt(b.horaInicio.split(':')[0]);
            const startM = parseInt(b.horaInicio.split(':')[1]);
            const endH = parseInt(b.horaFim.split(':')[0]);
            const endM = parseInt(b.horaFim.split(':')[1]);

            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const slotStart = hour * 60;
            const slotEnd = (hour + 1) * 60;

            return startMinutes < slotEnd && endMinutes > slotStart;
        });

        hourBookings.forEach(booking => {
            const startH = parseInt(booking.horaInicio.split(':')[0]);
            const startM = parseInt(booking.horaInicio.split(':')[1]);
            const endH = parseInt(booking.horaFim.split(':')[0]);
            const endM = parseInt(booking.horaFim.split(':')[1]);

            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const duration = endMinutes - startMinutes;
            const topOffset = ((startMinutes - (hour * 60)) / 60) * 100;
            const heightPercent = (duration / 60) * 100;

            const event = document.createElement('div');
            event.className = `day-event-block event-${booking.corEvento || 'blue'}`;
            event.style.top = `${topOffset}%`;
            event.style.height = `${Math.min(heightPercent, 100 - topOffset)}%`;
            event.innerHTML = `
                <span class="event-time">${booking.horaInicio} - ${booking.horaFim}</span>
                <span class="event-title">${booking.titulo}</span>
                <span class="event-requester">${booking.solicitante} • ${booking.setor}</span>
            `;
            event.onclick = (e) => {
                e.stopPropagation();
                showBookingDetails(booking);
            };
            slot.appendChild(event);
        });

        slot.addEventListener('click', () => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            if (isDateInPast(currentDate) && hour < new Date().getHours()) {
                showToast('warning', 'Atenção', 'Horário no passado');
                return;
            }
            openBookingModal(currentDate, timeStr);
        });

        container.appendChild(slot);
    }
}

// ============================================
// AGENDAMENTOS - CRUD
// ============================================
function openBookingModal(date = null, time = null) {
    const modal = document.getElementById('booking-modal');
    const form = document.getElementById('booking-form');
    const title = document.getElementById('booking-modal-title');

    // Reset form
    form.reset();
    document.getElementById('booking-id').value = '';
    title.innerHTML = '<i class="fas fa-calendar-plus"></i> Novo Agendamento';

    // Preencher dados do usuário
    if (userProfile) {
        document.getElementById('booking-requester').value = userProfile.nome || '';
        document.getElementById('booking-department').value = userProfile.setor || '';
    }

    // Preencher data/hora
    if (date) {
        document.getElementById('booking-date').value = formatDateISO(date);
    } else {
        document.getElementById('booking-date').value = formatDateISO(new Date());
    }

    if (time) {
        document.getElementById('booking-start').value = time;
        // Sugerir hora final (+1 hora)
        const [h, m] = time.split(':');
        const endH = (parseInt(h) + 1).toString().padStart(2, '0');
        document.getElementById('booking-end').value = `${endH}:${m}`;
    }

    modal.classList.add('active');
}

function openEditModal(booking) {
    const modal = document.getElementById('booking-modal');
    const title = document.getElementById('booking-modal-title');

    document.getElementById('booking-id').value = booking.id;
    document.getElementById('booking-requester').value = booking.solicitante || '';
    document.getElementById('booking-department').value = booking.setor || '';
    document.getElementById('booking-title').value = booking.titulo || '';
    document.getElementById('booking-description').value = booking.descricao || '';
    document.getElementById('booking-date').value = booking.data || '';
    document.getElementById('booking-start').value = booking.horaInicio || '';
    document.getElementById('booking-end').value = booking.horaFim || '';
    document.getElementById('booking-participants').value = booking.participantes || '';
    document.getElementById('booking-notes').value = booking.observacao || '';

    title.innerHTML = '<i class="fas fa-edit"></i> Editar Agendamento';
    modal.classList.add('active');
}

// Salvar agendamento
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('booking-id').value;
    const data = {
        titulo: document.getElementById('booking-title').value.trim(),
        descricao: document.getElementById('booking-description').value.trim(),
        solicitante: document.getElementById('booking-requester').value.trim(),
        setor: document.getElementById('booking-department').value.trim(),
        data: document.getElementById('booking-date').value,
        horaInicio: document.getElementById('booking-start').value,
        horaFim: document.getElementById('booking-end').value,
        participantes: parseInt(document.getElementById('booking-participants').value) || 1,
        observacao: document.getElementById('booking-notes').value.trim(),
        status: 'ativo',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Validações
    if (!validateBooking(data, id)) return;

    showLoading(true);
    try {
        if (id) {
            // Editar
            await firebase.firestore().collection('agendamentos').doc(id).update(data);
            showToast('success', 'Atualizado', 'Agendamento atualizado com sucesso');
        } else {
            // Criar
            data.corEvento = getNextColor();
            data.criadoPor = currentUser.uid;
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await firebase.firestore().collection('agendamentos').add(data);
            showToast('success', 'Agendado!', 'Sala reservada com sucesso');
        }

        closeModal('booking-modal');
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showToast('error', 'Erro', 'Falha ao salvar agendamento');
    } finally {
        showLoading(false);
    }
});

function validateBooking(data, excludeId = null) {
    // Data no passado
    const bookingDate = new Date(data.data + 'T' + data.horaInicio);
    const now = new Date();
    now.setSeconds(0, 0);
    if (bookingDate < now) {
        showToast('error', 'Data inválida', 'Não é possível agendar no passado');
        return false;
    }

    // Hora final menor que inicial
    const startMinutes = timeToMinutes(data.horaInicio);
    const endMinutes = timeToMinutes(data.horaFim);
    if (endMinutes <= startMinutes) {
        showToast('error', 'Horário inválido', 'Hora final deve ser maior que inicial');
        return false;
    }

    // Conflito de horários
    const hasConflict = bookings.some(b => {
        if (b.id === excludeId) return false;
        if (b.data !== data.data || b.status === 'cancelado') return false;

        const bStart = timeToMinutes(b.horaInicio);
        const bEnd = timeToMinutes(b.horaFim);

        return (startMinutes < bEnd && endMinutes > bStart);
    });

    if (hasConflict) {
        showToast('error', 'Conflito', 'Já existe um agendamento neste horário');
        return false;
    }

    return true;
}

function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function getNextColor() {
    // Distribuir cores alternadas
    const colorCounts = {};
    EVENT_COLORS.forEach(c => colorCounts[c] = 0);

    bookings.forEach(b => {
        if (b.corEvento && colorCounts[b.corEvento] !== undefined) {
            colorCounts[b.corEvento]++;
        }
    });

    return EVENT_COLORS.reduce((a, b) => colorCounts[a] <= colorCounts[b] ? a : b);
}

// ============================================
// POPUP AGENDAMENTOS DO DIA
// ============================================
function showDayBookings(date) {
    const dateStr = formatDateISO(date);
    const dayBookings = bookings
        .filter(b => b.data === dateStr && b.status !== 'cancelado')
        .sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));

    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const weekdays = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    const titleEl = document.getElementById('day-bookings-title');
    titleEl.textContent = `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;

    const container = document.getElementById('day-bookings-list');

    if (dayBookings.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
                <i class="fas fa-calendar-times" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:.4"></i>
                <p>Nenhum agendamento neste dia</p>
            </div>`;
    } else {
        container.innerHTML = dayBookings.map(b => `
            <div class="booking-item" style="border-radius:0;border-bottom:1px solid var(--border);cursor:pointer"
                 onclick="closeModal('day-bookings-modal'); setTimeout(()=>showBookingDetails(bookings.find(x=>x.id==='${b.id}')),150)">
                <div class="booking-color" style="background:${COLOR_MAP[b.corEvento] || COLOR_MAP.blue};border-radius:0"></div>
                <div class="booking-info" style="padding:14px 12px">
                    <div class="booking-title" style="font-weight:600;margin-bottom:4px">${b.titulo}</div>
                    <div class="booking-meta">
                        <span><i class="fas fa-clock"></i> ${b.horaInicio} – ${b.horaFim}</span>
                        <span><i class="fas fa-user"></i> ${b.solicitante}</span>
                        <span><i class="fas fa-building"></i> ${b.setor}</span>
                    </div>
                </div>
                <div style="padding-right:14px;display:flex;align-items:center;color:var(--text-muted)">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `).join('');
    }

    // Botão "Novo Agendamento" — desabilitado se data passada
    const newBtn = document.getElementById('day-bookings-new-btn');
    if (isDateInPast(date)) {
        newBtn.disabled = true;
        newBtn.style.opacity = '0.4';
        newBtn.onclick = null;
    } else {
        newBtn.disabled = false;
        newBtn.style.opacity = '1';
        newBtn.onclick = () => {
            closeModal('day-bookings-modal');
            openBookingModal(date);
        };
    }

    document.getElementById('day-bookings-modal').classList.add('active');
}

async function deleteBooking(id) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    showLoading(true);
    try {
        await firebase.firestore().collection('agendamentos').doc(id).update({
            status: 'cancelado',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('success', 'Excluído', 'Agendamento cancelado');
        closeModal('details-modal');
    } catch (error) {
        showToast('error', 'Erro', 'Falha ao excluir');
    } finally {
        showLoading(false);
    }
}

// ============================================
// DETALHES DO AGENDAMENTO
// ============================================
function showBookingDetails(booking) {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('details-content');
    const footer = document.getElementById('details-footer');

    const canEdit = isAdmin || booking.criadoPor === currentUser?.uid;
    const colorClass = `event-${booking.corEvento || 'blue'}`;

    content.innerHTML = `
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-heading"></i> Título</span>
            <span class="detail-value">${booking.titulo}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-align-left"></i> Descrição</span>
            <span class="detail-value">${booking.descricao || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-user"></i> Solicitante</span>
            <span class="detail-value">${booking.solicitante}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-building"></i> Setor</span>
            <span class="detail-value">${booking.setor}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-calendar"></i> Data</span>
            <span class="detail-value">${formatDateBR(booking.data)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-clock"></i> Horário</span>
            <span class="detail-value">${booking.horaInicio} - ${booking.horaFim}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-users"></i> Participantes</span>
            <span class="detail-value">${booking.participantes} pessoa(s)</span>
        </div>
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-sticky-note"></i> Observações</span>
            <span class="detail-value">${booking.observacao || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label"><i class="fas fa-tag"></i> Status</span>
            <span class="detail-value status-${booking.status}">${booking.status?.toUpperCase() || 'ATIVO'}</span>
        </div>
    `;

    footer.innerHTML = '';
    if (canEdit && booking.status !== 'cancelado') {
        footer.innerHTML = `
            <button class="btn btn-outline" onclick="closeModal('details-modal')">Fechar</button>
            <button class="btn btn-warning" onclick="openEditModalById('${booking.id}')">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-danger" onclick="deleteBooking('${booking.id}')">
                <i class="fas fa-trash"></i> Excluir
            </button>
        `;
    } else {
        footer.innerHTML = `
            <button class="btn btn-outline" onclick="closeModal('details-modal')">Fechar</button>
        `;
    }

    modal.classList.add('active');
}

async function openEditModalById(id) {
    closeModal('details-modal');
    const booking = bookings.find(b => b.id === id);
    if (booking) {
        openEditModal(booking);
    }
}

// ============================================
// FILTROS
// ============================================
function applyFilters() {
    filters = {
        date: document.getElementById('filter-date').value,
        requester: document.getElementById('filter-requester').value.toLowerCase(),
        department: document.getElementById('filter-department').value.toLowerCase(),
        status: document.getElementById('filter-status').value
    };

    localStorage.setItem('booking_filters', JSON.stringify(filters));
    renderCalendar();
    updateSummaryCards();
    closeModal('filters-modal');
    showToast('info', 'Filtros aplicados', 'Calendário atualizado');
}

function clearFilters() {
    filters = {};
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-requester').value = '';
    document.getElementById('filter-department').value = '';
    document.getElementById('filter-status').value = '';
    localStorage.removeItem('booking_filters');
    renderCalendar();
    updateSummaryCards();
    closeModal('filters-modal');
}

function loadFiltersFromStorage() {
    const saved = localStorage.getItem('booking_filters');
    if (saved) {
        filters = JSON.parse(saved);
        document.getElementById('filter-date').value = filters.date || '';
        document.getElementById('filter-requester').value = filters.requester || '';
        document.getElementById('filter-department').value = filters.department || '';
        document.getElementById('filter-status').value = filters.status || '';
    }
}

function getFilteredBookings() {
    return bookings.filter(b => {
        if (filters.date && b.data !== filters.date) return false;
        if (filters.requester && !b.solicitante?.toLowerCase().includes(filters.requester)) return false;
        if (filters.department && !b.setor?.toLowerCase().includes(filters.department)) return false;
        if (filters.status && b.status !== filters.status) return false;
        return true;
    });
}

// ============================================
// SUMMARY CARDS
// ============================================
function updateSummaryCards() {
    const now = new Date();
    const todayStr = formatDateISO(now);
    const filtered = getFilteredBookings().filter(b => b.status !== 'cancelado');

    // Agendamentos de hoje
    const todayBookings = filtered.filter(b => b.data === todayStr);
    document.getElementById('stat-today').textContent = todayBookings.length;

    // Próxima reunião
    const upcoming = filtered
        .filter(b => {
            const bookingDate = new Date(b.data + 'T' + b.horaInicio);
            return bookingDate > now;
        })
        .sort((a, b) => {
            const dateA = new Date(a.data + 'T' + a.horaInicio);
            const dateB = new Date(b.data + 'T' + b.horaInicio);
            return dateA - dateB;
        });

    if (upcoming.length > 0) {
        const next = upcoming[0];
        document.getElementById('stat-next').textContent = next.horaInicio;
    } else {
        document.getElementById('stat-next').textContent = '--:--';
    }

    // Status da sala (ocupada agora?)
    const currentBooking = filtered.find(b => {
        if (b.data !== todayStr) return false;
        const start = timeToMinutes(b.horaInicio);
        const end = timeToMinutes(b.horaFim);
        const current = now.getHours() * 60 + now.getMinutes();
        return current >= start && current < end;
    });

    const statusEl = document.getElementById('stat-status');
    const statusCard = document.getElementById('card-status');
    const statusIcon = statusCard.querySelector('.stat-icon');
    const statusIconI = statusCard.querySelector('.stat-icon i');
    if (currentBooking) {
        statusEl.textContent = 'Ocupada';
        statusEl.style.color = 'var(--danger)';
        statusIcon.style.background = 'rgba(239, 68, 68, 0.15)';
        statusIcon.style.color = 'var(--danger)';
        statusIconI.className = 'fas fa-door-closed';
    } else {
        statusEl.textContent = 'Livre';
        statusEl.style.color = 'var(--success)';
        statusIcon.style.background = 'rgba(16, 185, 129, 0.15)';
        statusIcon.style.color = 'var(--success)';
        statusIconI.className = 'fas fa-door-open';
    }

    // Total do mês
    const monthStart = formatDateISO(new Date(now.getFullYear(), now.getMonth(), 1)).substring(0, 7);
    const monthBookings = filtered.filter(b => b.data.startsWith(monthStart));
    document.getElementById('stat-month').textContent = monthBookings.length;
}

// ============================================
// MEUS AGENDAMENTOS
// ============================================
function loadMyBookings() {
    const container = document.getElementById('my-bookings-list');
    const myBookings = bookings
        .filter(b => b.criadoPor === currentUser?.uid)
        .sort((a, b) => {
            const dateA = new Date(a.data + 'T' + a.horaInicio);
            const dateB = new Date(b.data + 'T' + b.horaInicio);
            return dateB - dateA;
        });

    if (myBookings.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color: var(--text-muted);">
                <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 16px;"></i>
                <p>Você ainda não tem agendamentos</p>
            </div>
        `;
        return;
    }

    container.innerHTML = myBookings.map(booking => `
        <div class="booking-item" onclick="showBookingDetailsById('${booking.id}')">
            <div class="booking-color" style="background: ${COLOR_MAP[booking.corEvento] || COLOR_MAP.blue}"></div>
            <div class="booking-info">
                <div class="booking-title">${booking.titulo}</div>
                <div class="booking-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDateBR(booking.data)}</span>
                    <span><i class="fas fa-clock"></i> ${booking.horaInicio} - ${booking.horaFim}</span>
                    <span class="status-${booking.status}"><i class="fas fa-circle" style="font-size:6px"></i> ${booking.status}</span>
                </div>
            </div>
            <div class="booking-actions">
                ${booking.status !== 'cancelado' ? `
                    <button class="btn btn-warning" onclick="event.stopPropagation(); openEditModalById('${booking.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); deleteBooking('${booking.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function showBookingDetailsById(id) {
    const booking = bookings.find(b => b.id === id);
    if (booking) showBookingDetails(booking);
}

// ============================================
// RELATÓRIOS (ADMIN)
// ============================================
function generateReport() {
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;

    let filtered = bookings.filter(b => b.status !== 'cancelado');

    if (start) {
        filtered = filtered.filter(b => b.data >= start);
    }
    if (end) {
        filtered = filtered.filter(b => b.data <= end);
    }

    filtered.sort((a, b) => {
        const dateA = new Date(a.data + 'T' + a.horaInicio);
        const dateB = new Date(b.data + 'T' + b.horaInicio);
        return dateA - dateB;
    });

    const container = document.getElementById('reports-list');

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum agendamento encontrado no período</p>';
        return;
    }

    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Título</th>
                    <th>Solicitante</th>
                    <th>Setor</th>
                    <th>Participantes</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(b => `
                    <tr>
                        <td>${formatDateBR(b.data)}</td>
                        <td>${b.horaInicio} - ${b.horaFim}</td>
                        <td>${b.titulo}</td>
                        <td>${b.solicitante}</td>
                        <td>${b.setor}</td>
                        <td>${b.participantes}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Salvar dados para exportação
    window._reportData = filtered;
}

function exportPDF() {
    const data = window._reportData || [];
    if (data.length === 0) {
        showToast('warning', 'Vazio', 'Gere o relatório primeiro');
        return;
    }

    // Criar conteúdo HTML para impressão
    const printWindow = window.open('', '_blank');
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório de Agendamentos</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #2563eb; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
                th { background: #2563eb; color: white; }
                tr:nth-child(even) { background: #f8fafc; }
            </style>
        </head>
        <body>
            <h1>Relatório de Agendamentos - Sala de Reunião</h1>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Título</th>
                        <th>Solicitante</th>
                        <th>Setor</th>
                        <th>Participantes</th>
                        <th>Observações</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(b => `
                        <tr>
                            <td>${formatDateBR(b.data)}</td>
                            <td>${b.horaInicio} - ${b.horaFim}</td>
                            <td>${b.titulo}</td>
                            <td>${b.solicitante}</td>
                            <td>${b.setor}</td>
                            <td>${b.participantes}</td>
                            <td>${b.observacao || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();

    showToast('success', 'PDF', 'Relatório enviado para impressão');
}

function exportExcel() {
    const data = window._reportData || [];
    if (data.length === 0) {
        showToast('warning', 'Vazio', 'Gere o relatório primeiro');
        return;
    }

    // Criar CSV
    const headers = ['Data', 'Horário Início', 'Horário Fim', 'Título', 'Descrição', 'Solicitante', 'Setor', 'Participantes', 'Observações', 'Status'];
    const rows = data.map(b => [
        b.data,
        b.horaInicio,
        b.horaFim,
        b.titulo,
        b.descricao || '',
        b.solicitante,
        b.setor,
        b.participantes,
        b.observacao || '',
        b.status
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell + '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-agendamentos-${formatDateISO(new Date())}.csv`;
    link.click();

    showToast('success', 'Excel', 'Arquivo CSV exportado');
}

// ============================================
// UTILITÁRIOS
// ============================================
function formatDateISO(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateBR(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function isDateInPast(date) {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showLoading(show) {
    document.getElementById('loading-overlay').classList.toggle('active', show);
}

function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// EVENT LISTENERS GLOBAIS
// ============================================
function initEventListeners() {
    // Fechar modais com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
    });

    // Atualizar status da sala a cada minuto
    setInterval(updateSummaryCards, 60000);

    // Definir datas padrão nos relatórios
    const today = formatDateISO(new Date());
    const firstDay = formatDateISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const lastDay = formatDateISO(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

    document.getElementById('report-start').value = firstDay;
    document.getElementById('report-end').value = lastDay;
}

// Touch gestures para mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

function handleSwipe() {
    const threshold = 80;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > threshold) {
        if (diff > 0) {
            navigateCalendar(1); // Swipe left = next
        } else {
            navigateCalendar(-1); // Swipe right = previous
        }
    }
}
