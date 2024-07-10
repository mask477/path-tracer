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

let imageWidth = 100;
let imageHeight = 100;

let equallyDistantVertices = [];
let allVertices = [];

const LED_SIZE = 10;

let tracingGrid = [];
let srgbGrid = [];

let image = new Image();

populateSrgbGrid();
drawSrgbCanvas();

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

image.onload = () => {
  const width = parseInt(widthInput.value) * 10;
  const height = parseInt(heightInput.value) * 10;
  if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
    canvas.width = width;
    canvas.height = height;
    canvas2.width = width;
    canvas2.height = height;

    ctx.drawImage(image, 0, 0, width, height);
    traceButton.disabled = false;
  } else {
    alert('Please enter valid width and height values.');
  }
};

widthInput.addEventListener('input', (e) => {
  const value = e.target.value;

  if (value > 0) {
    canvas3.width = value * LED_SIZE;
    drawSrgbCanvas();
  }
});
heightInput.addEventListener('input', (e) => {
  const value = e.target.value;

  if (value > 0) {
    canvas3.height = value * LED_SIZE;
    drawSrgbCanvas();
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

  allVertices = [];
  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    for (let j = 0; j < contour.data32S.length; j += 2) {
      allVertices.push({ x: contour.data32S[j], y: contour.data32S[j + 1] });
    }
  }

  allVertices = sortVerticesClockwise(allVertices);

  equallyDistantVertices = transformVertices(allVertices);

  console.log('equallyDistantVertices:', equallyDistantVertices);

  drawAllVertices();
  drawSrgbCanvas();

  src.delete();
  gray.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
}

function transformVertices(vertices) {
  // Calculate the bounding box of the original vertices
  const minX = 0;
  const minY = 0;
  const maxX = canvas.width;
  const maxY = canvas.height;

  const originalWidth = canvas.width;
  const originalHeight = canvas.height;

  const targetWidth = widthInput.value;
  const targetHeight = heightInput.value;
  const numVertices = vertexCountInput.value;

  // Calculate scaling factors
  const scaleX = targetWidth / originalWidth;
  const scaleY = targetHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY);

  // Scale and translate vertices to fit within target dimensions
  const scaledVertices = vertices.map((vertex) => ({
    x: Math.round((vertex.x - minX) * scale),
    y: Math.round((vertex.y - minY) * scale),
  }));

  // Interpolate vertices to match the desired number of vertices
  function interpolateVertices(vertices, numVertices) {
    const result = [];
    const totalLength = vertices.reduce((acc, vertex, i) => {
      if (i === 0) return acc;
      return (
        acc +
        Math.hypot(
          vertices[i].x - vertices[i - 1].x,
          vertices[i].y - vertices[i - 1].y
        )
      );
    }, 0);
    const segmentLength = totalLength / numVertices;

    let currentSegment = 0;
    let accumulatedLength = 0;
    for (let i = 0; i < numVertices; i++) {
      while (
        accumulatedLength +
          Math.hypot(
            vertices[currentSegment + 1].x - vertices[currentSegment].x,
            vertices[currentSegment + 1].y - vertices[currentSegment].y
          ) <
        segmentLength * i
      ) {
        accumulatedLength += Math.hypot(
          vertices[currentSegment + 1].x - vertices[currentSegment].x,
          vertices[currentSegment + 1].y - vertices[currentSegment].y
        );
        currentSegment++;
      }
      const t =
        (segmentLength * i - accumulatedLength) /
        Math.hypot(
          vertices[currentSegment + 1].x - vertices[currentSegment].x,
          vertices[currentSegment + 1].y - vertices[currentSegment].y
        );
      result.push({
        x: Math.round(
          vertices[currentSegment].x * (1 - t) +
            vertices[currentSegment + 1].x * t
        ),
        y: Math.round(
          vertices[currentSegment].y * (1 - t) +
            vertices[currentSegment + 1].y * t
        ),
      });
    }
    return result;
  }

  return interpolateVertices(scaledVertices, numVertices);
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

function drawAllVertices() {
  console.log('drawAllVertices:', allVertices);
  let vertices = allVertices;
  const context = canvas2.getContext('2d');
  context.clearRect(0, 0, canvas2.width, canvas2.height);

  context.beginPath();
  context.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    context.lineTo(vertices[i].x, vertices[i].y);
  }
  context.stroke();
  context.closePath();

  for (let i = 0; i < vertices.length; i++) {
    context.beginPath();
    context.arc(vertices[i].x, vertices[i].y, 2, 0, 2 * Math.PI);
    context.fillStyle = 'red';
    context.fill();
    context.closePath();
  }
}

function populateSrgbGrid() {
  srgbGrid = [];
  for (let y = 0; y < heightInput.value; y++) {
    let row = [];
    for (let x = 0; x < widthInput.value; x++) {
      row.push(0);
    }

    srgbGrid.push(row);
  }

  console.log(srgbGrid);
}

function drawSrgbCanvas() {
  console.log('drawSrgbCanvas');
  const context = canvas3.getContext('2d');

  context.clearRect(0, 0, canvas3.width, canvas3.height);

  let index = 0;
  for (let y = 0; y < srgbGrid.length; y++) {
    for (let x = 0; x < srgbGrid[0].length; x++) {
      index++;
      const drawAtX = LED_SIZE * x;
      const drawAtY = LED_SIZE * y;

      const shouldFill = equallyDistantVertices.find(
        (vertex) => vertex.x == x && vertex.y == y
      );

      context.beginPath();
      if (shouldFill) {
        context.fillStyle = 'red';
        context.fillRect(drawAtX, drawAtY, LED_SIZE, LED_SIZE);
      } else {
        context.rect(drawAtX, drawAtY, LED_SIZE, LED_SIZE);
      }

      context.stroke();
      context.closePath();
    }
  }

  console.log('End Index:', index);
}

function calculateAspectRatio(width, height) {
  function gcd(a, b) {
    while (b) {
      [a, b] = [b, a % b];
    }
    return a;
  }

  const gcdValue = gcd(width, height);
  const aspectWidth = width / gcdValue;
  const aspectHeight = height / gcdValue;
  return { aspectWidth, aspectHeight };
}
