const canvas = document.getElementById('poolTable');
const ctx = canvas.getContext('2d');

const tableWidth = canvas.width;
const tableHeight = canvas.height;

// Ball properties
const ballRadius = 12;
const balls = [];
const colors = ['#A50000', '#A50000', '#A50000', '#A50000', '#A50000', '#A50000', '#A50000'];

// Pockets
const pocketRadius = ballRadius * 2.5;
const pockets = [
  { x: 0, y: 0 },
  { x: 0, y: tableHeight /2 },
  { x: tableWidth, y: 0 },
  { x: 0, y: tableHeight },
  { x: tableWidth , y: tableHeight /2},
  { x: tableWidth, y: tableHeight},
];

// Cue ball
const cueBall = { 
  x: tableWidth / 2, 
  y: tableHeight / 1.5, 
  vx: 0, 
  vy: 0, 
  color: '#fff', 
  pocketed: false 
};

// Black ball
const blackBall = { 
  x: tableWidth / 2, 
  y: tableHeight / 3, 
  vx: 0, 
  vy: 0, 
  color: '#000', 
  number: 8, // Assign "8" to black ball
  pocketed: false 
};


// Cue stick
let cueStick = { 
  angle: 0, 
  dragging: false, 
  power: 0, 
  maxPower: 100, 
  stickLength: 500, 
  returning: false, 
  returnSpeed: 0 
};

// Physics
const friction = 0.99;
const subSteps = 4;

// Game state
let gameOver = false;

// Utility Functions
function drawBall(ball) {
  if (ball.pocketed) return;

  ctx.save(); // Save the current canvas state

  // Move canvas origin to the ball's center
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.rotation); // Rotate the canvas by the ball's rotation angle

  // Draw the ball with gradient
  const gradient = ctx.createRadialGradient(0, 0, ballRadius * 0.6, 0, 0, ballRadius);
  gradient.addColorStop(0, ball.color);
  gradient.addColorStop(1, '#333'); // Darker shade at the edges

  ctx.beginPath();
  ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.closePath();

  // Add ball details
  if (ball === cueBall) {
    // Draw a small red point for the cue ball
    ctx.beginPath();
    ctx.arc(0, 0, ballRadius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
  } else if (ball === blackBall) {
    // Draw "8" for the black ball
    ctx.fillStyle = '#fff';
    ctx.font = `${ballRadius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('8', 0, 0);
  } else {
    // Draw numbers for other balls
    ctx.fillStyle = '#fff';
    ctx.font = `${ballRadius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ball.number, 0, 0);
  }

  ctx.restore(); // Restore the canvas state to avoid affecting other drawings
}




function drawPockets() {
  pockets.forEach((pocket) => {
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, pocketRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000'; // Black color for pockets
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 15; // Glow effect around pockets
    ctx.fill();
    ctx.closePath();
  });
}


function drawCueStick() {
    if (cueBall.pocketed || gameOver) return;
  
    let stickStartX, stickStartY, stickEndX, stickEndY;
  
    if (cueStick.dragging || cueStick.returning) {
      // Calculate stick position during dragging or returning
      const offset = cueStick.returning ? cueStick.returnSpeed : cueStick.power;
      stickStartX = cueBall.x + Math.cos(cueStick.angle) * offset;
      stickStartY = cueBall.y + Math.sin(cueStick.angle) * offset;
      stickEndX = stickStartX + Math.cos(cueStick.angle) * cueStick.stickLength;
      stickEndY = stickStartY + Math.sin(cueStick.angle) * cueStick.stickLength;
  
      const stickWidth = 10; // Base width of the stick
      const tipWidth = 5; // Narrow tip for realism
  
      // Draw the main stick body (darker brown)
      ctx.beginPath();
      ctx.moveTo(stickStartX, stickStartY);
      ctx.lineTo(stickEndX, stickEndY);
      ctx.lineWidth = stickWidth;
      ctx.strokeStyle = '#8B4513'; // Dark brown
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.closePath();
  
      // Draw the tip (lighter brown)
      const tipLength = cueStick.stickLength * 0.1; // 10% of the stick length
      const tipStartX = stickEndX - Math.cos(cueStick.angle) * tipLength;
      const tipStartY = stickEndY - Math.sin(cueStick.angle) * tipLength;
  
      ctx.beginPath();
      ctx.moveTo(tipStartX, tipStartY);
      ctx.lineTo(stickEndX, stickEndY);
      ctx.lineWidth = tipWidth;
      ctx.strokeStyle = '#CD853F'; // Lighter brown
      ctx.stroke();
      ctx.closePath();
  
      // Add a subtle shadow for depth
      ctx.beginPath();
      ctx.moveTo(stickStartX + 3, stickStartY + 3); // Offset for shadow
      ctx.lineTo(stickEndX + 3, stickEndY + 3); // Offset for shadow
      ctx.lineWidth = stickWidth;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Semi-transparent black
      ctx.stroke();
      ctx.closePath();
    }
  }
  

function drawGuideline() {
    if (!cueStick.dragging || cueBall.pocketed || gameOver) return;
  
    const guidelineLength = 500;
    const dx = -Math.cos(cueStick.angle);
    const dy = -Math.sin(cueStick.angle);
  
    // Calculate the first collision point
    const predictedCollision = getFirstCollision(cueBall, cueStick.angle);
    if (predictedCollision) {
      const { collisionPoint, hitBall, reflectionAngle } = predictedCollision;
  
      // First Line: Cue ball's initial path
      ctx.beginPath();
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(collisionPoint.x, collisionPoint.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent white
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]); // Dashed line
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.closePath();
  
      // Dashed Circle (วงกลมเส้นประ) at the bouncing point
      ctx.beginPath();
      ctx.arc(collisionPoint.x, collisionPoint.y, ballRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.setLineDash([5, 5]); // Dashed circle
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.closePath();
  
      // Second Line: Cue ball's path after collision
      if (!hitBall) {
        // Cue ball hitting a wall (reflection logic)
        const reflectedX = collisionPoint.x + Math.cos(reflectionAngle) * guidelineLength;
        const reflectedY = collisionPoint.y + Math.sin(reflectionAngle) * guidelineLength;
  
        ctx.beginPath();
        ctx.moveTo(collisionPoint.x, collisionPoint.y);
        ctx.lineTo(reflectedX, reflectedY);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // Semi-transparent green
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.closePath();
      } else {
        // Cue ball hitting another ball
        const collisionVectorX = hitBall.x - collisionPoint.x;
        const collisionVectorY = hitBall.y - collisionPoint.y;
        const collisionMagnitude = Math.sqrt(collisionVectorX ** 2 + collisionVectorY ** 2);
  
        const normalizedCollisionX = collisionVectorX / collisionMagnitude;
        const normalizedCollisionY = collisionVectorY / collisionMagnitude;
  
        // Project cue ball's velocity onto collision plane
        const dotProduct = dx * normalizedCollisionX + dy * normalizedCollisionY;
        const cueBallDeflectionX = dx - 2 * dotProduct * normalizedCollisionX;
        const cueBallDeflectionY = dy - 2 * dotProduct * normalizedCollisionY;
  
        const deflectedX = collisionPoint.x + cueBallDeflectionX * guidelineLength;
        const deflectedY = collisionPoint.y + cueBallDeflectionY * guidelineLength;
  
        ctx.beginPath();
        ctx.moveTo(collisionPoint.x, collisionPoint.y);
        ctx.lineTo(deflectedX, deflectedY);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // Semi-transparent green
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.closePath();
  
        // Third Line: Path of the target ball (starts from its center)
        const targetBallX = hitBall.x + normalizedCollisionX * guidelineLength;
        const targetBallY = hitBall.y + normalizedCollisionY * guidelineLength;
  
        ctx.beginPath();
        ctx.moveTo(hitBall.x, hitBall.y); // Start from the hit ball's center
        ctx.lineTo(targetBallX, targetBallY);
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // Semi-transparent blue
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.closePath();
      }
    }
  }
  
  function drawTableBorder() {
    const borderWidth = 30; // Border thickness
    const cornerRadius = 30; // Border corner radius
  
    ctx.fillStyle = '#8B4513'; // Brown border color
    ctx.fillRect(0, 0, tableWidth, tableHeight);
  
    // Draw the green playing surface
    ctx.fillStyle = '#228B22'; // Green felt color
    ctx.fillRect(borderWidth, borderWidth, tableWidth - 2 * borderWidth, tableHeight - 2 * borderWidth);
  }
  
  
 function getFirstCollision(cueBall, angle) {
    let collisionPoint = null;
    let hitBall = null;
    let reflectionAngle = null;
  
    const dx = -Math.cos(angle);
    const dy = -Math.sin(angle);
    let tMin = Infinity;
  
    // Check for collisions with table edges
    // Left edge
    if (dx < 0) {
      const t = (ballRadius - cueBall.x) / dx;
      if (t > 0 && t < tMin) {
        tMin = t;
        collisionPoint = { x: cueBall.x + dx * t, y: cueBall.y + dy * t };
        reflectionAngle = Math.atan2(dy, -dx); // Reflect horizontally
      }
    }
  
    // Right edge
    if (dx > 0) {
      const t = (tableWidth - ballRadius - cueBall.x) / dx;
      if (t > 0 && t < tMin) {
        tMin = t;
        collisionPoint = { x: cueBall.x + dx * t, y: cueBall.y + dy * t };
        reflectionAngle = Math.atan2(dy, -dx); // Reflect horizontally
      }
    }
  
    // Top edge
    if (dy < 0) {
      const t = (ballRadius - cueBall.y) / dy;
      if (t > 0 && t < tMin) {
        tMin = t;
        collisionPoint = { x: cueBall.x + dx * t, y: cueBall.y + dy * t };
        reflectionAngle = Math.atan2(-dy, dx); // Reflect vertically
      }
    }
  
    // Bottom edge
    if (dy > 0) {
      const t = (tableHeight - ballRadius - cueBall.y) / dy;
      if (t > 0 && t < tMin) {
        tMin = t;
        collisionPoint = { x: cueBall.x + dx * t, y: cueBall.y + dy * t };
        reflectionAngle = Math.atan2(-dy, dx); // Reflect vertically
      }
    }
  
    // Check for collisions with balls
    const allBalls = [...balls, blackBall]; // Include black ball in collision checks
    allBalls.forEach((ball) => {
      if (ball === cueBall || ball.pocketed) return;
  
      const a = dx * dx + dy * dy;
      const b = 2 * (dx * (cueBall.x - ball.x) + dy * (cueBall.y - ball.y));
      const c =
        (cueBall.x - ball.x) * (cueBall.x - ball.x) +
        (cueBall.y - ball.y) * (cueBall.y - ball.y) -
        4 * ballRadius * ballRadius;
      const discriminant = b * b - 4 * a * c;
  
      if (discriminant >= 0) {
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t1 > 0 && t1 < tMin) {
          tMin = t1;
          collisionPoint = { x: cueBall.x + dx * t1, y: cueBall.y + dy * t1 };
          reflectionAngle = Math.atan2(ball.y - collisionPoint.y, ball.x - collisionPoint.x);
          hitBall = ball;
        }
      }
    });
  
    if (collisionPoint) {
      return { collisionPoint, hitBall, reflectionAngle };
    }
    return null;
  }
  
  function updateBall(ball, deltaTime) {
    if (ball.pocketed) return;
  
    ball.x += ball.vx * deltaTime;
    ball.y += ball.vy * deltaTime;
  
    // Apply friction
    ball.vx *= Math.pow(friction, deltaTime);
    ball.vy *= Math.pow(friction, deltaTime);
  
    // Stop the ball when velocity is low
    if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.05) ball.vy = 0;
  
    // Update rotation based on velocity
    const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
    ball.angularVelocity = speed / ballRadius; // Angular velocity proportional to linear speed
    ball.rotation += ball.angularVelocity * deltaTime; // Update rotation angle
    ball.rotation %= Math.PI * 2; // Keep angle within 0 to 2π
  
    // Check for collisions with walls
    if (ball.x - ballRadius < 0 || ball.x + ballRadius > tableWidth) {
      ball.vx *= -1;
      ball.x = Math.max(ballRadius, Math.min(ball.x, tableWidth - ballRadius));
    }
    if (ball.y - ballRadius < 0 || ball.y + ballRadius > tableHeight) {
      ball.vy *= -1;
      ball.y = Math.max(ballRadius, Math.min(ball.y, tableHeight - ballRadius));
    }
  
    // Check for pocketing
    pockets.forEach((pocket) => {
      const dx = pocket.x - ball.x;
      const dy = pocket.y - ball.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < pocketRadius) {
        ball.pocketed = true;
        ball.vx = 0;
        ball.vy = 0;
        ball.angularVelocity = 0;
  
        if (ball === cueBall) {
          showGameOver('Game Over! The cue ball was pocketed.');
          gameOver = true;
        } else if (ball === blackBall) {
          const remainingBalls = balls.filter((b) => !b.pocketed).length;
          if (remainingBalls > 0) {
            showGameOver('Game Over! The black ball was pocketed too early.');
            gameOver = true;
          } else {
            showGameOver('You Win! The black ball was pocketed last.');
            gameOver = true;
          }
        }
      }
    });
  }
  

function checkCollision(ball1, ball2) {
  if (ball1.pocketed || ball2.pocketed) return;

  const dx = ball2.x - ball1.x;
  const dy = ball2.y - ball1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < ballRadius * 2) {
    const overlap = ballRadius * 2 - distance;
    const separationAngle = Math.atan2(dy, dx);
    const separationX = Math.cos(separationAngle) * overlap / 2;
    const separationY = Math.sin(separationAngle) * overlap / 2;

    ball1.x -= separationX;
    ball1.y -= separationY;
    ball2.x += separationX;
    ball2.y += separationY;

    const collisionAngle = Math.atan2(dy, dx);

    const speed1 = Math.sqrt(ball1.vx ** 2 + ball1.vy ** 2);
    const speed2 = Math.sqrt(ball2.vx ** 2 + ball2.vy ** 2);
    const direction1 = Math.atan2(ball1.vy, ball1.vx);
    const direction2 = Math.atan2(ball2.vy, ball2.vx);

    const velocity1 = speed1 * Math.cos(direction1 - collisionAngle);
    const velocity2 = speed2 * Math.cos(direction2 - collisionAngle);

    const orthogonalVelocity1 = speed1 * Math.sin(direction1 - collisionAngle);
    const orthogonalVelocity2 = speed2 * Math.sin(direction2 - collisionAngle);

    const finalVelocity1 = velocity2;
    const finalVelocity2 = velocity1;

    ball1.vx = Math.cos(collisionAngle) * finalVelocity1 + Math.cos(collisionAngle + Math.PI / 2) * orthogonalVelocity1;
    ball1.vy = Math.sin(collisionAngle) * finalVelocity1 + Math.sin(collisionAngle + Math.PI / 2) * orthogonalVelocity1;

    ball2.vx = Math.cos(collisionAngle) * finalVelocity2 + Math.cos(collisionAngle + Math.PI / 2) * orthogonalVelocity2;
    ball2.vy = Math.sin(collisionAngle) * finalVelocity2 + Math.sin(collisionAngle + Math.PI / 2) * orthogonalVelocity2;
  }
}

function draw() {
  if (gameOver) return;

  ctx.clearRect(0, 0, tableWidth, tableHeight);

  // Draw the table border and playing surface
  drawTableBorder();

  // Draw the pockets
  drawPockets();

  // Draw the balls
  drawBall(cueBall);
  drawBall(blackBall);
  balls.forEach(drawBall);

  // Draw the guideline (if applicable)
  drawGuideline();

  // Draw the cue stick last so it's on top
  drawCueStick();
}


function update(deltaTime) {
  if (gameOver) return;

  if (cueStick.returning) {
    cueStick.returnSpeed -= 10; // Decrease the offset during the return animation
    if (cueStick.returnSpeed <= 0) {
      cueStick.returning = false; // Stop the stick animation
      cueStick.returnSpeed = 0;
    }
  }

  for (let i = 0; i < subSteps; i++) {
    const stepTime = deltaTime / subSteps;

    updateBall(cueBall, stepTime);
    updateBall(blackBall, stepTime);
    balls.forEach((ball) => updateBall(ball, stepTime));

    balls.forEach((ball) => {
      checkCollision(cueBall, ball);
      checkCollision(blackBall, ball);
    });
    checkCollision(cueBall, blackBall);

    balls.forEach((ball1, i) => {
      balls.slice(i + 1).forEach((ball2) => checkCollision(ball1, ball2));
    });
  }

  draw();
  requestAnimationFrame(() => update(deltaTime));
}

function showGameOver(message) {
  ctx.clearRect(0, 0, tableWidth, tableHeight);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, tableWidth, tableHeight);

  ctx.fillStyle = '#fff';
  ctx.font = '36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(message, tableWidth / 2, tableHeight / 2 - 20);

  const restartButton = document.createElement('button');
  restartButton.textContent = 'Restart';
  restartButton.style.position = 'absolute';
  restartButton.style.left = `${canvas.offsetLeft + tableWidth / 2 - 50}px`;
  restartButton.style.top = `${canvas.offsetTop + tableHeight / 2 + 20}px`;
  restartButton.style.padding = '10px 20px';
  restartButton.style.fontSize = '16px';
  restartButton.style.cursor = 'pointer';
  document.body.appendChild(restartButton);

  restartButton.addEventListener('click', () => {
    window.location.reload();
  });
}

// Event Listeners
// Add event listeners for both mouse and touch events
canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('mousemove', drag);
canvas.addEventListener('mouseup', releaseDrag);

canvas.addEventListener('touchstart', startDrag, { passive: false });
canvas.addEventListener('touchmove', drag, { passive: false });
canvas.addEventListener('touchend', releaseDrag, { passive: false });

// Start Drag
function startDrag(e) {
  e.preventDefault(); // Prevent scrolling or page dragging
  if (gameOver) return;

  cueStick.dragging = true;

  const { x, y } = getMouseOrTouchPos(e);
  cueStick.angle = Math.atan2(y - cueBall.y, x - cueBall.x);
}

// Dragging
function drag(e) {
  e.preventDefault(); // Prevent scrolling or page dragging
  if (!cueStick.dragging || gameOver) return;

  const { x, y } = getMouseOrTouchPos(e);
  cueStick.power = Math.min(cueStick.maxPower, Math.sqrt((x - cueBall.x) ** 2 + (y - cueBall.y) ** 2));
  cueStick.angle = Math.atan2(y - cueBall.y, x - cueBall.x);
}

// Release Drag
function releaseDrag(e) {
  e.preventDefault(); // Prevent scrolling or page dragging
  if (cueStick.dragging && !gameOver) {
    cueBall.vx = -Math.cos(cueStick.angle) * cueStick.power * 0.15; // Opposite to stick's direction
    cueBall.vy = -Math.sin(cueStick.angle) * cueStick.power * 0.15; // Opposite to stick's direction
    cueStick.dragging = false;

    // Start stick return animation
    cueStick.returning = true;
    cueStick.returnSpeed = cueStick.power; // Initial return offset
    cueStick.power = 0;
  }
}
function getMouseOrTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches.length > 0) {
    // For touch input
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  } else {
    // For mouse input
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }
}
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });


// Initialize balls
// Initialize balls
for (let i = 0; i < 7; i++) {
  balls.push({
    x: tableWidth / 2 + Math.random() * 100 - 50,
    y: tableHeight / 2 + Math.random() * 100 - 50,
    vx: 0,
    vy: 0,
    color: colors[i % colors.length],
    number: i + 1, // Assign unique numbers (1–7)
    pocketed: false,
    rotation: 0, // Initial rotation angle
    angularVelocity: 0, // Initial angular velocity
  });
}
function adjustCanvasSize() {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const canvasAspectRatio = 1 / 2; // Aspect ratio for the pool table (400:800)
  const screenAspectRatio = screenWidth / screenHeight;

  let newCanvasWidth, newCanvasHeight;

  if (screenAspectRatio > canvasAspectRatio) {
    // Screen is wider than the canvas aspect ratio
    newCanvasHeight = screenHeight * 0.85; // Use 90% of the screen height
    newCanvasWidth = newCanvasHeight * canvasAspectRatio;
  } else {
    // Screen is narrower or matches the canvas aspect ratio
    newCanvasWidth = screenWidth * 0.85; // Use 90% of the screen width
    newCanvasHeight = newCanvasWidth / canvasAspectRatio;
  }

  canvas.width = newCanvasWidth;
  canvas.height = newCanvasHeight;

  // Rescale the drawing context to match the new canvas size
  ctx.setTransform(newCanvasWidth / 400, 0, 0, newCanvasHeight / 800, 0, 0); // Scale to original canvas size
}

// Call adjustCanvasSize on load and resize
window.addEventListener('resize', adjustCanvasSize);
adjustCanvasSize();

cueBall.rotation = 0;
cueBall.angularVelocity = 0;

blackBall.rotation = 0;
blackBall.angularVelocity = 0;



update(1);
