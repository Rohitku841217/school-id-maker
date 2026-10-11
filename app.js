'use strict';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'schoolIdMaker.students.v1';
const SETTINGS_KEY = 'schoolIdMaker.settings.v1';
let students = [];
let logoData = '';
let photoData = '';
let toastTimer;

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function readImage(file, callback) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('कृपया सही image file चुनें।');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => callback(String(reader.result));
  reader.onerror = () => showToast('फोटो पढ़ी नहीं जा सकी।');
  reader.readAsDataURL(file);
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    $('school').value = settings.school || 'Sunrise Public School';
    $('address').value = settings.address || 'Chanpatia, Bihar - 845306';
    $('session').value = settings.session || '2026-27';
    logoData = settings.logo || '';
  } catch (_) {}
  updateLogoPreview();
}

function saveSettings() {
  const settings = {
    school: $('school').value.trim(),
    address: $('address').value.trim(),
    session: $('session').value.trim(),
    logo: logoData
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {
    showToast('लोगो बड़ा है या ब्राउज़र स्टोरेज भर गया है।');
  }
}

function loadStudents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    students = Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    students = [];
  }
}

function persistStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return true;
  } catch (_) {
    showToast('ब्राउज़र स्टोरेज भर गया है। छोटी फोटो इस्तेमाल करें या कुछ कार्ड हटाएँ।');
    return false;
  }
}

function updateLogoPreview() {
  const img = $('logoPreview');
  img.hidden = !logoData;
  img.src = logoData || '';
}

function updatePhotoPreview() {
  const img = $('photoPreview');
  img.hidden = !photoData;
  img.src = photoData || '';
}

function formData() {
  return {
    id: $('studentId').value || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    name: $('sname').value.trim(),
    className: $('sclass').value.trim(),
    roll: $('sroll').value.trim(),
    dob: $('sdob').value.trim(),
    father: $('sfname').value.trim(),
    mob: $('smob').value.trim(),
    photo: photoData,
    template: $('template').value
  };
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
}

function cardMarkup(student) {
  const school = escapeHTML($('school').value.trim() || 'School Name');
  const address = escapeHTML($('address').value.trim());
  const session = escapeHTML($('session').value.trim());
  const logo = logoData ? `<img class="school-logo" src="${logoData}" alt="School logo">` : '';
  const photo = student.photo
    ? `<img class="student-photo" src="${student.photo}" alt="Student photo">`
    : `<div class="student-photo photo-placeholder" aria-label="No photo"></div>`;
  return `
    <article class="id-card">
      <div class="id-head ${escapeHTML(student.template || 'blue')}">
        ${logo}
        <div class="school-name">${school}</div>
        <div class="school-address">${address}</div>
      </div>
      ${photo}
      <div class="student-name">${escapeHTML(student.name)}</div>
      <div class="student-class">कक्षा: ${escapeHTML(student.className || '-')}</div>
      <div class="student-details">
        <div class="detail-row"><span class="detail-label">रोल नंबर</span><span class="detail-value">${escapeHTML(student.roll || '-')}</span></div>
        <div class="detail-row"><span class="detail-label">जन्मतिथि</span><span class="detail-value">${escapeHTML(student.dob || '-')}</span></div>
        <div class="detail-row"><span class="detail-label">पिता/अभिभावक</span><span class="detail-value">${escapeHTML(student.father || '-')}</span></div>
        <div class="detail-row"><span class="detail-label">मोबाइल</span><span class="detail-value">${escapeHTML(student.mob || '-')}</span></div>
      </div>
      <div class="id-footer">सत्र ${session} | ${school}</div>
    </article>`;
}

function renderStudents() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const filtered = students.filter(s =>
    [s.name, s.className, s.roll, s.father].some(v => String(v || '').toLocaleLowerCase().includes(query))
  );
  $('cardArea').innerHTML = '';
  filtered.forEach(student => {
    const item = document.createElement('div');
    item.className = 'student-item';
    item.innerHTML = cardMarkup(student) + `
      <div class="card-actions">
        <button class="btn btn-light btn-small" type="button" data-action="edit" data-id="${escapeHTML(student.id)}">एडिट</button>
        <button class="btn btn-light btn-small" type="button" data-action="print" data-id="${escapeHTML(student.id)}">प्रिंट</button>
        <button class="btn btn-danger btn-small" type="button" data-action="delete" data-id="${escapeHTML(student.id)}">हटाएँ</button>
      </div>`;
    $('cardArea').appendChild(item);
  });
  $('countLabel').textContent = `कुल ${students.length} विद्यार्थी${query ? ` · ${filtered.length} दिखाई दे रहे हैं` : ''}`;
  $('emptyState').hidden = filtered.length > 0;
}

function resetForm() {
  $('studentForm').reset();
  $('studentId').value = '';
  photoData = '';
  updatePhotoPreview();
  $('formHeading').textContent = 'विद्यार्थी की जानकारी';
  $('saveStudent').textContent = 'कार्ड जोड़ें';
}

function editStudent(id) {
  const s = students.find(item => item.id === id);
  if (!s) return;
  $('studentId').value = s.id;
  $('sname').value = s.name || '';
  $('sclass').value = s.className || '';
  $('sroll').value = s.roll || '';
  $('sdob').value = s.dob || '';
  $('sfname').value = s.father || '';
  $('smob').value = s.mob || '';
  $('template').value = s.template || 'blue';
  photoData = s.photo || '';
  updatePhotoPreview();
  $('formHeading').textContent = 'विद्यार्थी की जानकारी एडिट करें';
  $('saveStudent').textContent = 'बदलाव सेव करें';
  $('sname').focus();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function deleteStudent(id) {
  const s = students.find(item => item.id === id);
  if (!s || !confirm(`${s.name} का कार्ड हटाना चाहते हैं?`)) return;
  students = students.filter(item => item.id !== id);
  persistStudents();
  renderStudents();
  showToast('कार्ड हटा दिया गया।');
}

function printStudent(id) {
  const s = students.find(item => item.id === id);
  if (!s) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('प्रिंट विंडो खुल नहीं सकी। ब्राउज़र में pop-ups अनुमति दें।');
    return;
  }
  const markup = cardMarkup(s);
  printWindow.document.write(`<!DOCTYPE html><html lang="hi"><head><meta charset="UTF-8"><title>ID Card</title><link rel="stylesheet" href="${new URL('style.css', location.href).href}"></head><body class="single-print"><main class="single-card">${markup}</main><script>window.onload=()=>{window.print();};<\/script></body></html>`);
  printWindow.document.close();
}

function normalizeRow(row) {
  const normalized = {};
  Object.keys(row).forEach(key => normalized[String(key).trim().toLowerCase()] = row[key]);
  const get = (...keys) => {
    for (const key of keys) if (normalized[key] !== undefined && normalized[key] !== null) return String(normalized[key]).trim();
    return '';
  };
  return {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    name: get('name', 'student name', 'studentname'),
    className: get('class', 'class name', 'classname'),
    roll: get('roll', 'roll no', 'roll number', 'rollno'),
    dob: get('dob', 'date of birth', 'dateofbirth'),
    father: get('father', 'father name', 'fathername', 'guardian'),
    mob: get('mobile', 'mob', 'mobile number', 'phone'),
    photo: '',
    template: $('template').value
  };
}

async function importFile() {
  const file = $('excelFile').files[0];
  if (!file) {
    showToast('पहले Excel या CSV फाइल चुनें।');
    return;
  }
  if (typeof XLSX === 'undefined') {
    showToast('Excel लाइब्रेरी लोड नहीं हुई। इंटरनेट चालू करके दोबारा खोलें।');
    return;
  }
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {type: 'array'});
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {defval: ''});
    const imported = rows.map(normalizeRow).filter(s => s.name);
    if (!imported.length) {
      showToast('फाइल में Name कॉलम और विद्यार्थियों का डेटा जाँचें।');
      return;
    }
    students.push(...imported);
    persistStudents();
    renderStudents();
    $('importStatus').textContent = `${imported.length} विद्यार्थी इम्पोर्ट किए गए।`;
    showToast(`${imported.length} कार्ड जोड़ दिए गए।`);
    $('excelFile').value = '';
  } catch (error) {
    console.error(error);
    showToast('फाइल पढ़ने में समस्या आई। सही Excel/CSV फाइल चुनें।');
  }
}

function downloadCSV() {
  const headers = ['Name','Class','Roll','DOB','Father','Mobile'];
  const rows = students.map(s => [s.name,s.className,s.roll,s.dob,s.father,s.mob]);
  const quote = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(quote).join(',')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'school-students.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV फाइल डाउनलोड हो गई।');
}

$('studentForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = formData();
  if (!data.name) return showToast('विद्यार्थी का नाम भरना जरूरी है।');
  const index = students.findIndex(s => s.id === data.id);
  if (index >= 0) students[index] = data;
  else students.unshift(data);
  persistStudents();
  saveSettings();
  renderStudents();
  resetForm();
  showToast(index >= 0 ? 'विद्यार्थी का कार्ड अपडेट हो गया।' : 'नया कार्ड बन गया।');
});

$('photoFile').addEventListener('change', event => readImage(event.target.files[0], data => { photoData = data; updatePhotoPreview(); }));
$('logoFile').addEventListener('change', event => readImage(event.target.files[0], data => { logoData = data; updateLogoPreview(); saveSettings(); renderStudents(); }));
$('removeLogo').addEventListener('click', () => { logoData = ''; $('logoFile').value = ''; updateLogoPreview(); saveSettings(); renderStudents(); });
$('removePhoto').addEventListener('click', () => { photoData = ''; $('photoFile').value = ''; updatePhotoPreview(); });
$('resetForm').addEventListener('click', resetForm);
$('search').addEventListener('input', renderStudents);
$('importExcel').addEventListener('click', importFile);
$('exportCsv').addEventListener('click', downloadCSV);
$('printAll').addEventListener('click', () => {
  if (!students.length) return showToast('प्रिंट करने के लिए पहले कार्ड बनाएँ।');
  window.print();
});
$('clearAll').addEventListener('click', () => {
  if (!students.length) return showToast('हटाने के लिए कोई कार्ड नहीं है।');
  if (!confirm('क्या आप सभी विद्यार्थियों के कार्ड हटाना चाहते हैं? यह बदलाव वापस नहीं होगा।')) return;
  students = [];
  persistStudents();
  renderStudents();
  resetForm();
  showToast('सभी कार्ड हटा दिए गए।');
});
$('cardArea').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === 'edit') editStudent(id);
  if (button.dataset.action === 'delete') deleteStudent(id);
  if (button.dataset.action === 'print') printStudent(id);
});
['school','address','session'].forEach(id => $(id).addEventListener('input', () => { saveSettings(); renderStudents(); }));

loadSettings();
loadStudents();
renderStudents();
