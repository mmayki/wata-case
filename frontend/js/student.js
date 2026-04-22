// Загрузка данных ученика
document.addEventListener('DOMContentLoaded', async () => {
    const userName = localStorage.getItem('userName');
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = userName;
    
    await loadGrades();
    await loadHomework();
    await loadSchedule();
    
    // Кнопка выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});

async function loadGrades() {
    const userId = localStorage.getItem('userId');
    try {
        const grades = await apiRequest(`/grades/${userId}`);
        const gradesContainer = document.getElementById('gradesList');
        
        if (!gradesContainer) return;
        
        if (grades.length === 0) {
            gradesContainer.innerHTML = '<p>Пока нет оценок</p>';
            return;
        }
        
        // Группируем по предметам
        const grouped = {};
        grades.forEach(g => {
            if (!grouped[g.subject]) grouped[g.subject] = [];
            grouped[g.subject].push(g.grade);
        });
        
        let html = '';
        for (const [subject, marks] of Object.entries(grouped)) {
            const avg = (marks.reduce((a,b) => a+b, 0) / marks.length).toFixed(1);
            html += `
                <div style="margin-bottom: 16px;">
                    <strong>${subject}</strong>
                    <div style="margin-top: 8px;">
                        ${marks.map(m => `<span class="grade">${m}</span>`).join('')}
                        <span class="badge" style="margin-left: 8px;">ср. ${avg}</span>
                    </div>
                </div>
            `;
        }
        gradesContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Ошибка загрузки оценок:', error);
    }
}

async function loadHomework() {
    const className = '7А'; // Позже можно получать из данных пользователя
    try {
        const homework = await apiRequest(`/homework/${className}`, 'GET', null, false);
        const homeworkContainer = document.getElementById('homeworkList');
        
        if (!homeworkContainer) return;
        
        if (homework.length === 0) {
            homeworkContainer.innerHTML = '<p>Нет домашнего задания</p>';
            return;
        }
        
        let html = '';
        homework.forEach(h => {
            html += `
                <div class="card" style="margin-bottom: 12px;">
                    <strong>📖 ${h.subject}</strong>
                    <p style="margin-top: 8px;">${h.description}</p>
                    ${h.due_date ? `<small class="badge">Срок: ${h.due_date}</small>` : ''}
                </div>
            `;
        });
        homeworkContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Ошибка загрузки домашки:', error);
    }
}

async function loadSchedule() {
    const className = '7А';
    try {
        const schedule = await apiRequest(`/schedule/${className}`, 'GET', null, false);
        const scheduleContainer = document.getElementById('scheduleList');
        
        if (!scheduleContainer) return;
        
        if (schedule.length === 0) {
            scheduleContainer.innerHTML = '<p>Нет расписания</p>';
            return;
        }
        
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const grouped = {};
        schedule.forEach(s => {
            if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
            grouped[s.day_of_week].push(s);
        });
        
        let html = '';
        for (let day = 1; day <= 6; day++) {
            if (grouped[day]) {
                html += `<div style="margin-bottom: 12px;"><strong>${days[day-1]}</strong><br>`;
                grouped[day].forEach(lesson => {
                    html += `<span class="badge" style="margin: 4px;">${lesson.lesson_number}. ${lesson.subject}</span>`;
                });
                html += `</div>`;
            }
        }
        scheduleContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
    }
}