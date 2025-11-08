function nearestNeighborScale(image, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
}

function getFileNameWithoutExtension(filename) {
    return filename.split('.').slice(0, -1).join('.');
}

function createImageElement(src, maxWidth, maxHeight) {
    const img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = maxWidth + 'px';
    img.style.maxHeight = maxHeight + 'px';
    return img;
}

function createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    if (className) button.className = className;
    if (onClick) button.addEventListener('click', onClick);
    return button;
}

function saveImage(canvas, fileName) {
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = fileName;
    link.click();
}

function clearPreview(previewContainer, resultContainer, fileInput) {
    previewContainer.innerHTML = '';
    resultContainer.innerHTML = '';
    fileInput.value = '';
}

export default function(smwc) {
    const scaledWidth = 256;
    const scaledHeight = 224;

    const fileInput = smwc.byID("fileInput");
    const previewContainer = smwc.byID('previewContainer');
    const resultContainer = smwc.byID('resultContainer');

    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {

                previewContainer.innerHTML = '';
                resultContainer.innerHTML = '';

                const originalPreview = createImageElement(e.target.result, scaledWidth, scaledHeight);
                previewContainer.appendChild(originalPreview);

                const scaledCanvas = nearestNeighborScale(img, scaledWidth, scaledHeight);
                const scaledPreview = createImageElement(scaledCanvas.toDataURL(), scaledWidth, scaledHeight);
                resultContainer.appendChild(scaledPreview);

                const fileName = getFileNameWithoutExtension(file.name) + '_scaled.png';
                const saveButton = createButton('Save', 'saveButton', () => saveImage(scaledCanvas, fileName));
                resultContainer.appendChild(saveButton);

                const clearButton = createButton('Clear', null, () => clearPreview(previewContainer, resultContainer, fileInput));
                previewContainer.appendChild(clearButton);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
