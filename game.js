const canvas = document.getElementById('poolTable');
const ctx = canvas.getContext('2d');

const tableWidth = canvas.width;
const tableHeight = canvas.height;

// Ball properties
const ballRadius = 10;
const balls = [];
const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#f60'];

// Pockets
const pocketRadius = ballRadius * 2.5;
const pockets = [
  { x: 0, y: 0 },
  { x: tableWidth / 2, y: 0 },
  { x: tableWidth, y: 0 },
  { x: 0, y: tableHeight },
  { x: tableWidth / 2, y: tableHeight },
  { x: tableWidth, y: tableHeight },
];

// Cue ball
const cueBall = { x: tableWidth / 3, y: tableHeight / 2, vx: 0, vy: 0, color: '#fff', pocketed: false };

// Black ball (must be pocketed last)
const blackBall = { x: tableWidth / 1.5, y: tableHeight / 2, vx: 0, vy: 0, color: '#000', pocketed: false };

// Cue stick
let cueStick = { 
  angle: 0, 
  dragging: false, 
  power: 0, 
  maxPower: 100, 
  stickLength: 100, 
  returning: false, 
  returnSpeed: 0 
};

// Physics
const friction = 0.98;
const subSteps = 4;

// Game state
let gameOver = false;

// Utility Functions
function drawBall(ball) {
  if (ball.pocketed) return;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

function drawPockets() {
  pockets.forEach((pocket) => {
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, pocketRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
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

    ctx.beginPath();
    ctx.moveTo(stickStartX, stickStartY);
    ctx.lineTo(stickEndX, stickEndY);
    ctx.strokeStyle = '#8B4513'; // Brown stick color
    ctx.lineWidth = 4;
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

    // Second Line: Cue ball's path after bouncing
    let adjustedReflectionAngle = reflectionAngle;

    // Adjust the reflection angle by 90 degrees if it's a ball collision
    if (hitBall) {
      adjustedReflectionAngle += Math.PI / 2;
    }

    const reflectedX = collisionPoint.x + Math.cos(adjustedReflectionAngle) * guidelineLength;
    const reflectedY = collisionPoint.y + Math.sin(adjustedReflectionAngle) * guidelineLength;

    ctx.beginPath();
    ctx.moveTo(collisionPoint.x, collisionPoint.y);
    ctx.lineTo(reflectedX, reflectedY);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // Semi-transparent green
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]); // Dashed line
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.closePath();

    // Third Line: Path of the target ball (if hit)
    if (hitBall) {
      const targetDx = hitBall.x - collisionPoint.x;
      const targetDy = hitBall.y - collisionPoint.y;
      const magnitude = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
      const normalizedDx = targetDx / magnitude;
      const normalizedDy = targetDy / magnitude;

      const targetBallX = collisionPoint.x + normalizedDx * guidelineLength;
      const targetBallY = collisionPoint.y + normalizedDy * guidelineLength;

      ctx.beginPath();
      ctx.moveTo(collisionPoint.x, collisionPoint.y);
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
    balls.forEach((ball) => {
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

  drawPockets();
  drawBall(cueBall);
  drawBall(blackBall);
  balls.forEach(drawBall);

  drawCueStick();
  drawGuideline();
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
canvas.addEventListener('mousedown', (e) => {
  if (gameOver) return;
  cueStick.dragging = true;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  cueStick.angle = Math.atan2(mouseY - cueBall.y, mouseX - cueBall.x);
});

canvas.addEventListener('mousemove', (e) => {
  if (!cueStick.dragging || gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  cueStick.power = Math.min(cueStick.maxPower, Math.sqrt((mouseX - cueBall.x) ** 2 + (mouseY - cueBall.y) ** 2));
  cueStick.angle = Math.atan2(mouseY - cueBall.y, mouseX - cueBall.x);
});

canvas.addEventListener('mouseup', () => {
  if (cueStick.dragging && !gameOver) {
    cueBall.vx = -Math.cos(cueStick.angle) * cueStick.power * 0.1; // Opposite to stick's direction
    cueBall.vy = -Math.sin(cueStick.angle) * cueStick.power * 0.1; // Opposite to stick's direction
    cueStick.dragging = false;

    // Start stick return animation
    cueStick.returning = true;
    cueStick.returnSpeed = cueStick.power; // Initial return offset
    cueStick.power = 0;
  }
});

// Initialize balls
for (let i = 0; i < 7; i++) {
  balls.push({
    x: tableWidth / 2 + Math.random() * 100 - 50,
    y: tableHeight / 2 + Math.random() * 100 - 50,
    vx: 0,
    vy: 0,
    color: colors[i % colors.length],
    pocketed: false,
  });
}

update(1);
