function onOpenCvReady() {
  console.log('OpenCV.js is ready.');
}

const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const verticesDiv = document.getElementById('vertices');
const vertexCountInput = document.getElementById('vertexCount');
const traceButton = document.getElementById('traceButton');
let equallyDistantVertices = [];
let image = new Image();

upload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

image.onload = () => {
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
};

traceButton.addEventListener('click', () => {
  const vertexCount = parseInt(vertexCountInput.value);
  if (!isNaN(vertexCount) && vertexCount > 1) {
    traceOutline(vertexCount);
  } else {
    alert('Please enter a valid number of vertices.');
  }
});

function traceOutline(vertexCount) {
  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  cv.Canny(gray, edges, 100, 200, 3, false);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    edges,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0); // Redraw image

  const allVertices = [];
  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    for (let j = 0; j < contour.data32S.length; j += 2) {
      allVertices.push({
        x: contour.data32S[j],
        y: contour.data32S[j + 1],
      });
    }
  }

  equallyDistantVertices = getEquallyDistantVertices(allVertices, vertexCount);
  drawVertices(equallyDistantVertices);
  displayVertices(equallyDistantVertices);

  src.delete();
  gray.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
}

function getEquallyDistantVertices(vertices, vertexCount) {
  const totalLength = vertices.reduce((sum, _, i, arr) => {
    if (i === 0) return sum;
    const dx = arr[i].x - arr[i - 1].x;
    const dy = arr[i].y - arr[i - 1].y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  const segmentLength = totalLength / (vertexCount - 1);
  const result = [vertices[0]];
  let accumulatedLength = 0;

  for (let i = 1; i < vertices.length; i++) {
    const dx = vertices[i].x - vertices[i - 1].x;
    const dy = vertices[i].y - vertices[i - 1].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    accumulatedLength += distance;

    if (accumulatedLength >= segmentLength) {
      result.push(vertices[i]);
      accumulatedLength = 0;
    }

    if (result.length === vertexCount) {
      break;
    }
  }

  return result;
}

function drawVertices(vertices) {
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();
  ctx.stroke();
}

function displayVertices(vertices) {
  verticesDiv.innerHTML =
    '<h3>Vertices:</h3><ul>' +
    vertices.map((vertex) => `<li>(${vertex.x}, ${vertex.y})</li>`).join('') +
    '</ul>';
}
