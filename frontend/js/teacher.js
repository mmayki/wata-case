document.addEventListener('DOMContentLoaded', async () => {
    const userName = localStorage.getItem('userName');
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = userName;
    
    await loadStudents();
    await loadAllHomework();
    
    // Кнопка выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // Форма добавления оценки
    const addGradeBtn = document.getElementById('addGradeBtn');
    if (addGradeBtn) addGradeBtn.addEventListener('click', addGrade);
    
    // Форма добавления домашки
    const addHomeworkBtn = document.getElementById('addHomeworkBtn');
    if (addHomeworkBtn) addHomeworkBtn.addEventListener('click', addHomework);
});

async function loadStudents() {
    try {
        const students = await apiRequest('/students');
        const studentSelect = document.getElementById('studentSelect');
        
        if (studentSelect) {
            studentSelect.innerHTML = students.map(s => 
                `<option value="${s.id}">${s.full_name} (${s.class_name})</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
    }
}

async function addGrade() {
    const studentId = document.getElementById('studentSelect').value;
    const subject = document.getElementById('gradeSubject').value.trim();
    const grade = document.getElementById('gradeValue').value;
    
    if (!subject || !grade) {
        alert('Заполните все поля');
        return;
    }
    
    try {
        await apiRequest('/grades', 'POST', {
            studentId,
            subjectName: subject,
            grade: parseInt(grade)
        });
        
        alert('Оценка поставлена!');
        document.getElementById('gradeSubject').value = '';
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function addHomework() {
    const className = document.getElementById('classSelect').value;
    const subject = document.getElementById('homeworkSubject').value.trim();
    const description = document.getElementById('homeworkDesc').value.trim();
    const dueDate = document.getElementById('dueDate').value;
    
    if (!subject || !description) {
        alert('Заполните предмет и описание');
        return;
    }
    
    try {
        await apiRequest('/homework', 'POST', {
            className,
            subjectName: subject,
            description,
            dueDate: dueDate || null
        });
        
        alert('Домашнее задание добавлено!');
        document.getElementById('homeworkSubject').value = '';
        document.getElementById('homeworkDesc').value = '';
        document.getElementById('dueDate').value = '';
        
        await loadAllHomework();
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function loadAllHomework() {
    const className = document.getElementById('classSelect')?.value || '7А';
    try {
        const homework = await apiRequest(`/homework/${className}`, 'GET', null, false);
        const container = document.getElementById('homeworkPreview');
        
        if (container) {
            if (homework.length === 0) {
                container.innerHTML = '<p>Нет заданий</p>';
                return;
            }
            
            container.innerHTML = homework.map(h => `
                <div class="card" style="margin-bottom: 8px;">
                    <strong>${h.subject}</strong>
                    <p style="margin-top: 4px; font-size: 14px;">${h.description}</p>
                    ${h.due_date ? `<small>📅 ${h.due_date}</small>` : ''}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}