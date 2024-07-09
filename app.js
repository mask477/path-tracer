function onOpenCvReady() {
  console.log('OpenCV.js is ready.');
  upload.disabled = false;
}

const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const canvas2 = document.getElementById('canvas2');
const ctx2 = canvas2.getContext('2d');

const vertexCountInput = document.getElementById('vertexCount');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const traceButton = document.getElementById('traceButton');

let equallyDistantVertices = [];

let image = new Image();

upload.addEventListener('change', (event) => {
  console.log('image selected');
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

widthInput.addEventListener('input', (e) => {
  const value = e.target.value;

  if (value > 0) {
    canvas.width = value;
  }
});
heightInput.addEventListener('input', (e) => {
  const value = e.target.value;

  if (value > 0) {
    canvas.height = value;
  }
});

traceButton.addEventListener('click', () => {
  const vertexCount = parseInt(vertexCountInput.value);
  if (!isNaN(vertexCount) && vertexCount > 1) {
    traceOutline(vertexCount);
  } else {
    alert('Please enter a valid number of vertices.');
  }
});

image.onload = () => {
  console.log('Image loaded');
  const width = parseInt(widthInput.value);
  const height = parseInt(heightInput.value);
  if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
    canvas.width = width;
    canvas.height = height;

    console.log({ width, height });
    ctx.drawImage(image, 0, 0, width, height);
    traceButton.disabled = false;
  } else {
    alert('Please enter valid width and height values.');
  }
};

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
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height); // Redraw resized image

  const allVertices = [];
  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    for (let j = 0; j < contour.data32S.length; j += 2) {
      allVertices.push({ x: contour.data32S[j], y: contour.data32S[j + 1] });
    }
  }

  equallyDistantVertices = getEquallyDistantVertices(allVertices, vertexCount);
  equallyDistantVertices = sortVerticesClockwise(equallyDistantVertices);

  drawVertices(canvas2, allVertices);
  drawVertices(canvas3, equallyDistantVertices);

  src.delete();
  gray.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
}

function getEquallyDistantVertices(vertices, vertexCount) {
  // Calculate total perimeter
  let totalLength = calculatePerimeter(vertices);
  const segmentLength = totalLength / vertexCount;

  // Create an array to store vertices in clockwise order
  const result = [];
  let currentIndex = 0;
  let accumulatedLength = 0;

  // Add the first vertex
  result.push(vertices[0]);

  while (result.length < vertexCount) {
    let nextIndex = (currentIndex + 1) % vertices.length;
    let dx = vertices[nextIndex].x - vertices[currentIndex].x;
    let dy = vertices[nextIndex].y - vertices[currentIndex].y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    while (accumulatedLength + distance < segmentLength) {
      accumulatedLength += distance;
      currentIndex = nextIndex;
      nextIndex = (currentIndex + 1) % vertices.length;
      dx = vertices[nextIndex].x - vertices[currentIndex].x;
      dy = vertices[nextIndex].y - vertices[currentIndex].y;
      distance = Math.sqrt(dx * dx + dy * dy);
    }

    const remainingLength = segmentLength - accumulatedLength;
    const ratio = remainingLength / distance;
    const x = vertices[currentIndex].x + ratio * dx;
    const y = vertices[currentIndex].y + ratio * dy;

    result.push({ x, y });
    accumulatedLength = 0;
    currentIndex = nextIndex;
  }

  return result;
}

function calculatePerimeter(vertices) {
  let totalLength = 0;
  for (let i = 1; i < vertices.length; i++) {
    const dx = vertices[i].x - vertices[i - 1].x;
    const dy = vertices[i].y - vertices[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }
  const dx = vertices[0].x - vertices[vertices.length - 1].x;
  const dy = vertices[0].y - vertices[vertices.length - 1].y;
  totalLength += Math.sqrt(dx * dx + dy * dy);
  return totalLength;
}

function sortVerticesClockwise(vertices) {
  const centroid = vertices.reduce(
    (acc, vertex) => ({
      x: acc.x + vertex.x / vertices.length,
      y: acc.y + vertex.y / vertices.length,
    }),
    { x: 0, y: 0 }
  );

  return vertices.sort((a, b) => {
    const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
    const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
    return angleA - angleB;
  });
}

function drawVertices(canvas, vertices) {
  console.log('drawVertices:', vertices);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas2.width, canvas2.height);

  context.beginPath();
  context.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    context.lineTo(vertices[i].x, vertices[i].y);
  }
  context.closePath();
  context.stroke();

  for (let i = 0; i < vertices.length; i++) {
    context.beginPath();
    context.arc(vertices[i].x, vertices[i].y, 2, 0, 2 * Math.PI);
    context.fillStyle = 'red';
    context.fill();
    context.closePath();
  }
}
