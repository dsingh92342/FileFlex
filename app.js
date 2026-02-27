document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const fileListContainer = document.getElementById("file-list");
    const fileTemplate = document.getElementById("file-item-template");

    // Formats mapping: source -> available targets
    const CONVERSION_MAP = {
        'image': [
            { label: 'PNG', mime: 'image/png', ext: '.png' },
            { label: 'JPEG', mime: 'image/jpeg', ext: '.jpg' },
            { label: 'WEBP', mime: 'image/webp', ext: '.webp' },
            { label: 'PDF', mime: 'application/pdf', ext: '.pdf' }
        ],
        'svg': [
            { label: 'PNG', mime: 'image/png', ext: '.png' },
            { label: 'JPEG', mime: 'image/jpeg', ext: '.jpg' },
            { label: 'WEBP', mime: 'image/webp', ext: '.webp' }
        ],
        'json': [
            { label: 'CSV', mime: 'text/csv', ext: '.csv' }
        ],
        'csv': [
            { label: 'JSON', mime: 'application/json', ext: '.json' }
        ]
    };

    // Make drop zone clickable
    dropZone.addEventListener("click", () => fileInput.click());

    // Drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add("drop-zone--over"), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove("drop-zone--over"), false);
    });

    // Handle dropped or selected files
    dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files), false);

    function handleFiles(files) {
        [...files].forEach(processFile);
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function detectCategory(file) {
        if (file.type.startsWith('image/')) {
            if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) return 'svg';
            return 'image';
        }
        if (file.type === 'application/json' || file.name.endsWith('.json')) return 'json';
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) return 'csv';
        return null;
    }

    function processFile(file) {
        const category = detectCategory(file);

        if (!category) {
            console.warn(`File type not supported: ${file.name}`);
            return;
        }

        const availableFormats = CONVERSION_MAP[category];

        // Clone template
        const clone = fileTemplate.content.cloneNode(true);
        const fileItem = clone.querySelector('.file-item');

        // Populate info
        clone.querySelector('.file-name').textContent = file.name;
        clone.querySelector('.file-size').textContent = formatBytes(file.size);

        // Populate select
        const select = clone.querySelector('.format-select');
        availableFormats.forEach(format => {
            // Don't show the exact same format as target
            if (file.type === format.mime) return;

            const option = document.createElement('option');
            option.value = JSON.stringify(format);
            option.textContent = format.label;
            select.appendChild(option);
        });

        // Setup Convert Button
        const convertBtn = clone.querySelector('.convert-btn');
        const statusSpan = clone.querySelector('.file-status');

        convertBtn.addEventListener('click', async () => {
            const selectedFormatVal = select.value;
            if (!selectedFormatVal) return;

            const targetFormat = JSON.parse(selectedFormatVal);
            convertBtn.disabled = true;
            statusSpan.textContent = "Processing...";
            statusSpan.className = "file-status";

            try {
                let convertedBlob;
                if (category === 'image' || category === 'svg') {
                    if (targetFormat.ext === '.pdf') {
                        convertedBlob = await convertImageToPdf(file);
                    } else {
                        convertedBlob = await convertImage(file, targetFormat.mime);
                    }
                } else if (category === 'json' && targetFormat.ext === '.csv') {
                    convertedBlob = await convertJsonToCsv(file);
                } else if (category === 'csv' && targetFormat.ext === '.json') {
                    convertedBlob = await convertCsvToJson(file);
                }

                if (convertedBlob) {
                    const originalNameNoExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    const newFileName = `${originalNameNoExt}${targetFormat.ext}`;
                    triggerDownload(convertedBlob, newFileName);

                    statusSpan.textContent = "Success";
                    statusSpan.classList.add("status-success");
                }
            } catch (err) {
                console.error("Conversion failed:", err);
                statusSpan.textContent = "Error";
                statusSpan.classList.add("status-error");
            } finally {
                convertBtn.disabled = false;
            }
        });

        fileListContainer.appendChild(clone);
    }

    // --- Conversion Logic ---

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function convertImage(file, targetMimeType) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');

                    if (targetMimeType === 'image/jpeg') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }

                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Canvas toBlob failed"));
                    }, targetMimeType, 0.9);
                };
                img.onerror = () => reject(new Error("Failed to load image"));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
        });
    }

    async function convertImageToPdf(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({
                        orientation: img.width > img.height ? 'l' : 'p',
                        unit: 'px',
                        format: [img.width, img.height]
                    });
                    pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
                    resolve(pdf.output('blob'));
                };
                img.onerror = () => reject(new Error("Failed to load image"));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
        });
    }

    async function convertJsonToCsv(file) {
        const text = await file.text();
        let data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : [data];
        if (arr.length === 0) return new Blob([""], { type: 'text/csv' });

        const headers = Object.keys(arr[0]);
        const csvRows = [headers.join(',')];

        for (const row of arr) {
            const values = headers.map(header => {
                const val = row[header];
                if (typeof val === 'string') {
                    const escaped = val.replace(/"/g, '""');
                    return (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) ? `"${escaped}"` : escaped;
                }
                return val !== null && val !== undefined ? val : '';
            });
            csvRows.push(values.join(','));
        }

        return new Blob([csvRows.join('\n')], { type: 'text/csv' });
    }

    async function convertCsvToJson(file) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length === 0) return new Blob(["[]"], { type: 'application/json' });

        const parseCSVLine = (line) => {
            const result = [];
            let current = '', inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                    else inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current);
            return result;
        };

        const headers = parseCSVLine(lines[0]);
        const resultData = [];

        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentLine = parseCSVLine(lines[i]);
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j] !== undefined ? currentLine[j] : null;
            }
            resultData.push(obj);
        }

        return new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
    }
});
