document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const fileListContainer = document.getElementById("file-list-container");
    const fileList = document.getElementById("file-list");
    const fileTemplate = document.getElementById("file-item-template");
    const clearAllBtn = document.getElementById("clear-all-btn");

    clearAllBtn.addEventListener("click", () => {
        const items = Array.from(fileList.children);
        items.forEach((item, index) => {
            // Smooth exit animation
            item.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            item.style.opacity = '0';
            item.style.transform = 'translateX(30px)';
        });
        
        setTimeout(() => {
            fileList.innerHTML = "";
            fileListContainer.classList.add("hidden");
        }, 300); // Wait for animation to finish
    });

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
            { label: 'CSV', mime: 'text/csv', ext: '.csv' },
            { label: 'Minify', mime: 'application/json', ext: '.min.json' },
            { label: 'Beautify', mime: 'application/json', ext: '.formatted.json' }
        ],
        'csv': [
            { label: 'JSON', mime: 'application/json', ext: '.json' },
            { label: 'Markdown Table', mime: 'text/markdown', ext: '.md' }
        ],
        'markdown': [
            { label: 'HTML', mime: 'text/html', ext: '.html' }
        ],
        'text': [
            { label: 'Base64 Encode', mime: 'text/plain', ext: '.b64.txt' },
            { label: 'URL Encode', mime: 'text/plain', ext: '.url.txt' }
        ],
        'html': [
            { label: 'Extract Text', mime: 'text/plain', ext: '.txt' }
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
        if (files.length > 0) {
            fileListContainer.classList.remove("hidden");
        }
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
        if (file.type.startsWith('image/')) {
            if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) return 'svg';
            return 'image';
        }
        if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) return 'markdown';
        if (file.type === 'application/json' || file.name.endsWith('.json')) return 'json';
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) return 'csv';
        if (file.type === 'text/html' || file.name.endsWith('.html')) return 'html';
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) return 'text';
        return null;
    }

    function processFile(file, index) {
        const category = detectCategory(file);

        if (!category) {
            console.warn(`File type not supported: ${file.name}`);
            return;
        }

        const availableFormats = CONVERSION_MAP[category];

        // Clone template
        const clone = fileTemplate.content.cloneNode(true);
        const fileItem = clone.querySelector('.file-item');

        // Staggered entry animation based on index
        fileItem.style.animationDelay = `${index * 0.1}s`;

        // Update file icon based on category
        const iconElement = clone.querySelector('.file-type-icon');
        if (category === 'image' || category === 'svg') {
            iconElement.setAttribute('data-lucide', 'image');
        } else if (category === 'json' || category === 'csv') {
            iconElement.setAttribute('data-lucide', 'file-spreadsheet');
        } else if (category === 'markdown') {
            iconElement.setAttribute('data-lucide', 'file-code-2');
        } else if (category === 'text') {
            iconElement.setAttribute('data-lucide', 'file-text');
        } else if (category === 'html') {
            iconElement.setAttribute('data-lucide', 'globe');
        }

        // Re-initialize icon for the cloned template
        lucide.createIcons({
            attrs: {
                class: 'file-type-icon'
            }
        });

        // Populate info
        clone.querySelector('.file-name').textContent = file.name;
        clone.querySelector('.file-size').textContent = formatBytes(file.size);

        // Populate select
        const select = clone.querySelector('.format-select');
        availableFormats.forEach(format => {
            if (file.type === format.mime && format.label !== 'Minify' && format.label !== 'Beautify') return;
            const option = document.createElement('option');
            option.value = JSON.stringify(format);
            option.textContent = format.label;
            select.appendChild(option);
        });

        // Setup Quality Control
        const qualityControl = clone.querySelector('.quality-control');
        const qualitySlider = clone.querySelector('.quality-slider');
        const qualityValue = clone.querySelector('.quality-value');

        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => {
                qualityValue.textContent = `${Math.round(e.target.value * 100)}%`;
            });
        }

        select.addEventListener('change', () => {
            const selectedFormatVal = select.value;
            if (!selectedFormatVal) return;
            const targetFormat = JSON.parse(selectedFormatVal);
            
            if (targetFormat.mime === 'image/jpeg' || targetFormat.mime === 'image/webp') {
                qualityControl.classList.remove('hidden');
            } else {
                qualityControl.classList.add('hidden');
            }
        });

        // Setup Convert Button
        const convertBtn = clone.querySelector('.convert-btn');
        const statusSpan = clone.querySelector('.file-status');

        convertBtn.addEventListener('click', async () => {
            const selectedFormatVal = select.value;
            if (!selectedFormatVal) return;

            const targetFormat = JSON.parse(selectedFormatVal);
            const quality = qualitySlider ? parseFloat(qualitySlider.value) : 0.9;
            
            convertBtn.disabled = true;
            const btnOriginalContent = convertBtn.innerHTML;
            convertBtn.innerHTML = `<span>Processing...</span>`;
            statusSpan.textContent = "Processing...";
            statusSpan.className = "file-status";

            try {
                let convertedBlob;
                if (category === 'image' || category === 'svg') {
                    if (targetFormat.ext === '.pdf') {
                        convertedBlob = await convertImageToPdf(file);
                    } else {
                        convertedBlob = await convertImage(file, targetFormat.mime, quality);
                    }
                } else if (category === 'json') {
                    if (targetFormat.ext === '.csv') convertedBlob = await convertJsonToCsv(file);
                    else if (targetFormat.label === 'Minify') convertedBlob = await convertJsonFormat(file, false);
                    else if (targetFormat.label === 'Beautify') convertedBlob = await convertJsonFormat(file, true);
                } else if (category === 'csv') {
                    if (targetFormat.ext === '.json') convertedBlob = await convertCsvToJson(file);
                    else if (targetFormat.label === 'Markdown Table') convertedBlob = await convertCsvToMarkdown(file);
                } else if (category === 'markdown' && targetFormat.ext === '.html') {
                    convertedBlob = await convertMarkdownToHtml(file);
                } else if (category === 'text') {
                    if (targetFormat.label === 'Base64 Encode') convertedBlob = await convertTextToBase64(file);
                    else if (targetFormat.label === 'URL Encode') convertedBlob = await convertTextToUrlEncode(file);
                } else if (category === 'html' && targetFormat.label === 'Extract Text') {
                    convertedBlob = await convertHtmlToText(file);
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
                convertBtn.innerHTML = btnOriginalContent;
                lucide.createIcons();
            }
        });

        fileList.appendChild(clone);
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

    function convertImage(file, targetMimeType, quality = 0.9) {
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
                    }, targetMimeType, quality);
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
    
    async function convertJsonFormat(file, beautify) {
        const text = await file.text();
        const data = JSON.parse(text);
        const str = beautify ? JSON.stringify(data, null, 2) : JSON.stringify(data);
        return new Blob([str], { type: 'application/json' });
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

    async function convertCsvToMarkdown(file) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return new Blob([""], { type: 'text/markdown' });

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
        let md = '| ' + headers.join(' | ') + ' |\n';
        md += '|' + headers.map(() => '---').join('|') + '|\n';

        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            md += '| ' + row.join(' | ') + ' |\n';
        }

        return new Blob([md], { type: 'text/markdown' });
    }

    async function convertMarkdownToHtml(file) {
        const text = await file.text();
        // Uses marked.js included in index.html
        const html = marked.parse(text);
        
        // Wrap in a basic HTML template with some default styling
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${file.name}</title>
<style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { font-family: monospace; background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #666; }
    img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${html}
</body>
</html>`;
        return new Blob([fullHtml], { type: 'text/html' });
    }

    async function convertTextToBase64(file) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        return new Blob([b64], { type: 'text/plain' });
    }
    
    async function convertTextToUrlEncode(file) {
        const text = await file.text();
        return new Blob([encodeURIComponent(text)], { type: 'text/plain' });
    }

    async function convertHtmlToText(file) {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        return new Blob([doc.body.textContent || ""], { type: 'text/plain' });
    }
});
