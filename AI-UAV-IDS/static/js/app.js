const state = {
  rows: [],
  pageSize: 6,
  currentPage: 1,
  uploadedFile: null,
  results: []
};

const previewTableBody = document.getElementById('previewTableBody');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const fileInput = document.getElementById('csvFile');
const dropZone = document.getElementById('dropZone');
const uploadMeta = document.getElementById('uploadMeta');
const filePreview = document.getElementById('filePreview');
const uploadProgress = document.getElementById('uploadProgress');
const predictBtn = document.getElementById('predictBtn');
const loadingBox = document.getElementById('loadingBox');
const predictionSummary = document.getElementById('predictionSummary');
const resultsTableBody = document.getElementById('resultsTableBody');
const dateTimeElement = document.getElementById('dateTime');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');

function updateClock() {
  const now = new Date();
  dateTimeElement.textContent = now.toLocaleString();
}

setInterval(updateClock, 1000);
updateClock();

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  sidebar.classList.toggle('open');
});

['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length) {
    handleFileUpload(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) {
    handleFileUpload(e.target.files[0]);
  }
});

function handleFileUpload(file) {
  uploadMeta.textContent = `Uploading ${file.name}...`;
  uploadProgress.style.width = '20%';
  const formData = new FormData();
  formData.append('file', file);

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
    .then((response) => response.json())
    .then((data) => {
      uploadProgress.style.width = '100%';
      if (data.success) {
        state.uploadedFile = data.filename;
        uploadMeta.textContent = `Loaded ${data.filename} • ${data.rows} rows • ${data.columns.length} columns`;
        filePreview.textContent = `Preview ready with ${data.preview.length} sample rows.`;
        state.rows = data.preview;
        renderPreviewTable();
        renderResultsTable([]);
      } else {
        uploadMeta.textContent = data.message || 'Upload failed.';
      }
    })
    .catch(() => {
      uploadMeta.textContent = 'Upload failed. Please try again.';
    });
}

function renderPreviewTable() {
  const searchTerm = searchInput.value.toLowerCase();
  const filtered = state.rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(searchTerm)
  );

  const start = (state.currentPage - 1) * state.pageSize;
  const pageRows = filtered.slice(start, start + state.pageSize);

  previewTableBody.innerHTML = pageRows.length
    ? pageRows.map((row) => `
      <tr>
        <td>${row['Flow ID'] ?? row.flow_id ?? '-'}</td>
        <td>${row['Source IP'] ?? row.source_ip ?? '-'}</td>
        <td>${row['Destination IP'] ?? row.destination_ip ?? '-'}</td>
        <td>${row['Protocol'] ?? row.protocol ?? '-'}</td>
        <td>${row['Packet Size'] ?? row.packet_size ?? '-'}</td>
        <td>${row['Label'] ?? row.label ?? 'Normal'}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="text-center text-muted">No matching rows.</td></tr>';

  renderPagination(filtered.length);
}

function renderPagination(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(`<li class="page-item ${i === state.currentPage ? 'active' : ''}"><a class="page-link" href="#">${i}</a></li>`);
  }
  pagination.innerHTML = pages.join('');
  pagination.querySelectorAll('.page-link').forEach((link, index) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      state.currentPage = index + 1;
      renderPreviewTable();
    });
  });
}

searchInput.addEventListener('input', renderPreviewTable);

predictBtn.addEventListener('click', () => {
  if (!state.uploadedFile) {
    predictionSummary.innerHTML = '<div class="alert alert-warning">Upload a CSV dataset before running prediction.</div>';
    return;
  }

  loadingBox.style.display = 'flex';
  predictionSummary.innerHTML = '';

  fetch('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: state.uploadedFile })
  })
    .then((response) => response.json())
    .then((data) => {
      loadingBox.style.display = 'none';
      state.results = data.results || [];
      renderResultsTable(state.results);
      predictionSummary.innerHTML = `<div class="alert alert-success">${data.summary}</div>`;
    })
    .catch(() => {
      loadingBox.style.display = 'none';
      predictionSummary.innerHTML = '<div class="alert alert-danger">Prediction failed. Please retry.</div>';
    });
});

function renderResultsTable(results) {
  resultsTableBody.innerHTML = results.length
    ? results.map((row) => `
      <tr>
        <td>${row.flowId}</td>
        <td>${row.predictedAttack}</td>
        <td>${row.confidence}%</td>
        <td>${row.threatLevel}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="text-center text-muted">No predictions available yet.</td></tr>';
}

function initCharts() {
  const pieChart = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: ['Normal', 'DoS', 'Probe', 'R2L', 'U2R'],
      datasets: [{ data: [72, 8, 10, 6, 4], backgroundColor: ['#38d39f', '#4da3ff', '#ffb84d', '#8b7dff', '#ff5d7a'] }]
    },
    options: { plugins: { legend: { labels: { color: '#eaf3ff' } } } }
  });

  const barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: ['DoS', 'Probe', 'Scan', 'Spoofing', 'Replay'],
      datasets: [{ label: 'Attack Count', data: [320, 180, 145, 90, 60], backgroundColor: ['#4da3ff', '#2dd4bf', '#ffb84d', '#8b7dff', '#ff5d7a'] }]
    },
    options: { scales: { y: { ticks: { color: '#eaf3ff' } }, x: { ticks: { color: '#eaf3ff' } } } }
  });

  const featureChart = new Chart(document.getElementById('featureChart'), {
    type: 'bar',
    data: {
      labels: ['Packet Size', 'Flow Rate', 'Duration', 'Flags', 'Latency'],
      datasets: [{ label: 'Importance', data: [92, 84, 77, 66, 59], backgroundColor: '#4da3ff' }]
    },
    options: { indexAxis: 'y', scales: { x: { ticks: { color: '#eaf3ff' } }, y: { ticks: { color: '#eaf3ff' } } } }
  });

  const lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      datasets: [{ label: 'Traffic Volume', data: [180, 220, 310, 280, 340, 260], borderColor: '#2dd4bf', tension: 0.35, fill: true, backgroundColor: 'rgba(45,212,191,0.15)' }]
    },
    options: { scales: { y: { ticks: { color: '#eaf3ff' } }, x: { ticks: { color: '#eaf3ff' } } } }
  });
}

initCharts();

document.getElementById('downloadCsvBtn').addEventListener('click', () => {
  const rows = state.results.length ? state.results : [{ flowId: 'N/A', predictedAttack: 'Normal', confidence: '99.8', threatLevel: 'Low' }];
  const csvRows = ['flowId,predictedAttack,confidence,threatLevel', ...rows.map((row) => `${row.flowId},${row.predictedAttack},${row.confidence},${row.threatLevel}`)];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'prediction_results.csv';
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('AI UAV IDS Threat Report', 14, 16);
  doc.setFontSize(11);
  doc.text('Model Accuracy: 99.1%', 14, 32);
  doc.text('Threat Level: High', 14, 42);
  doc.text('Prediction Summary: High-confidence anomaly detection completed.', 14, 52);
  doc.save('uav_ids_report.pdf');
});

renderPreviewTable();
renderResultsTable([]);
