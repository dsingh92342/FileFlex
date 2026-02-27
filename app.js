document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Register Service Worker for PWA (Offline Support)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(reg => {
                console.log('ServiceWorker registered:', reg.scope);
            }).catch(err => console.log('ServiceWorker registration failed:', err));
        });
    }

    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const fileListContainer = document.getElementById("file-list-container");
    const fileList = document.getElementById("file-list");
    const fileTemplate = document.getElementById("file-item-template");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const batchZipBtn = document.getElementById("batch-zip-btn");

    clearAllBtn.addEventListener("click", () => {
        const items = Array.from(fileList.children);
        items.forEach((item, index) => {
            item.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            item.style.opacity = '0';
            item.style.transform = 'translateX(30px)';
        });
        
        setTimeout(() => {
            fileList.innerHTML = "";
            fileListContainer.classList.add("hidden");
        }, 300);
    });

    batchZipBtn.addEventListener("click", async () => {
        const items = Array.from(fileList.children);
        if (items.length === 0) return;

        const zip = new JSZip();
        batchZipBtn.disabled = true;
        const originalBtnContent = batchZipBtn.innerHTML;
        batchZipBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> <span>Zipping...</span>`;
        lucide.createIcons();

        let hasFilesToZip = false;

        for (let item of items) {
            if (item._doConvert) {
                const result = await item._doConvert();
                if (result && result.blob) {
                    zip.file(result.name, result.blob);
                    hasFilesToZip = true;
                }
            }
        }

        if (hasFilesToZip) {
            try {
                const zipContent = await zip.generateAsync({ type: "blob" });
                triggerDownload(zipContent, "FileFlex_Batch.zip");
            } catch (err) {
                console.error("ZIP Generation Failed", err);
                alert("Failed to generate ZIP file.");
            }
        }

        batchZipBtn.disabled = false;
        batchZipBtn.innerHTML = originalBtnContent;
        lucide.createIcons();
    });

    // Formats mapping: source -> available targets
    const CONVERSION_MAP = {
        'image': [
            { label: 'PNG', mime: 'image/png', ext: '.png' },
            { label: 'JPEG', mime: 'image/jpeg', ext: '.jpg' },
            { label: 'WEBP', mime: 'image/webp', ext: '.webp' },
            { label: 'Resize & Scale', mime: 'image/png', ext: '_resized.png' },
            { label: 'PDF', mime: 'application/pdf', ext: '.pdf' },
            { label: 'Privacy (Strip EXIF)', mime: 'image/png', ext: '_private.png' },
            { label: 'Security (SHA-256)', mime: 'text/plain', ext: '.sha256.txt' }
        ],
        'svg': [
            { label: 'PNG', mime: 'image/png', ext: '.png' },
            { label: 'JPEG', mime: 'image/jpeg', ext: '.jpg' },
            { label: 'WEBP', mime: 'image/webp', ext: '.webp' }
        ],
        'excel': [
            { label: 'JSON', mime: 'application/json', ext: '.json' },
            { label: 'CSV', mime: 'text/csv', ext: '.csv' }
        ],
        'json': [
            { label: 'CSV', mime: 'text/csv', ext: '.csv' },
            { label: 'Excel (XLSX)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
            { label: 'Minify', mime: 'application/json', ext: '.min.json' },
            { label: 'Beautify', mime: 'application/json', ext: '.formatted.json' }
        ],
        'csv': [
            { label: 'JSON', mime: 'application/json', ext: '.json' },
            { label: 'Excel (XLSX)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
            { label: 'Markdown Table', mime: 'text/markdown', ext: '.md' }
        ],
        'markdown': [
            { label: 'HTML', mime: 'text/html', ext: '.html' }
        ],
        'text': [
            { label: 'Base64 Encode', mime: 'text/plain', ext: '.b64.txt' },
            { label: 'URL Encode', mime: 'text/plain', ext: '.url.txt' },
            { label: 'Generate QR Code', mime: 'image/png', ext: '_qr.png' },
            { label: 'Security (SHA-256)', mime: 'text/plain', ext: '.sha256.txt' }
        ],
        'html': [
            { label: 'Extract Text', mime: 'text/plain', ext: '.txt' }
        ],
        'any': [
            { label: 'Security (SHA-256)', mime: 'text/plain', ext: '.sha256.txt' }
        ]
    };

    dropZone.addEventListener("click", () => fileInput.click());

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

    dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files), false);

    function handleFiles(files) {
        if (files.length > 0) fileListContainer.classList.remove("hidden");
        [...files].forEach((file, index) => processFile(file, index));
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
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (file.type.startsWith('image/')) {
            if (file.type === 'image/svg+xml' || ext === '.svg') return 'svg';
            return 'image';
        }
        if (ext === '.md' || ext === '.markdown') return 'markdown';
        if (file.type === 'application/json' || ext === '.json') return 'json';
        if (file.type === 'text/csv' || ext === '.csv') return 'csv';
        if (ext === '.xlsx' || ext === '.xls') return 'excel';
        if (file.type === 'text/html' || ext === '.html') return 'html';
        if (file.type === 'text/plain' || ext === '.txt') return 'text';
        return 'any';
    }

    function processFile(file, index) {
        const category = detectCategory(file);
        const availableFormats = CONVERSION_MAP[category] || CONVERSION_MAP['any'];

        const clone = fileTemplate.content.cloneNode(true);
        const fileItem = clone.querySelector('.file-item');
        fileItem.style.animationDelay = `${index * 0.1}s`;

        const iconElement = clone.querySelector('.file-type-icon');
        if (category === 'image' || category === 'svg') iconElement.setAttribute('data-lucide', 'image');
        else if (category === 'excel' || category === 'csv') iconElement.setAttribute('data-lucide', 'file-spreadsheet');
        else if (category === 'json') iconElement.setAttribute('data-lucide', 'braces');
        else if (category === 'markdown') iconElement.setAttribute('data-lucide', 'file-code-2');
        else if (category === 'text') iconElement.setAttribute('data-lucide', 'file-text');
        else if (category === 'html') iconElement.setAttribute('data-lucide', 'globe');
        else iconElement.setAttribute('data-lucide', 'file');

        lucide.createIcons({ attrs: { class: 'file-type-icon' } });

        clone.querySelector('.file-name').textContent = file.name;
        clone.querySelector('.file-size').textContent = formatBytes(file.size);

        const select = clone.querySelector('.format-select');
        availableFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = JSON.stringify(format);
            option.textContent = format.label;
            select.appendChild(option);
        });

        const qualityControl = clone.querySelector('.quality-control');
        const qualitySlider = clone.querySelector('.quality-slider');
        const qualityValue = clone.querySelector('.quality-value');
        const resizeControls = clone.querySelector('.resize-controls');
        const wInput = clone.querySelector('.w-input');
        const hInput = clone.querySelector('.h-input');

        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => {
                qualityValue.textContent = `${Math.round(e.target.value * 100)}%`;
            });
        }

        // Auto-detect dimensions for image resize
        if (category === 'image') {
            const img = new Image();
            img.onload = () => {
                wInput.value = img.width;
                hInput.value = img.height;
                wInput.placeholder = img.width;
                hInput.placeholder = img.height;
            };
            img.src = URL.createObjectURL(file);
        }

        select.addEventListener('change', () => {
            const selectedFormatVal = select.value;
            if (!selectedFormatVal) return;
            const targetFormat = JSON.parse(selectedFormatVal);
            
            // Show/Hide Quality
            if (targetFormat.mime === 'image/jpeg' || targetFormat.mime === 'image/webp') qualityControl.classList.remove('hidden');
            else qualityControl.classList.add('hidden');

            // Show/Hide Resize
            if (targetFormat.label === 'Resize & Scale') resizeControls.classList.remove('hidden');
            else resizeControls.classList.add('hidden');
        });

        const convertBtn = clone.querySelector('.convert-btn');
        const statusSpan = clone.querySelector('.file-status');

        fileItem._doConvert = async () => {
            const selectedFormatVal = select.value;
            if (!selectedFormatVal) return null;

            const targetFormat = JSON.parse(selectedFormatVal);
            const quality = qualitySlider ? parseFloat(qualitySlider.value) : 0.9;
            
            convertBtn.disabled = true;
            statusSpan.textContent = "Processing...";
            statusSpan.className = "file-status";

            try {
                let convertedBlob;
                if (targetFormat.label === 'Generate QR Code') {
                    convertedBlob = await generateQRCode(file);
                } else if (targetFormat.label.startsWith('Security')) {
                    convertedBlob = await generateFileHash(file);
                } else if (category === 'image' || category === 'svg') {
                    if (targetFormat.label === 'Resize & Scale') {
                        convertedBlob = await convertImage(file, 'image/png', 1, parseInt(wInput.value), parseInt(hInput.value));
                    } else if (targetFormat.label.includes('Privacy')) {
                        convertedBlob = await convertImage(file, 'image/png', 1);
                    } else if (targetFormat.ext === '.pdf') {
                        convertedBlob = await convertImageToPdf(file);
                    } else {
                        convertedBlob = await convertImage(file, targetFormat.mime, quality);
                    }
                } else if (category === 'excel') {
                    convertedBlob = await convertExcel(file, targetFormat.ext);
                } else if (category === 'json') {
                    if (targetFormat.ext === '.csv') convertedBlob = await convertJsonToCsv(file);
                    else if (targetFormat.ext === '.xlsx') convertedBlob = await convertJsonToExcel(file);
                    else if (targetFormat.label === 'Minify') convertedBlob = await convertJsonFormat(file, false);
                    else if (targetFormat.label === 'Beautify') convertedBlob = await convertJsonFormat(file, true);
                } else if (category === 'csv') {
                    if (targetFormat.ext === '.json') convertedBlob = await convertCsvToJson(file);
                    else if (targetFormat.ext === '.xlsx') convertedBlob = await convertCsvToExcel(file);
                    else if (targetFormat.label === 'Markdown Table') convertedBlob = await convertCsvToMarkdown(file);
                } else if (category === 'markdown') {
                    convertedBlob = await convertMarkdownToHtml(file);
                } else if (category === 'text') {
                    if (targetFormat.label === 'Base64 Encode') convertedBlob = await convertTextToBase64(file);
                    else if (targetFormat.label === 'URL Encode') convertedBlob = await convertTextToUrlEncode(file);
                } else if (category === 'html') {
                    convertedBlob = await convertHtmlToText(file);
                }

                if (convertedBlob) {
                    const originalNameNoExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    statusSpan.textContent = "Success";
                    statusSpan.classList.add("status-success");
                    return { blob: convertedBlob, name: `${originalNameNoExt}${targetFormat.ext}` };
                }
            } catch (err) {
                console.error("Conversion failed:", err);
                statusSpan.textContent = "Error";
                statusSpan.classList.add("status-error");
            } finally {
                convertBtn.disabled = false;
            }
            return null;
        };

        convertBtn.addEventListener('click', async () => {
            const btnOriginalContent = convertBtn.innerHTML;
            convertBtn.innerHTML = `<span>Processing...</span>`;
            const result = await fileItem._doConvert();
            if (result) triggerDownload(result.blob, result.name);
            convertBtn.innerHTML = btnOriginalContent;
            lucide.createIcons();
        });

        fileList.appendChild(clone);
    }

    // --- Core Logic Models ---

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

    async function generateFileHash(file) {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return new Blob([`File: ${file.name}\nSHA-256: ${hashHex}`], { type: 'text/plain' });
    }

    async function generateQRCode(file) {
        const text = await file.text();
        return new Promise((resolve) => {
            const container = document.createElement('div');
            new QRCode(container, {
                text: text,
                width: 512,
                height: 512,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            setTimeout(() => {
                const img = container.querySelector('img');
                if (img) {
                    fetch(img.src).then(res => res.blob()).then(resolve);
                }
            }, 100);
        });
    }

    function convertImage(file, targetMimeType, quality = 0.9, width, height) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = width || img.width;
                    canvas.height = height || img.height;
                    const ctx = canvas.getContext('2d');
                    if (targetMimeType === 'image/jpeg') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(blob => blob ? resolve(blob) : reject(), targetMimeType, quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async function convertExcel(file, targetExt) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (targetExt === '.json') {
            const json = XLSX.utils.sheet_to_json(worksheet);
            return new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        } else {
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            return new Blob([csv], { type: 'text/csv' });
        }
    }

    async function convertJsonToExcel(file) {
        const json = JSON.parse(await file.text());
        const ws = XLSX.utils.json_to_sheet(Array.isArray(json) ? json : [json]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    async function convertCsvToExcel(file) {
        const csv = await file.text();
        const workbook = XLSX.read(csv, { type: 'string' });
        const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    async function convertImageToPdf(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({ orientation: img.width > img.height ? 'l' : 'p', unit: 'px', format: [img.width, img.height] });
                    pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
                    resolve(pdf.output('blob'));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async function convertJsonToCsv(file) {
        const json = JSON.parse(await file.text());
        const ws = XLSX.utils.json_to_sheet(Array.isArray(json) ? json : [json]);
        return new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv' });
    }
    
    async function convertJsonFormat(file, beautify) {
        const json = JSON.parse(await file.text());
        return new Blob([JSON.stringify(json, null, beautify ? 2 : 0)], { type: 'application/json' });
    }

    async function convertCsvToJson(file) {
        const csv = await file.text();
        const workbook = XLSX.read(csv, { type: 'string' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        return new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    }

    async function convertCsvToMarkdown(file) {
        const csv = await file.text();
        const workbook = XLSX.read(csv, { type: 'string' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (json.length === 0) return new Blob([""], { type: 'text/markdown' });
        const headers = Object.keys(json[0]);
        let md = '| ' + headers.join(' | ') + ' |\n|' + headers.map(() => '---').join('|') + '|\n';
        json.forEach(row => md += '| ' + headers.map(h => row[h]).join(' | ') + ' |\n');
        return new Blob([md], { type: 'text/markdown' });
    }

    async function convertMarkdownToHtml(file) {
        const html = marked.parse(await file.text());
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui,sans-serif;line-height:1.6;max-width:800px;margin:0 auto;padding:2rem;}pre{background:#f4f4f4;padding:1rem;border-radius:8px;}code{font-family:monospace;background:#f4f4f4;padding:0.2rem 0.4rem;}</style></head><body>${html}</body></html>`;
        return new Blob([fullHtml], { type: 'text/html' });
    }

    async function convertTextToBase64(file) {
        const reader = new FileReader();
        return new Promise(resolve => {
            reader.onload = () => resolve(new Blob([btoa(reader.result)], { type: 'text/plain' }));
            reader.readAsBinaryString(file);
        });
    }
    
    async function convertTextToUrlEncode(file) {
        return new Blob([encodeURIComponent(await file.text())], { type: 'text/plain' });
    }

    async function convertHtmlToText(file) {
        const doc = new DOMParser().parseFromString(await file.text(), 'text/html');
        return new Blob([doc.body.textContent || ""], { type: 'text/plain' });
    }
});
