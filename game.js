const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// TEMP background test
function draw() {
  ctx.fillStyle = "#02040b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "24px Handjet";
  ctx.fillText("Canvas OK", canvas.width / 2, canvas.height / 2);

  requestAnimationFrame(draw);
}

draw();
